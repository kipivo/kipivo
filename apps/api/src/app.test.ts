import { HTTPException } from "hono/http-exception";
import { expect, it } from "vitest";
import { createApp } from "./app";

it("preserves an HTTP exception's response and fills in missing security headers", async () => {
  const app = createApp({
    handleAuth: async () => {
      throw new HTTPException(403, {
        res: new Response("Forbidden", {
          status: 403,
          headers: { "Referrer-Policy": "same-origin" },
        }),
      });
    },
  });

  const response = await app.request("/api/auth/get-session", {
    headers: { "X-Request-Id": "auth-exception" },
  });

  expect(response.status).toBe(403);
  expect(await response.text()).toBe("Forbidden");
  expect(response.headers.get("X-Request-Id")).toBe("auth-exception");
  expect(response.headers.get("Referrer-Policy")).toBe("same-origin");
  expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
});
