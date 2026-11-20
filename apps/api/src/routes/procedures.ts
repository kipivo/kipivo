import { sessionCookiePrefix } from "@kipivo/auth/env";
import type { RequestIdentity } from "@kipivo/auth/session";
import type { LoggerEnv } from "@kipivo/logger/hono";
import { createProcedureHandlers } from "@kipivo/orpc";
import { Hono } from "hono";
import { createSessionLimit } from "../http/session-limit";
import type { AppServices } from "../runtime/services";

export function createProcedureRoutes({ authentication, procedures, trustProxy }: AppServices) {
  const { handlers, openApi } = createProcedureHandlers(
    authentication?.cookiePrefix ?? sessionCookiePrefix(),
    procedures,
  );
  const limitSessionRead = createSessionLimit(trustProxy);
  const routes = new Hono<LoggerEnv>();

  function requestIdentity(request: Request, outgoing: Headers): RequestIdentity | undefined {
    if (!authentication) return;
    const identity = authentication.identify(request.headers, outgoing);
    let session: ReturnType<RequestIdentity["readSession"]> | undefined;
    return {
      getActorId: identity.getActorId,
      readSession: () =>
        (session ??= limitSessionRead(request, outgoing).then(() => identity.readSession())),
    };
  }

  for (const [prefix, handler] of handlers) {
    routes.all(`${prefix}/*`, async (context) => {
      const request = context.req.raw;
      const outgoing = new Headers();
      const result = await handler.handle(request, {
        prefix,
        context: {
          identity: requestIdentity(request, outgoing),
          trustedOrigin:
            authentication?.trustedOrigins.includes(request.headers.get("origin") ?? "") ?? false,
          requestId: context.var.requestId,
          log: context.var.log,
        },
      });
      context.header("Cache-Control", "no-store");
      if (!result.matched) return context.notFound();
      for (const cookie of outgoing.getSetCookie())
        result.response.headers.append("set-cookie", cookie);
      const retry = outgoing.get("retry-after");
      if (retry) result.response.headers.set("retry-after", retry);
      return context.newResponse(result.response.body, result.response);
    });
  }

  routes.get("/api/openapi.json", async (context) => context.json(await openApi()));
  return routes;
}
