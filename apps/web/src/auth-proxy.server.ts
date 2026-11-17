import "@tanstack/react-start/server-only";

const requestHeaders = [
  "accept",
  "content-type",
  "cookie",
  "origin",
  "referer",
  "x-forwarded-for",
  "sec-fetch-site",
  "sec-fetch-mode",
  "sec-fetch-dest",
];
const responseHeaders = ["content-type", "location", "retry-after"];

const unavailable = () =>
  Response.json(
    { error: "Authentication unavailable." },
    {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    },
  );

export async function proxyAuth(request: Request) {
  const apiOrigin = process.env.API_ORIGIN || (import.meta.env.DEV ? "http://127.0.0.1:3001" : "");
  const destination = URL.parse(apiOrigin);
  const source = new URL(request.url);
  if (
    !destination ||
    !["http:", "https:"].includes(destination.protocol) ||
    destination.href !== `${destination.origin}/` ||
    destination.origin === source.origin
  )
    return unavailable();

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
