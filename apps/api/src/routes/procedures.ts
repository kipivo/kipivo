import { contract } from "@kipivo/api/contract";
import { SmartCoercionHandlerPlugin } from "@orpc/json-schema";
import { OpenAPIGenerator } from "@orpc/openapi";
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { COMMON_ERROR_STATUS_MAP } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { ZodToJsonSchemaConverter } from "@orpc/zod";
import { Hono } from "hono";
import { bindAuthRequest } from "../auth/request";
import { requestServices, type AppEnv } from "../context";
import { createProcedureRouter } from "../procedures";

const rpcPrefix = "/rpc";
const restPrefix = "/api/v1";
const errorStatusMap = { ...COMMON_ERROR_STATUS_MAP, SETUP_CLOSED: 409 };

export function createProcedureRoutes() {
  const router = createProcedureRouter();
  const converters = [new ZodToJsonSchemaConverter()];
  const generator = new OpenAPIGenerator({ converters });
  const handlers = [
    [rpcPrefix, new RPCHandler(router, { errorStatusMap })],
    [
      restPrefix,
      new OpenAPIHandler(router, {
        errorStatusMap,
        plugins: [new SmartCoercionHandlerPlugin({ converters })],
      }),
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
        version: "3.1.1",
        errorStatusMap,
        base: {
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
