import { Hono } from "hono";
import { createRpcMiddleware } from "./routes/rpc";

interface AppServices {
  auth: { handler(request: Request): Promise<Response> };
  ready(): Promise<boolean>;
}

export function createApp(services?: AppServices) {
  const app = new Hono();
  app.get("/healthz", (context) => context.text("ok"));
  app.get("/readyz", async (context) => {
    const ready = await services?.ready().catch(() => false);
    return ready ? context.text("ok") : context.text("not ready", 503);
  });
  app.on(["GET", "POST"], "/api/auth/*", async (context) => {
    if (!services) return context.json({ error: "Authentication unavailable." }, 503);
    return services.auth.handler(context.req.raw);
  });
  app.use("/rpc/*", createRpcMiddleware());
  return app;
}
