import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { createApiClient } from "@kipivo/api/client";
import { healthy, launch, repoRoot } from "../fixtures/process";

const origin = process.env.E2E_API_ORIGIN || "http://127.0.0.1:4381";
let server: ReturnType<typeof launch> | undefined;

test.beforeAll(async () => {
  if (process.env.E2E_API_ORIGIN) return;
  server = launch([".output/server/index.mjs"], join(repoRoot, "apps/api"), {
    PORT: "4381",
    HOST: "127.0.0.1",
    DATABASE_URL: "",
    BETTER_AUTH_URL: "",
    BETTER_AUTH_SECRET: "",
  });
  await server.waitFor(() => healthy(origin));
});

test("unconfigured auth reports unavailable while health stays live", async ({ request }) => {
  test.skip(Boolean(process.env.E2E_API_ORIGIN), "Requires the suite-managed unconfigured API.");
  expect((await request.get(`${origin}/healthz`)).status()).toBe(200);
  expect((await request.get(`${origin}/readyz`)).status()).toBe(503);
  expect((await request.get(`${origin}/api/auth/get-session`)).status()).toBe(503);
});

test.afterAll(async () => {
  await server?.stop();
});

test("the API serves health and ping over HTTP", async ({ request }) => {
  const health = await request.get(`${origin}/healthz`);
  expect(health.status()).toBe(200);
  expect(await health.text()).toBe("ok");
  expect(await createApiClient(origin).system.ping()).toEqual({ ok: true });
  expect((await request.get(`${origin}/unknown`)).status()).toBe(404);
  expect((await request.post(`${origin}/rpc/unknown`, { data: {} })).status()).toBe(404);
});
