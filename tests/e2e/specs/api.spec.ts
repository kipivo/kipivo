import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { createApiClient } from "@kipivo/api/client";
import { healthy, launchBuiltApi } from "../fixtures/process";

const origin = process.env.E2E_API_ORIGIN || "http://127.0.0.1:4381";
let server: ReturnType<typeof launchBuiltApi> | undefined;

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function requestEvents(output: string, requestId: string) {
  return output.split("\n").filter((line) => {
    try {
      return JSON.parse(line)?.requestId === requestId;
    } catch {
      return false;
    }
  });
}

test.beforeAll(async () => {
  if (process.env.E2E_API_ORIGIN) return;
  server = launchBuiltApi(4381);
  await server.waitFor(() => healthy(origin));
});

test("unconfigured auth reports unavailable while health stays live", async ({ request }) => {
  test.skip(Boolean(process.env.E2E_API_ORIGIN), "Requires the suite-managed unconfigured API.");
  expect((await request.get(`${origin}/healthz`)).status()).toBe(200);
  expect((await request.get(`${origin}/readyz`)).status()).toBe(503);
  expect((await request.get(`${origin}/api/auth/get-session`)).status()).toBe(503);
  const account = await request.get(`${origin}/api/v1/account/me`);
  expect(account.status()).toBe(503);
  expect(await account.json()).toMatchObject({ code: "SERVICE_UNAVAILABLE" });
});

test.afterAll(async () => {
  await server?.stop();
});

test("the API serves health and ping over HTTP", async ({ request }) => {
  const health = await request.get(`${origin}/healthz`);
  expect(health.status()).toBe(200);
  expect(await health.text()).toBe("ok");
  expect(await createApiClient(origin).system.ping()).toEqual({ ok: true });
  const rest = await request.get(`${origin}/api/v1/system/ping`);
  expect(rest.status()).toBe(200);
  expect(await rest.json()).toEqual({ ok: true });
  expect((await request.get(`${origin}/unknown`)).status()).toBe(404);
  expect((await request.post(`${origin}/rpc/unknown`, { data: {} })).status()).toBe(404);
  expect((await request.get(`${origin}/api/v1/unknown`)).status()).toBe(404);
});

test("OpenAPI describes the cookie and Origin requirements without a session", async ({
  request,
}) => {
  const response = await request.get(`${origin}/api/openapi.json`);
  expect(response.status()).toBe(200);
  const { paths } = await response.json();
  const cookie = [{ sessionCookie: [] }, { secureSessionCookie: [] }];
  const originHeader = expect.objectContaining({ in: "header", name: "Origin", required: true });
  expect(paths["/system/ping"].get.security ?? []).toEqual([]);
  for (const path of ["/account/me", "/admin/accounts"]) {
    expect(paths[path].get.security).toEqual(cookie);
    expect(paths[path].get.parameters ?? []).not.toContainEqual(originHeader);
  }
  expect(paths["/auth/native/authorize"].post.security).toEqual(cookie);
  expect(paths["/auth/native/authorize"].post.parameters).toContainEqual(originHeader);
  expect(paths["/auth/sign-in/email"].post.parameters).toContainEqual(originHeader);
  expect(paths["/auth/native/exchange"].post.parameters ?? []).not.toContainEqual(originHeader);
  expect(paths["/setup/status"].get.security ?? []).toEqual([]);
  expect(paths["/setup/install"].post.security ?? []).toEqual([]);
  expect(paths["/setup/install"].post.parameters).toContainEqual(originHeader);
  for (const operation of [paths["/admin/accounts/{id}/role"].put]) {
    expect(operation.security).toEqual(cookie);
    expect(operation.parameters).toContainEqual(originHeader);
  }
});

test("the API returns request IDs and security headers on successful and missing routes", async ({
  request,
}) => {
  const requestId = `health-${randomUUID()}`;
  const health = await request.get(`${origin}/healthz`, {
    headers: { "X-Request-Id": requestId },
  });
  expect(health.status()).toBe(200);
  expect(health.headers()["x-request-id"]).toBe(requestId);
  expect(health.headers()["x-content-type-options"]).toBe("nosniff");

  const generated = await request.get(`${origin}/healthz`);
  expect(generated.headers()["x-request-id"]).toMatch(uuid);
  const missing = await request.get(`${origin}/unknown`, {
    headers: { "X-Request-Id": "invalid request id" },
  });
  expect(missing.status()).toBe(404);
  expect(missing.headers()["x-request-id"]).toMatch(uuid);
  expect(missing.headers()["x-content-type-options"]).toBe("nosniff");
});

test("the built API emits one request event for an oRPC call", async ({ request }) => {
  test.skip(
    Boolean(process.env.E2E_API_ORIGIN),
    "Requires capturing the suite-managed API output.",
  );
  const requestId = `ping-${randomUUID()}`;
  const query = `private-query-${randomUUID()}`;
  const cookie = `private-cookie-${randomUUID()}`;
  const response = await request.post(`${origin}/rpc/system/ping?secret=${query}`, {
    headers: { "X-Request-Id": requestId, Cookie: `session=${cookie}` },
    data: {},
  });
  expect(response.status()).toBe(200);
  expect(response.headers()["x-request-id"]).toBe(requestId);
  expect(await response.json()).toEqual({ json: { ok: true } });

  await expect.poll(() => requestEvents(server?.output ?? "", requestId)).toHaveLength(1);
  const [event] = requestEvents(server?.output ?? "", requestId);
  const logged = JSON.parse(event);
  expect(logged).toMatchObject({
    requestId,
    operation: "system.ping",
    method: "POST",
    path: "/rpc/system/ping",
    status: 200,
    durationMs: expect.any(Number),
  });
  expect(logged.durationMs).toBeGreaterThanOrEqual(0);
  expect(server?.output).not.toContain(query);
  expect(server?.output).not.toContain(cookie);
});
