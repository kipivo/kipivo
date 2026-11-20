import assert from "node:assert/strict";
const base = "http://gateway:8080";
const health = await fetch(`${base}/gateway-healthz`);
assert.equal(health.status, 200);
assert.equal(await health.text(), "ok");
for (const path of [
  "/rpc",
  "/rpc/",
  "/rpc/nested",
  "/api/auth",
  "/api/auth/",
  "/api/auth/session",
  "/api/v1",
  "/api/v1/",
  "/api/v1/admin/accounts/example/role",
  "/api/openapi.json",
  "/readyz",
  "/docs",
  "/docs/",
  "/docs/assets/main.js",
  "/",
  "/docs-other",
  "/rpc-other",
  "/rpcish/foo",
  "/api/authentication",
  "/api/auth-other/foo",
  "/api/v2/system/ping",
  "/api/v10/system/ping",
  "/api/openapi.json-other",
  "/readyz/",
  "/readyz-other",
  "/api/locality",
]) {
  const name = /^(\/rpc(?:\/|$)|\/api\/(?:auth|v1)(?:\/|$)|\/api\/openapi\.json$|\/readyz$)/.test(
    path,
  )
    ? "api"
    : /^\/docs(?:\/|$)/.test(path)
      ? "docs"
      : "web";
  const response = await fetch(`${base}${path}?a=1&a=2&encoded=a%2Fb`, {
    method: "POST",
    body: "payload=hello",
    headers: {
      Cookie: "session=original; other=two",
      Authorization: "Bearer example",
      Origin: "https://app.example.test",
      Host: "app.example.test",
      "X-Forwarded-Proto": "http",
    },
  });
  assert.equal(response.status, 200, path);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("referrer-policy"), "no-referrer");
  assert.equal(
    response.headers.get("set-cookie"),
    "session=returned; Secure; HttpOnly; SameSite=Lax",
  );
  assert.deepEqual(
    await response.json(),
    {
      name,
      path,
      query: "?a=1&a=2&encoded=a%2Fb",
      method: "POST",
      body: "payload=hello",
      cookie: name === "docs" ? null : "session=original; other=two",
      authorization: name === "docs" ? null : "Bearer example",
      origin: "https://app.example.test",
      host: "app.example.test",
      proto: "https",
    },
    path,
  );
}
for (const path of ["/api/local", "/api/local/", "/api/local/runs/123"]) {
  const response = await fetch(`${base}${path}`);
  assert.equal(response.status, 404, path);
  assert.equal(response.headers.get("x-upstream"), null, "local routes never reach an upstream");
}
const compressed = await fetch(`${base}/compression`, { headers: { "Accept-Encoding": "gzip" } });
assert.equal(compressed.headers.get("content-encoding"), "gzip", "SSR HTML is compressed");
assert.match(compressed.headers.get("vary") ?? "", /accept-encoding/i);
assert.equal(compressed.headers.get("x-upstream"), "web");
assert.equal(
  await compressed.text(),
  "<!doctype html><html><body>" + "Kipivo SSR content. ".repeat(100) + "</body></html>",
);
for (const host of ["app.example.test", "api.example.test"]) {
  const response = await fetch(`${base}/healthz`, { headers: { Host: host } });
  assert.equal(response.headers.get("x-upstream"), "web");
  assert.equal(await response.text(), "ok\n");
}
const aliasHeaders = { Host: "alias.example.test", "X-Forwarded-Host": "untrusted.example.test" };
const aliasHealth = await fetch(`${base}/gateway-healthz`, { headers: aliasHeaders });
assert.equal(aliasHealth.status, 200);
assert.equal(await aliasHealth.text(), "ok");
for (const method of ["GET", "HEAD"]) {
  for (const path of ["/", "/docs", "/notes/a%2Fb?tag=one&tag=two&next=%2Fsign-in"]) {
    const response = await fetch(`${base}${path}`, {
      method,
      headers: aliasHeaders,
      redirect: "manual",
    });
    assert.equal(response.status, 308, `${method} ${path}`);
    const location = response.headers.get("location");
    assert.ok(location);
    assert.equal(new URL(location).href, `https://xn--bcher-kva.example.test:8443${path}`);
    assert.equal(response.headers.get("x-upstream"), null);
  }
}
for (const [method, path] of [
  ["GET", "/api"],
  ["GET", "/api/auth/get-session"],
  ["GET", "/api/openapi.json"],
  ["GET", "/api/v1/system/ping"],
  ["GET", "/%61pi/v1/system/ping"],
  ["GET", "/rpc"],
  ["GET", "/rpc/auth/session/get"],
  ["GET", "/healthz"],
  ["HEAD", "/readyz"],
  ["POST", "/api/auth/sign-in/email"],
  ["POST", "/sign-in"],
  ["PUT", "/settings"],
  ["OPTIONS", "/settings"],
]) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: aliasHeaders,
    redirect: "manual",
    body: method === "POST" ? "credential=example" : undefined,
  });
  assert.equal(response.status, 404, `${method} ${path}`);
  assert.equal(response.headers.get("location"), null);
  assert.equal(response.headers.get("x-upstream"), null);
}
const missing = await fetch(`${base}/missing`);
assert.equal(missing.status, 404);
assert.equal(missing.headers.get("x-upstream"), "web");
assert.equal(missing.headers.get("x-content-type-options"), "nosniff");
console.log(
  "Gateway smoke passed: routing, alias isolation, HTTPS forwarding, HTML compression, and request and response preservation.",
);
