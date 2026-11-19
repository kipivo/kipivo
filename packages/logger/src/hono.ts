import type { AuditableLogger } from "evlog";
import { createMiddlewareLogger, shouldDeferEmitForResponse } from "evlog/toolkit";
import { createMiddleware } from "hono/factory";
import type { RequestIdVariables } from "hono/request-id";

export type LoggerEnv = {
  Variables: RequestIdVariables & { log: AuditableLogger };
};

export function honoLogger() {
  return createMiddleware<LoggerEnv>(async (c, next) => {
    const { logger, finish, finishResponse, skipped } = createMiddlewareLogger({
      method: c.req.method,
      path: c.req.path,
      requestId: c.get("requestId"),
    });
    c.set("log", logger);

    try {
      await next();
    } catch (error) {
      logger.setLevel("error");
      await finish({ status: 500 });
      throw error;
    }

    if (skipped) return;

    const response = c.res;
    const { status } = response;
    if (status >= 500) logger.setLevel("error");
    else if (status >= 400) logger.setLevel("warn");

    if (shouldDeferEmitForResponse(response)) {
      c.res = await finishResponse(response);
    } else {
      await finish({ status });
    }
  });
}
