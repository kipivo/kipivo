import { expect, test } from "bun:test";
import { checkConnection } from "./connection.ts";

const origin = "https://kipivo.example";
const offline = async () => {
  throw new TypeError("Network request failed");
};

test("checks the actual public REST ping without credentials or redirects", async () => {
  const result = await checkConnection(origin, async (url, init) => {
    expect(url).toBe(`${origin}/api/v1/system/ping`);
    expect(init).toMatchObject({
      method: "GET",
      credentials: "omit",
      redirect: "manual",
      headers: { Accept: "application/json", "Cache-Control": "no-cache" },
      signal: expect.any(AbortSignal),
    });
    return Response.json({ ok: true });
  });
  expect(result).toEqual({ status: "reachable" });
});

test.each([null, false, {}, { ok: false }, { ok: "true" }, { json: { ok: true } }])(
  "rejects unexpected ping payload %j",
  async (payload) => {
    const result = await checkConnection(origin, async () => Response.json(payload));
    expect(result).toEqual({ status: "unexpected-response" });
  },
);

test("rejects HTML and malformed JSON at HTTP 200", async () => {
  for (const response of [
    new Response("<html></html>"),
    new Response("{", {
      headers: { "Content-Type": "application/json" },
    }),
  ]) {
    const result = await checkConnection(origin, async () => response);
    expect(result).toEqual({ status: "unexpected-response" });
  }
});

test.each([204, 302, 404, 503])("reports an unexpected HTTP status (%d)", async (code) => {
  const result = await checkConnection(origin, async () => new Response(null, { status: code }));
  expect(result).toEqual({ status: "http-error", code });
});

test("reports network failures and allows retry", async () => {
  const result = await checkConnection(origin, offline);
  expect(result).toEqual({ status: "unreachable" });
  expect(await checkConnection(origin, async () => Response.json({ ok: true }))).toEqual({
    status: "reachable",
  });
});

test("times out and aborts a request that never responds", async () => {
  let signal;
  const result = await checkConnection(
    origin,
    (_, init) => {
      signal = init.signal;
      return new Promise(() => {});
    },
    { timeoutMs: 10 },
  );
  expect(result).toEqual({ status: "timeout" });
  expect(signal.aborted).toBe(true);
});

test("the timeout also covers a stalled response body", async () => {
  let signal;
  const result = await checkConnection(
    origin,
    async (_, init) => {
      signal = init.signal;
      return {
        status: 200,
        headers: new Headers({ "Content-Type": "application/json" }),
        json: () => new Promise(() => {}),
      };
    },
    { timeoutMs: 10 },
  );
  expect(result).toEqual({ status: "timeout" });
  expect(signal.aborted).toBe(true);
});

test("cancels an in-flight check when the caller leaves", async () => {
  const controller = new AbortController();
  let requestSignal;
  const result = checkConnection(
    origin,
    (_, init) => {
      requestSignal = init.signal;
      return new Promise(() => {});
    },
    { signal: controller.signal },
  );
  controller.abort();
  expect(await result).toEqual({ status: "cancelled" });
  expect(requestSignal.aborted).toBe(true);
});

test("does not send a request if already cancelled", async () => {
  const controller = new AbortController();
  controller.abort();
  const request = () => {
    throw new Error("The request must not run");
  };
  expect(await checkConnection(origin, request, { signal: controller.signal })).toEqual({
    status: "cancelled",
  });
});
