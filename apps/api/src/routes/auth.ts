import { Hono } from "hono";
import { requestServices, type AppEnv } from "../context";

export function createAuthRoutes() {
  const routes = new Hono<AppEnv>();
  routes.on(["GET", "POST"], "/*", async (context) => {
    const { handleAuth } = requestServices(context);
    if (!handleAuth) return context.json({ error: "Authentication unavailable." }, 503);
    const response = await handleAuth(context.req.raw);
    return new Response(response.body, response);
  });
  return routes;
}
