import { contract } from "@kipivo/api/contract";
import { implement } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { createMiddleware } from "hono/factory";

export function createRpcMiddleware() {
  const api = implement(contract);
  const router = api.router({
    system: { ping: api.system.ping.handler(() => ({ ok: true })) },
  });
  const handler = new RPCHandler(router);

  return createMiddleware(async (context, next) => {
    const result = await handler.handle(context.req.raw, { prefix: "/rpc", context: {} });
    if (result.matched) return context.newResponse(result.response.body, result.response);
    await next();
  });
}
