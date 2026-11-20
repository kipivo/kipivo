import { contract, isRestProcedure } from "@kipivo/contract";
import { SmartCoercionHandlerPlugin } from "@orpc/json-schema";
import { OpenAPIGenerator } from "@orpc/openapi";
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { COMMON_ERROR_STATUS_MAP } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { ZodToJsonSchemaConverter } from "@orpc/zod";
import { createProcedureRouter } from "./procedures/router";
import type { ProcedureServices } from "./services";

export type { ProcedureContext } from "./procedures/builders";
export type { ProcedureServices } from "./services";

const rpcPrefix = "/rpc";
const restPrefix = "/api/v1";
const errorStatusMap = { ...COMMON_ERROR_STATUS_MAP, SETUP_CLOSED: 409 };

export function createProcedureHandlers(cookiePrefix: string, services?: ProcedureServices) {
  const router = createProcedureRouter(services);
  const converters = [new ZodToJsonSchemaConverter()];
  const generator = new OpenAPIGenerator({ converters });
  const handlers = [
    [rpcPrefix, new RPCHandler(router, { errorStatusMap })],
    [
      restPrefix,
      new OpenAPIHandler(router, {
        errorStatusMap,
        filter: isRestProcedure,
        plugins: [new SmartCoercionHandlerPlugin({ converters })],
      }),
    ],
  ] as const;

  let document: ReturnType<typeof generator.generate> | undefined;
  function openApi() {
    document ??= generator
      .generate(contract, {
        version: "3.1.1",
        errorStatusMap,
        filter: isRestProcedure,
        base: {
          info: { title: "Kipivo API", version: "1.0.0" },
          servers: [{ url: restPrefix }],
          components: {
            securitySchemes: {
              sessionCookie: {
                type: "apiKey",
                in: "cookie",
                name: `${cookiePrefix}.session_token`,
              },
              secureSessionCookie: {
                type: "apiKey",
                in: "cookie",
                name: `__Secure-${cookiePrefix}.session_token`,
              },
            },
          },
        },
      })
      .catch((error: unknown) => {
        document = undefined;
        throw error;
      });
    return document;
  }

  return { handlers, openApi };
}
