import assert from "node:assert/strict";

export async function verifyDocs(origin) {
  async function request(path, status = 200) {
    const response = await fetch(new URL(path, origin), {
      redirect: "manual",
      signal: AbortSignal.timeout(5000),
    });
    assert.equal(response.status, status, `GET ${path}`);
    return response;
  }

  const home = await (await request("/docs")).text();
  assert.match(home, /<h1\b[^>]*>Kipivo documentation<\/h1>/);
  assert.match(home, /href="\/docs"/);
  assert.doesNotMatch(home, /href="\/docs\/"/);

  const stylesheet = home.match(/href="(\/docs\/assets\/[^"\s]+\.css)"/)?.[1];
  assert.ok(stylesheet, "The docs home references its stylesheet under /docs");
  assert.match((await request(stylesheet)).headers.get("content-type") ?? "", /^text\/css\b/);

  const quickstart = await (await request("/docs/quickstart")).text();
  assert.match(quickstart, /<h1\b[^>]*>Quickstart<\/h1>/);
  const searchIndex = await request("/docs/search.json");
  assert.equal((await searchIndex.json()).type, "advanced");
  await request("/docs/missing-guide", 404);
}

if (import.meta.main) {
  const origin = process.argv[2] ?? "http://127.0.0.1:4321";
  await verifyDocs(origin);
  console.log(`Verified docs, styles, search, and missing pages at ${origin}`);
}
