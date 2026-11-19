import { honoLogger } from "@kipivo/logger/hono";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { requestId } from "hono/request-id";
import { secureHeaders } from "hono/secure-headers";
import { provideServices, type AppEnv, type AppServices } from "./context";
import { createAuthRoutes } from "./routes/auth";
import { createHealthRoutes } from "./routes/health";
import { createProcedureRoutes } from "./routes/procedures";

export function createApp(services: AppServices = {}) {
  const app = new Hono<AppEnv>();
  app.use(requestId({ limitLength: 128 }));
  app.use(honoLogger());
  app.use(
    secureHeaders({
      overwrite: false,
      crossOriginOpenerPolicy: false,
      crossOriginResourcePolicy: false,
      originAgentCluster: false,
      strictTransportSecurity: false,
      xFrameOptions: false,
      removePoweredBy: false,
    }),
  );
  app.use(provideServices(services));
  app.use(async (context, next) => {
    await next();
    if (context.res.headers.get("X-Request-Id") !== context.var.requestId) {
      context.header("X-Request-Id", context.var.requestId);
    }
  });

  app.onError((error, context) => {
    if (error instanceof HTTPException) return error.getResponse();
    return context.text("Internal Server Error", 500);
  });

  app.route("/", createHealthRoutes());
  app.route("/api/auth", createAuthRoutes());
  app.route("/", createProcedureRoutes());
  return app;
}
