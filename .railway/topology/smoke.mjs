import assert from "node:assert/strict";

const origin = "http://gateway:8080";
const authHeaders = { Origin: origin };
const jsonHeaders = { ...authHeaders, "Content-Type": "application/json" };

function request(path, options) {
  return fetch(new URL(path, origin), {
    ...options,
    redirect: "manual",
    signal: AbortSignal.timeout(5000),
  });
}

async function expectStatus(path, status, options) {
  const response = await request(path, options);
  assert.equal(response.status, status, `${options?.method ?? "GET"} ${path}`);
  return response;
}

function post(path, body, headers = jsonHeaders) {
  return expectStatus(path, 200, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

assert.equal(await (await expectStatus("/gateway-healthz", 200)).text(), "ok");
assert.equal(await (await expectStatus("/readyz", 200)).text(), "ok");
assert.deepEqual(await (await expectStatus("/api/v1/setup", 200)).json(), { open: true });

const home = await request("/");
assert.ok(home.status >= 300 && home.status < 400, "Web redirects an uninstalled workspace");
assert.equal(new URL(home.headers.get("location") ?? "/", origin).pathname, "/setup");
await expectStatus("/setup", 200);

const email = "topology-admin@example.com";
const password = crypto.randomUUID();
await post("/api/v1/setup", { name: "Topology Administrator", email, password });
assert.deepEqual(await (await expectStatus("/api/v1/setup", 200)).json(), { open: false });

const readSession = (headers) =>
  post("/rpc/auth/session/get", { json: { includeAccount: true } }, headers);
const anonymous = await readSession();
assert.deepEqual(await anonymous.json(), { json: null });
const signedIn = await post("/api/auth/sign-in/email", { email, password });
const sessionCookie = signedIn.headers
  .getSetCookie()
  .find((cookie) => cookie.startsWith("kipivo.session_token="));
assert.ok(sessionCookie, "Sign-in issues a session cookie through the gateway");
assert.match(sessionCookie, /;\s*HttpOnly\b/i);
const Cookie = sessionCookie.split(";", 1)[0];
const signedInHeaders = { ...jsonHeaders, Cookie };
const session = await readSession(signedInHeaders);
const { account } = (await session.json()).json;
assert.equal(account.email, email);
assert.equal(account.role, "admin");

await post("/api/auth/sign-out", {}, signedInHeaders);
await expectStatus("/api/v1/accounts/me", 401, { headers: { Cookie } });

console.log(
  "Topology smoke passed: Gateway and API readiness, Web setup redirect, installation, sign-in, account session, and sign-out.",
);
