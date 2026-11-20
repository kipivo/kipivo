import { honoLogger } from "@kipivo/logger/hono";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { requestId } from "hono/request-id";
import { provideServices, type AppEnv, type AppServices } from "./context";
import { createAuthRoutes } from "./routes/auth";
import { createHealthRoutes } from "./routes/health";
import { createProcedureRoutes } from "./routes/procedures";

const securityHeaderDefaults = [
  ["Referrer-Policy", "no-referrer"],
  ["X-Content-Type-Options", "nosniff"],
  ["X-DNS-Prefetch-Control", "off"],
  ["X-Download-Options", "noopen"],
  ["X-Permitted-Cross-Domain-Policies", "none"],
  ["X-XSS-Protection", "0"],
] as const;

export function createApp(services: AppServices = {}) {
  const app = new Hono<AppEnv>();
  app.use(requestId({ limitLength: 128 }));
  app.use(honoLogger());
  app.use(async (context, next) => {
    await next();
    const { headers } = context.res;
    for (const [name, value] of securityHeaderDefaults) {
      if (!headers.has(name)) headers.set(name, value);
    }
  });
  app.use(provideServices(services));
  app.use(async (context, next) => {
    await next();
    if (context.res.headers.get("X-Request-Id") !== context.var.requestId) {
      context.header("X-Request-Id", context.var.requestId);
    }
  });

  app.onError((context) => {
    const { error } = context;
    if (error instanceof HTTPException) return error.getResponse();
    return context.text("Internal Server Error", 500);
  });

  app.route("/", createHealthRoutes());
  app.route("/api/auth", createAuthRoutes());
  app.route("/", createProcedureRoutes());
  return app;
}
