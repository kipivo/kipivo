import { expect, it, vi } from "vitest";
import { createApp } from "../app";
import { createSessionLimit } from "./session-limit";

it("returns the typed RPC error and Retry-After before another identity read", async () => {
  const readSession = vi.fn(async () => null);
  const app = createApp({
    trustProxy: true,
    authentication: {
      handle: async () => new Response(),
      identify: () => ({ readSession, getActorId: async () => undefined }),
      trustedOrigins: [],
      cookiePrefix: "kipivo",
    },
  });
  const read = (address: string) =>
    app.request("/rpc/auth/session/get", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Real-IP": address },
      body: "{}",
    });

  for (let index = 0; index < 100; index++) {
    expect((await read("192.0.2.1")).status).toBe(200);
  }
  const limited = await read("192.0.2.1");
  expect(limited.status).toBe(429);
  expect(Number(limited.headers.get("Retry-After"))).toBeGreaterThan(0);
  expect(await limited.json()).toMatchObject({ json: { code: "TOO_MANY_REQUESTS" } });
  expect(readSession).toHaveBeenCalledTimes(100);
  expect((await read("192.0.2.2")).status).toBe(200);
});

it("uses the socket peer when proxy headers are not trusted", async () => {
  const consume = createSessionLimit(false);
  const outgoing = new Headers();
  const request = Object.assign(new Request("http://localhost"), { ip: "192.0.2.1" });
  for (let index = 0; index < 100; index++) await consume(request, outgoing);
  request.headers.set("X-Real-IP", "192.0.2.2");
  request.headers.set("X-Forwarded-For", "192.0.2.4");
  await expect(consume(request, outgoing)).rejects.toMatchObject({ status: 429 });
  request.ip = "192.0.2.3";
  await expect(consume(request, outgoing)).resolves.toBeUndefined();
});

it("prefers X-Real-IP and accepts a single X-Forwarded-For when it is absent", async () => {
  const consume = createSessionLimit(true);
  const outgoing = new Headers();
  const request = new Request("http://localhost", {
    headers: { "X-Real-IP": "192.0.2.1", "X-Forwarded-For": "192.0.2.2" },
  });
  for (let index = 0; index < 100; index++) await consume(request, outgoing);
  request.headers.set("X-Forwarded-For", "192.0.2.3");
  await expect(consume(request, outgoing)).rejects.toMatchObject({ status: 429 });
  request.headers.delete("X-Real-IP");
  request.headers.set("X-Forwarded-For", "192.0.2.1");
  await expect(consume(request, outgoing)).rejects.toMatchObject({ status: 429 });
  request.headers.set("X-Forwarded-For", "192.0.2.2");
  await expect(consume(request, outgoing)).resolves.toBeUndefined();
});

it("uses the peer for a malformed proxy address or a forwarded chain", async () => {
  const consume = createSessionLimit(true);
  const outgoing = new Headers();
  const request = Object.assign(new Request("http://localhost"), { ip: "192.0.2.1" });
  for (let index = 0; index < 100; index++) await consume(request, outgoing);
  request.headers.set("X-Forwarded-For", "192.0.2.2, 192.0.2.3");
  await expect(consume(request, outgoing)).rejects.toMatchObject({ status: 429 });
  request.headers.set("X-Forwarded-For", "192.0.2.2");
  request.headers.set("X-Real-IP", "invalid");
  await expect(consume(request, outgoing)).rejects.toMatchObject({ status: 429 });
});

it.each([
  ["2001:db8:abcd:42::1", "2001:0DB8:ABCD:0042:1234::1", "2001:db8:abcd:43::1"],
  ["192.0.2.1", "::ffff:c000:201", "::ffff:192.0.2.2"],
])("buckets %s and %s together but keeps %s separate", async (address, same, different) => {
  const consume = createSessionLimit(true);
  const outgoing = new Headers();
  const request = new Request("http://localhost", { headers: { "X-Real-IP": address } });
  for (let index = 0; index < 100; index++) await consume(request, outgoing);
  request.headers.set("X-Real-IP", same);
  await expect(consume(request, outgoing)).rejects.toMatchObject({ status: 429 });
  request.headers.set("X-Real-IP", different);
  await expect(consume(request, outgoing)).resolves.toBeUndefined();
});
