import { honoLogger, type LoggerEnv } from "@kipivo/logger/hono";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { requestId } from "hono/request-id";
import { setResponseRequestId, setSecurityHeaders } from "./http/middleware";
import { createAuthRoutes } from "./routes/auth";
import { createHealthRoutes } from "./routes/health";
import { createProcedureRoutes } from "./routes/procedures";
import type { AppServices } from "./runtime/services";

export function createApp(services: AppServices = {}) {
  const app = new Hono<LoggerEnv>();
  app.use(requestId({ limitLength: 128 }));
  app.use(honoLogger());
  app.use(setSecurityHeaders);
  app.use(setResponseRequestId);

  app.onError((context) => {
    const { error } = context;
    if (error instanceof HTTPException) return error.getResponse();
    return context.text("Internal Server Error", 500);
  });

  app.route("/", createHealthRoutes(services.ready));
  app.route("/api/auth", createAuthRoutes(services.authentication, services.trustProxy));
  app.route("/", createProcedureRoutes(services));
  return app;
}
