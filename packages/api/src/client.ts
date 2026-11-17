import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { ApiClient } from "./contract";

export function createApiClient(origin: string): ApiClient {
  return createORPCClient(new RPCLink({ url: new URL("/rpc", origin).href }));
}
