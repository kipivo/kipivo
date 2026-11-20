import { createMiddleware } from "hono/factory";
import type { LoggerEnv } from "@kipivo/logger/hono";

const securityHeaderDefaults = [
  ["Referrer-Policy", "no-referrer"],
  ["X-Content-Type-Options", "nosniff"],
  ["X-DNS-Prefetch-Control", "off"],
  ["X-Download-Options", "noopen"],
  ["X-Permitted-Cross-Domain-Policies", "none"],
  ["X-XSS-Protection", "0"],
] as const;

export const setSecurityHeaders = createMiddleware<LoggerEnv>(async (context, next) => {
  await next();
  const { headers } = context.res;
  for (const [name, value] of securityHeaderDefaults) {
    if (!headers.has(name)) headers.set(name, value);
  }
});

export const setResponseRequestId = createMiddleware<LoggerEnv>(async (context, next) => {
  await next();
  if (context.res.headers.get("X-Request-Id") !== context.var.requestId) {
    context.header("X-Request-Id", context.var.requestId);
  }
});
