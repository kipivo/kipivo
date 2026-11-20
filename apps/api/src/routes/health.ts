import { Hono } from "hono";
import type { LoggerEnv } from "@kipivo/logger/hono";

export function createHealthRoutes(checkReadiness?: () => Promise<boolean>) {
  const routes = new Hono<LoggerEnv>();
  routes.get("/healthz", (context) => context.text("ok"));
  routes.get("/readyz", async (context) => {
    let ready;
    try {
      ready = await checkReadiness?.();
    } catch {
      ready = false;
    }
    return ready ? context.text("ok") : context.text("not ready", 503);
  });
  return routes;
}
