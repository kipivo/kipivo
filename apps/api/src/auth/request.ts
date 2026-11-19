import { ORPCError } from "@orpc/server";
import type { AppServices } from "../context";
type Endpoint = { method?: string; path?: string };
const errorsByStatus: Record<number, string> = {
  400: "BAD_REQUEST",
  401: "UNAUTHORIZED",
  403: "FORBIDDEN",
  404: "NOT_FOUND",
  409: "CONFLICT",
  422: "UNPROCESSABLE_CONTENT",
  429: "TOO_MANY_REQUESTS",
  503: "SERVICE_UNAVAILABLE",
};

// Go through the HTTP handler, not auth.api: both transports must run Better Auth's
// origin checks, rate limiter, plugin hooks and session-cookie lifecycle.
export function bindAuthRequest(request: Request, services: AppServices, outgoing: Headers) {
  return async ({ method, path }: Endpoint, input: unknown) => {
    if (!services.handleAuth || !services.access) throw new ORPCError("SERVICE_UNAVAILABLE");
    if (!path?.startsWith("/auth/") || (method !== "POST" && method !== "GET"))
      throw new ORPCError("INTERNAL_SERVER_ERROR");
    const { trustedOrigin } = services.access;
    if (method === "POST") {
      if (request.method !== "POST") throw new ORPCError("METHOD_NOT_SUPPORTED");
      if (
        request.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase() !==
        "application/json"
      )
        throw new ORPCError("UNSUPPORTED_MEDIA_TYPE");
      if (path !== "/auth/native/exchange" && request.headers.get("origin") !== trustedOrigin)
        throw new ORPCError("FORBIDDEN");
    }
    const headers = new Headers(request.headers);
    headers.delete("content-length");
    headers.delete("content-encoding");
    headers.set("content-type", "application/json");
    const response = await services.handleAuth(
      new Request(new URL(`/api${path}`, trustedOrigin), {
        method,
        headers,
        signal: request.signal,
        body: method === "POST" ? JSON.stringify(input ?? {}) : undefined,
      }),
    );
    for (const cookie of response.headers.getSetCookie()) outgoing.append("set-cookie", cookie);
    const retry = response.headers.get("retry-after");
    if (retry) outgoing.set("retry-after", retry);
    if (!response.ok)
      throw new ORPCError(errorsByStatus[response.status] ?? "INTERNAL_SERVER_ERROR");
    return response;
  };
}

export type AuthProcedureContext = { callAuth: ReturnType<typeof bindAuthRequest> };
