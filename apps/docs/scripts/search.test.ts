import { expect, test } from "bun:test";
import { once } from "node:events";
import { createServer as createHttpServer } from "node:http";
import { resolve } from "node:path";
import { staticClient } from "fumadocs-core/search/client/orama-static";
import { createServer as createViteServer } from "vite";

const root = resolve(import.meta.dirname, "..");
const chineseDocs = "/docs/zh-CN";
const runner = `${chineseDocs}/local-runner`;

test("Chinese keyword search returns Chinese guide destinations", async () => {
  const vite = await createViteServer({
    root,
    server: { middlewareMode: true, watch: null, ws: false },
  });
  const server = createHttpServer(vite.middlewares);
  try {
    await once(server.listen(0, "127.0.0.1"), "listening");
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Expected a TCP address");
    const origin = `http://127.0.0.1:${address.port}`;
    const search = staticClient({ from: `${origin}/docs/search.json`, locale: "zh-CN" });
    const results = await search.search("本地运行器");
    expect(results).toContainEqual(
      expect.objectContaining({ type: "page", url: runner, content: "本地运行器" }),
    );

    const destinations = new Set<string>();
    for (const { url } of results) {
      const destination = new URL(url, origin);
      expect(destination.origin).toBe(origin);
      expect(destination.pathname).toMatch(/^\/docs\/zh-CN(?:\/|$)/);
      destinations.add(destination.pathname);
    }
    await Promise.all(
      [...destinations].map(async (path) => {
        const response = await fetch(new URL(path, origin), {
          redirect: "manual",
          signal: AbortSignal.timeout(5000),
        });
        expect(response.status, path).toBe(200);
        const html = await response.text();
        expect(html, path).toMatch(/<html\b[^>]*lang="zh-CN"/);
        if (path === runner) expect(html).toMatch(/<h1\b[^>]*>本地运行器<\/h1>/);
      }),
    );
  } finally {
    try {
      await new Promise<void>((done) => server.close(() => done()));
    } finally {
      await vite.close();
    }
  }
}, 20_000);
