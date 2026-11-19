#!/usr/bin/env bash
set -euo pipefail

if (( $# > 1 )); then
  printf 'Usage: %s [gateway-image]\n' "$0" >&2
  exit 2
fi
cd "$(dirname "$0")/.."
image=$(docker image inspect --format '{{.Id}}' -- "${1:-kipivo-gateway:ci}")
work_dir=$(mktemp -d "${TMPDIR:-/tmp}/kipivo-gateway-smoke.XXXXXXXX")
run_label="io.kipivo.gateway-image-smoke=${work_dir##*/}"
cleanup() {
  local status=$? cleanup_status=0 ids id
  trap - EXIT
  ids=$(docker container ls --all --quiet --filter "label=$run_label") || cleanup_status=1
  while IFS= read -r id; do
    [[ -n "$id" ]] || continue
    if (( status != 0 )); then docker logs "$id" >&2 || true; fi
    docker container rm --force --volumes "$id" >/dev/null || cleanup_status=1
  done <<< "$ids"
  ids=$(docker network ls --quiet --filter "label=$run_label") || cleanup_status=1
  while IFS= read -r id; do
    [[ -n "$id" ]] || continue
    docker network rm "$id" >/dev/null || cleanup_status=1
  done <<< "$ids"
  rm -rf -- "$work_dir" || cleanup_status=1
  if (( status == 0 )); then status=$cleanup_status; fi
  exit "$status"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

# No published ports, production credentials, or host services are used.
network=$(docker network create --internal --label "$run_label" "${work_dir##*/}")
cat > "$work_dir/upstreams.mjs" <<'JS'
for (const [name, port] of [["web", 8081], ["api", 8082]]) {
  Bun.serve({ hostname: "::", port, async fetch(request) {
    const url = new URL(request.url);
    const headers = { "X-Upstream": name, "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer", "Set-Cookie": "session=returned; Secure; HttpOnly; SameSite=Lax" };
    if (url.pathname === "/compression") return new Response("<!doctype html><html><body>" + "Kipivo SSR content. ".repeat(100) + "</body></html>",
      { headers: { ...headers, "Content-Type": "text/html; charset=utf-8" } });
    if (url.pathname === "/healthz") return new Response(name === "web" ? "ok\n" : "ok", { headers });
    if (url.pathname === "/missing") return new Response("404 Not Found", { status: 404, headers });
    return Response.json({ name, path: url.pathname, query: url.search, method: request.method,
      body: await request.text(), cookie: request.headers.get("cookie"), origin: request.headers.get("origin"),
      host: request.headers.get("host"), proto: request.headers.get("x-forwarded-proto") }, { headers });
  }});
}
JS
mock=$(docker create --label "$run_label" --network "$network" --network-alias upstream \
  oven/bun:1.4.4-slim bun /smoke/upstreams.mjs)
docker cp "$work_dir/." "$mock:/smoke"
docker start "$mock" >/dev/null
start_gateway() {
  gateway=$(docker create --label "$run_label" --network "$network" --network-alias "$1" \
    --env WEB_UPSTREAM=upstream:8081 --env API_UPSTREAM=upstream:8082 "${@:2}" "$image")
  docker start "$gateway" >/dev/null
}
start_gateway gateway --env LEGACY_API_HOST=api.example.test
start_gateway default-gateway
cat > "$work_dir/test.mjs" <<'JS'
import assert from "node:assert/strict";
const base = "http://gateway:8080";
for (const target of [base, "http://default-gateway:8080"]) {
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    try { const response = await fetch(`${target}/gateway-healthz`); ready = response.ok && await response.text() === "ok"; } catch {}
    if (ready) break;
    await Bun.sleep(1000);
  }
  assert.ok(ready, `${target} starts with its optional legacy hostname set or unset`);
}
for (const path of ["/rpc", "/rpc/", "/rpc/nested", "/api/auth", "/api/auth/", "/api/auth/session",
  "/api/v1", "/api/v1/", "/api/v1/admin/accounts/example/role", "/api/openapi.json", "/readyz",
  "/", "/rpc-other", "/rpcish/foo", "/api/authentication", "/api/auth-other/foo", "/api/v10/system/ping",
  "/api/openapi.json-other", "/readyz/", "/readyz-other", "/api/locality"]) {
  const name = /^(\/rpc(?:\/|$)|\/api\/(?:auth|v1)(?:\/|$)|\/api\/openapi\.json$|\/readyz$)/.test(path) ? "api" : "web";
  const response = await fetch(`${base}${path}?a=1&a=2&encoded=a%2Fb`, { method: "POST", body: "payload=hello",
    headers: { Cookie: "session=original; other=two", Origin: "https://app.example.test", Host: "app.example.test", "X-Forwarded-Proto": "http" } });
  assert.equal(response.status, 200, path);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("referrer-policy"), "no-referrer");
  assert.equal(response.headers.get("set-cookie"), "session=returned; Secure; HttpOnly; SameSite=Lax");
  assert.deepEqual(await response.json(), { name, path, query: "?a=1&a=2&encoded=a%2Fb", method: "POST", body: "payload=hello",
    cookie: "session=original; other=two", origin: "https://app.example.test", host: "app.example.test", proto: "https" }, path);
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
assert.equal(await compressed.text(), "<!doctype html><html><body>" + "Kipivo SSR content. ".repeat(100) + "</body></html>");
for (const [host, expected, body] of [["app.example.test", "web", "ok\n"], ["api.example.test", "api", "ok"]]) {
  const response = await fetch(`${base}/healthz`, { headers: { Host: host } });
  assert.equal(response.headers.get("x-upstream"), expected);
  assert.equal(await response.text(), body);
}
for (const path of ["/missing", "/api/local/runs", "/anything", "/readyz/"]) {
  const response = await fetch(`${base}${path}`, { headers: { Host: "api.example.test" } });
  assert.equal(response.headers.get("x-upstream"), "api", `legacy ${path}`);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.status, path === "/missing" ? 404 : 200);
}
console.log("Gateway smoke passed: routing, boundaries, local isolation, legacy host, HTTPS forwarding, HTML compression, request and response preservation.");
JS
docker cp "$work_dir/test.mjs" "$mock:/smoke/test.mjs"
docker exec "$mock" bun /smoke/test.mjs
