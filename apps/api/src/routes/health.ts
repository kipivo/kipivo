import { requestServices, type AppEnv } from "../context";
import { Hono } from "hono";

export function createHealthRoutes() {
  const routes = new Hono<AppEnv>();
  routes.get("/healthz", (context) => context.text("ok"));
  routes.get("/readyz", async (context) => {
    let ready;
    try {
      ready = await requestServices(context).ready?.();
    } catch {
      ready = false;
    }
    return ready ? context.text("ok") : context.text("not ready", 503);
  });
  return routes;
}
