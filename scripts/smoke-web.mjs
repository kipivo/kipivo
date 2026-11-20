import assert from "node:assert/strict";
import { verifyDocs } from "./smoke-docs.mjs";

const base = new URL(process.argv[2] ?? "http://localhost:3000");

async function get(path, headers) {
  const url = new URL(path, base);
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(5000) });
  assert.equal(response.status, 200, `GET ${url}`);
  return response;
}

assert.equal(await (await get("/healthz")).text(), "ok\n");

const home = await get("/");
const html = await home.text();
assert.match(html, /<h1\b[^>]*>From spark to done\.<\/h1>/);

const stylesheet = html.match(/<link\b(?=[^>]*\brel="stylesheet")[^>]*\bhref="([^"]+)"/)?.[1];
const inlineStyles = html.match(/<style\b[^>]*\bdata-tsr-inline-css[^>]*>([\s\S]*?)<\/style>/)?.[1];
const logo = html.match(/<img\b[^>]*\bsrc="([^"]+)"/)?.[1];
assert.ok(inlineStyles || stylesheet, "The SSR page includes styles");
assert.ok(logo, "The SSR page includes the logo");

if (stylesheet) {
  const styles = await get(stylesheet.replaceAll("&amp;", "&"), { accept: "text/css" });
  assert.match(styles.headers.get("content-type") ?? "", /^text\/css\b/);
}

const image = await get(logo.replaceAll("&amp;", "&"));
assert.match(image.headers.get("content-type") ?? "", /^image\/svg\+xml\b/);

if (process.argv.includes("--production")) {
  assert.match(
    home.headers.get("cache-control") ?? "",
    /\bno-store\b/,
    "Installation redirects must not be publicly cached",
  );

  assert.ok(inlineStyles, "Production SSR inlines route CSS");
  assert.equal(stylesheet, undefined, "Production SSR has no render-blocking stylesheet link");
  const font = inlineStyles.match(
    /url\(["']?([^\s"')]*geist-latin-wght-normal[^\s"')]*\.woff2)/,
  )?.[1];
  assert.ok(font, "Inline styles reference the self-hosted Latin font");
  const fontResponse = await get(font);
  assert.match(fontResponse.headers.get("content-type") ?? "", /^font\/woff2\b/);

  await verifyDocs(base);

  for (const path of [
    "/runs",
    "/api/local/runs",
    "/api/local/runs/00000000-0000-4000-8000-000000000000",
  ]) {
    assert.equal(
      (await fetch(new URL(path, base), { signal: AbortSignal.timeout(5000) })).status,
      404,
      path,
    );
  }
  assert.equal(
    (
      await fetch(new URL("/api/local/runs", base), {
        method: "POST",
        headers: { Origin: base.origin, "Content-Type": "application/json" },
        body: '{"kind":"check"}',
        signal: AbortSignal.timeout(5000),
      })
    ).status,
    404,
  );
}

console.log(`Verified health, SSR, styles, and logo at ${base.origin}`);
