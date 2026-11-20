import type { LoggerEnv } from "@kipivo/logger/hono";
import { Hono } from "hono";
import { clientAddress } from "../http/client-address";
import type { Authentication } from "../runtime/services";

export function createAuthRoutes(auth?: Authentication, trustProxy = false) {
  const routes = new Hono<LoggerEnv>();
  routes.on(["GET", "POST"], "/*", async (context) => {
    context.header("Cache-Control", "no-store");
    if (!auth) return context.json({ error: "Authentication unavailable." }, 503);

    const request = context.req.raw;
    const origin = request.headers.get("origin");
    // An OAuth provider can send a form POST directly to its callback.
    if (
      request.method === "POST" &&
      !context.req.path.startsWith("/api/auth/callback/") &&
      origin !== null &&
      !auth.trustedOrigins.includes(origin)
    ) {
      return context.json({ code: "INVALID_ORIGIN", message: "Invalid origin." }, 403);
    }
    const headers = new Headers(request.headers);
    const address = clientAddress(request, trustProxy);
    headers.delete("x-real-ip");
    headers.delete("x-forwarded-for");
    if (address) headers.set("x-forwarded-for", address);

    const response = await auth.handle(new Request(request, { headers }));
    const forwarded = new Response(response.body, response);
    forwarded.headers.set("Cache-Control", "no-store");
    return forwarded;
  });
  return routes;
}
