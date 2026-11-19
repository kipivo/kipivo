import { createORPCClient } from "@orpc/client";
import { RPCLink, type RPCLinkOptions } from "@orpc/client/fetch";
import type { ApiClient } from "./contract";

type ClientOptions = Pick<RPCLinkOptions<Record<never, never>>, "headers" | "fetch">;

export function createApiClient(origin: string, options?: ClientOptions): ApiClient {
  return createORPCClient(new RPCLink({ ...options, origin: new URL(origin).origin, url: "/rpc" }));
}
