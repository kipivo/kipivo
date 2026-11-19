import { contract } from "@kipivo/api/contract";
import { SmartCoercionPlugin } from "@orpc/json-schema";
import { OpenAPIGenerator } from "@orpc/openapi";
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { RPCHandler } from "@orpc/server/fetch";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";
import { Hono } from "hono";
import { bindAuthRequest } from "../auth/request";
import { requestServices, type AppEnv } from "../context";
import { createProcedureRouter } from "../procedures";

const rpcPrefix = "/rpc";
const restPrefix = "/api/v1";

export function createProcedureRoutes() {
  const router = createProcedureRouter();
  const schemaConverters = [new ZodToJsonSchemaConverter()];
  const generator = new OpenAPIGenerator({ schemaConverters });
  const handlers = [
    [rpcPrefix, new RPCHandler(router)],
    [
      restPrefix,
      new OpenAPIHandler(router, { plugins: [new SmartCoercionPlugin({ schemaConverters })] }),
    ],
  ] as const;
  const routes = new Hono<AppEnv>();
  for (const [prefix, handler] of handlers) {
    routes.all(`${prefix}/*`, async (context) => {
      const { raw } = context.req;
      const services = requestServices(context);
      const outgoing = new Headers();
      const result = await handler.handle(raw, {
        prefix,
        context: {
          access: services.access,
          callAuth: bindAuthRequest(raw, services, outgoing),
          headers: raw.headers,
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

  let document: ReturnType<typeof generator.generate> | undefined;
  routes.get("/api/openapi.json", async (context) => {
    document ??= generator
      .generate(contract, {
        info: { title: "Kipivo API", version: "1.0.0" },
        servers: [{ url: restPrefix }],
        components: {
          securitySchemes: {
            sessionCookie: { type: "apiKey", in: "cookie", name: "kipivo.session_token" },
            secureSessionCookie: {
              type: "apiKey",
              in: "cookie",
              name: "__Secure-kipivo.session_token",
            },
          },
        },
      })
      .catch((error: unknown) => {
        document = undefined;
        throw error;
      });
    return context.json(await document);
  });
  return routes;
}
