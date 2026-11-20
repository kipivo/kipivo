for (const [name, port] of [
  ["web", 8081],
  ["api", 8082],
  ["docs", 8083],
]) {
  Bun.serve({
    hostname: "::",
    port,
    async fetch(request) {
      const url = new URL(request.url);
      const headers = {
        "X-Upstream": name,
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "no-referrer",
        "Set-Cookie": "session=returned; Secure; HttpOnly; SameSite=Lax",
      };
      if (url.pathname === "/compression")
        return new Response(
          "<!doctype html><html><body>" + "Kipivo SSR content. ".repeat(100) + "</body></html>",
          { headers: { ...headers, "Content-Type": "text/html; charset=utf-8" } },
        );
      if (url.pathname === "/healthz")
        return new Response(name === "web" ? "ok\n" : "ok", { headers });
      if (url.pathname === "/missing")
        return new Response("404 Not Found", { status: 404, headers });
      return Response.json(
        {
          name,
          path: url.pathname,
          query: url.search,
          method: request.method,
          body: await request.text(),
          cookie: request.headers.get("cookie"),
          authorization: request.headers.get("authorization"),
          origin: request.headers.get("origin"),
          host: request.headers.get("host"),
          proto: request.headers.get("x-forwarded-proto"),
        },
        { headers },
      );
    },
  });
}
