import "@tanstack/react-start/server-only";
import { createEnv } from "@kipivo/env";
import { resolveApiOrigin, webEnv } from "./env.server";

const requestHeaders = [
  "accept",
  "content-type",
  "cookie",
  "origin",
  "referer",
  "x-forwarded-for",
  "x-request-id",
  "sec-fetch-site",
  "sec-fetch-mode",
  "sec-fetch-dest",
];
const responseHeaders = [
  "content-type",
  "location",
  "retry-after",
  "x-content-type-options",
  "x-request-id",
];

export async function proxyApi(request: Request, unavailableMessage = "API unavailable.") {
  const unavailable = () =>
    Response.json(
      { error: unavailableMessage },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  const env = createEnv(webEnv);
  const apiOrigin = resolveApiOrigin(env.API_ORIGIN, import.meta.env.DEV);
  const source = new URL(request.url);
  if (!apiOrigin || apiOrigin === source.origin) return unavailable();

  const destination = new URL(apiOrigin);
  destination.pathname = source.pathname;
  destination.search = source.search;
  const headers = new Headers();
  for (const name of requestHeaders) {
    const value = request.headers.get(name);
    if (value !== null) headers.set(name, value);
  }
  const init: RequestInit & { duplex?: "half" } = {
    method: request.method,
    headers,
    redirect: "manual",
    signal: AbortSignal.any([request.signal, AbortSignal.timeout(10_000)]),
  };
  if (request.body) {
    init.body = request.body;
    init.duplex = "half";
  }

  try {
    const upstream = await fetch(destination, init);
    const result = new Headers({ "Cache-Control": "no-store" });
    for (const name of responseHeaders) {
      const value = upstream.headers.get(name);
      if (value !== null) result.set(name, value);
    }
    for (const cookie of upstream.headers.getSetCookie()) result.append("Set-Cookie", cookie);
    return new Response(upstream.body, { status: upstream.status, headers: result });
  } catch {
    return unavailable();
  }
}
