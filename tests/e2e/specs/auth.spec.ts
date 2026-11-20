import { createHash, randomBytes, randomUUID } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApiClient } from "@kipivo/orpc/client";
import { expect, test, type APIRequestContext } from "@playwright/test";
import postgres from "postgres";
import { createTestDatabase } from "../fixtures/database";
import { healthy, launch, launchBuiltApi, repoRoot } from "../fixtures/process";

const origin = "http://127.0.0.1:4383";
const apiOrigin = "http://127.0.0.1:4382";
const authSecret = "kipivo-auth-e2e-disposable-database-secret";
const authPreload = join(repoRoot, "tests/e2e/fixtures/auth-preload.mjs");
let api: ReturnType<typeof launch> | undefined;
let web: ReturnType<typeof launch> | undefined;

let database: Awaited<ReturnType<typeof createTestDatabase>>;
let firstAdmin: APIRequestContext;
let inbox: string;

test.beforeAll(async ({ playwright }) => {
  inbox = await mkdtemp(join(tmpdir(), "kipivo-email-test-"));
  database = await createTestDatabase();
  api = launchBuiltApi(
    4382,
    {
      DATABASE_URL: database.url,
      DB_MIGRATE_ON_START: "true",
      AUTH_URL: origin,
      AUTH_SECRET: authSecret,
      API_TRUST_PROXY: "true",
      GOOGLE_CLIENT_ID: "test-google",
      GOOGLE_CLIENT_SECRET: "test-google-secret",
      GITHUB_CLIENT_ID: "test-github",
      GITHUB_CLIENT_SECRET: "test-github-secret",
      E2E_MAIL_FILE: join(inbox, "last.json"),
    },
    authPreload,
  );
  await api.waitFor(
    async () => (await fetch(`${apiOrigin}/readyz`, { signal: AbortSignal.timeout(2000) })).ok,
  );
  web = launch([".output/server/index.mjs"], join(repoRoot, "apps/web"), {
    PORT: "4383",
    HOST: "127.0.0.1",
    API_ORIGIN: apiOrigin,
  });
  await web.waitFor(() => healthy(origin));
  firstAdmin = await playwright.request.newContext({
    baseURL: origin,
    extraHTTPHeaders: { Origin: origin, "X-Forwarded-For": "198.51.100.30" },
  });
  const credentials = {
    name: "First Administrator",
    email: `first-${randomUUID()}@example.com`,
    password: randomUUID(),
  };
  expect((await firstAdmin.post("/api/v1/setup", { data: credentials })).status()).toBe(200);
  expect((await firstAdmin.post("/api/auth/sign-in/email", { data: credentials })).status()).toBe(
    200,
  );
});

test.afterAll(async () => {
  await firstAdmin?.dispose();
  await web?.stop();
  await api?.stop();
  await database?.drop();
  if (inbox) await rm(inbox, { recursive: true, force: true });
});

async function assignAdminRole(id: string) {
  const response = await firstAdmin.put(`/api/v1/admin/accounts/${id}/role`, {
    data: { role: "admin" },
  });
  expect(response.status(), await response.text()).toBe(200);
}

test("standalone database and authentication use the configured pool", async () => {
  const probe = launch(
    [
      "--no-env-file",
      "-e",
      `import assert from "node:assert/strict";
import { createAuth } from "@kipivo/auth/factory";
import { createDatabase } from "@kipivo/db/factory";

assert.equal(typeof createAuth, "function");
assert.equal(typeof createDatabase, "function");
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;

const { database } = await import("@kipivo/db");
assert.ok(database);
try {
  const leases = await Promise.all(Array.from({ length: 10 }, () => database.db.$client.reserve()));
  try {
    await assert.rejects(database.db.$client.begin(async () => {}), { code: "QUEUE_TIMEOUT" });
  } finally {
    for (const lease of leases) lease.release();
  }
  const { auth } = await import("@kipivo/auth");
  assert.ok(auth);
  assert.equal(await database.ready(), true);
  const { configApp,configKey } = await import("@kipivo/db/schema");
  const definitions=await database.db.select().from(configKey);
  assert.ok(definitions.some(row=>row.key==="admin_setup" && row.scope==="instance" && row.editor==="system" && row.defaultValue===null));
  for (const key of ["not_registered", "account_display"]) {
    await assert.rejects(database.db.insert(configApp).values({key,value:{}}).execute(), err=>err.cause?.code==="23503");
  }
  const email = \`e2e-\${crypto.randomUUID()}@example.com\`;
  const result = await auth.api.signUpEmail({
    body: { name: "Kipivo E2E", email, password: "kipivo-test-password-123" },
  });
  assert.equal(result.user.email, email);
} finally {
  await database.close();
}`,
    ],
    join(repoRoot, "apps/api"),
    {
      TEST_DATABASE_URL: database.url,
      DATABASE_URL: "invalid-database-config",
      AUTH_URL: origin,
      AUTH_SECRET: authSecret,
    },
  );
  try {
    const { code, output } = await probe.waitForExit();
    expect(code, output).toBe(0);
  } finally {
    await probe.stop();
  }
});

test("email authentication persists and revokes sessions through Web", async ({ request }) => {
  const url = `${origin}/api/auth`;
  const email = `e2e-${randomUUID()}@example.com`;
  const password = "kipivo-test-password-123";
  const headers = { Origin: origin, "X-Forwarded-For": "198.51.100.10" };
  const requestId = `auth-${randomUUID()}`;

  expect(await (await request.get(`${url}/get-session`)).json()).toBeNull();
  const signUp = await request.post(`${url}/sign-up/email`, {
    headers: { ...headers, "X-Request-Id": requestId },
    data: { name: "Kipivo E2E", email, password },
  });
  expect(signUp.status(), await signUp.text()).toBe(200);
  expect(signUp.headers()["x-request-id"]).toBe(requestId);
  expect(
    signUp
      .headersArray()
      .some(({ name, value }) => name.toLowerCase() === "set-cookie" && value.includes("HttpOnly")),
  ).toBe(true);
  const signedIn = await (await request.get(`${url}/get-session`)).json();
  expect(signedIn.user.email).toBe(email);
  expect(signedIn.session.ipAddress).toBe("198.51.100.10");
  const { cookies } = await request.storageState();
  const authenticatedCookie = cookies.map(({ name, value }) => `${name}=${value}`).join("; ");

  const rejected = await request.post(`${url}/sign-out`, {
    headers: { Origin: "https://untrusted.example" },
    data: {},
  });
  expect(rejected.status()).toBe(403);
  expect((await (await request.get(`${url}/get-session`)).json()).user.email).toBe(email);

  expect((await request.post(`${url}/sign-out`, { headers, data: {} })).status()).toBe(200);
  expect(await (await request.get(`${url}/get-session`)).json()).toBeNull();
  expect(
    await (
      await request.get(`${url}/get-session`, {
        headers: { Cookie: authenticatedCookie },
      })
    ).json(),
  ).toBeNull();
  const wrongPassword = await request.post(`${url}/sign-in/email`, {
    headers,
    data: { email, password: "wrong-password-123" },
  });
  expect(wrongPassword.status()).toBe(401);
  // The typed transport and the native Better Auth endpoints share the same cookie jar.
  const rpc = `${origin}/rpc/auth`;
  const login = await request.post(`${url}/sign-in/email`, {
    headers,
    data: { email, password },
  });
  expect(login.status(), await login.text()).toBe(200);
  expect(login.headers()["cache-control"]).toBe("no-store");
  const readSession = () => request.post(`${rpc}/session/get`, { data: {} });
  const current = await (await readSession()).json();
  expect(current).toEqual({
    json: {
      user: { id: expect.any(String), name: "Kipivo E2E", email },
      session: { id: expect.any(String), expiresAt: expect.any(String) },
    },
  });
  const expiresSoon = new Date(Date.now() + 60 * 60 * 1000);
  const sql = postgres(database.url, { max: 1 });
  try {
    const aged = await sql`
      UPDATE auth_session SET expires_at = ${expiresSoon} WHERE id = ${current.json.session.id}
    `;
    expect(aged.count).toBe(1);
  } finally {
    await sql.end();
  }
  const refreshed = await readSession();
  expect(refreshed.status()).toBe(200);
  expect(refreshed.headersArray()).toContainEqual({
    name: expect.stringMatching(/^set-cookie$/i),
    value: expect.stringMatching(/^kipivo\.session_token=.*;\s*HttpOnly\b/i),
  });
  const renewed = await refreshed.json();
  expect(renewed.json.session.id).toBe(current.json.session.id);
  expect(Date.parse(renewed.json.session.expiresAt)).toBeGreaterThan(expiresSoon.valueOf());
  expect((await request.post(`${url}/sign-out`, { headers, data: {} })).status()).toBe(200);
  expect(await (await readSession()).json()).toEqual({ json: null });
});

test("trusted Web subdomains share sessions from password and OAuth sign-in", async ({
  page,
  request,
}) => {
  const primary = "http://kipivo.localhost:4389";
  const alternate = "http://www.kipivo.localhost:4389";
  const upstream = "http://127.0.0.1:4390";
  const name = "Subdomain Account";
  const email = `subdomain-${randomUUID()}@example.com`;
  const password = randomUUID();
  const api = launchBuiltApi(
    4390,
    {
      DATABASE_URL: database.url,
      AUTH_URL: primary,
      AUTH_SECRET: authSecret,
      AUTH_TRUSTED_ORIGINS: alternate,
      AUTH_COOKIE_DOMAIN: "kipivo.localhost",
      GOOGLE_CLIENT_ID: "test-google",
      GOOGLE_CLIENT_SECRET: "test-google-secret",
    },
    authPreload,
  );
  const web = launch([".output/server/index.mjs"], join(repoRoot, "apps/web"), {
    PORT: "4389",
    HOST: "127.0.0.1",
    API_ORIGIN: upstream,
  });
  try {
    await api.waitFor(async () => (await fetch(`${upstream}/readyz`)).ok);
    await web.waitFor(() => healthy("http://127.0.0.1:4389"));
    expect(
      (
        await request.post(`${upstream}/api/auth/sign-up/email`, {
          data: { name, email, password },
          headers: { Origin: primary },
        })
      ).status(),
    ).toBe(200);
    expect(
      (
        await request.post(`${upstream}/api/auth/sign-in/email`, {
          data: { email, password },
          headers: { Origin: "http://unlisted.kipivo.localhost:4389" },
        })
      ).status(),
    ).toBe(403);

    await page.goto(`${alternate}/sign-in`);
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    const [login] = await Promise.all([
      page.waitForResponse(`${alternate}/api/auth/sign-in/email`),
      page.getByRole("button", { name: "Sign in", exact: true }).click(),
    ]);
    expect(login.status()).toBe(200);
    expect(await login.headerValue("set-cookie")).toMatch(
      /kipivo\.shared\.session_token=[^\r\n]*Domain=kipivo\.localhost/i,
    );
    await expect(page.getByRole("button", { name: "Account menu" })).toBeVisible();

    const update = await page.request.post(`${alternate}/rpc/accounts/me/settings/update`, {
      data: { json: { menuLabel: "email" } },
      headers: { Origin: alternate },
    });
    expect(update.status(), await update.text()).toBe(200);
    await page.goto(primary);
    const menu = page.getByRole("button", { name: "Account menu" });
    await expect(menu).toBeVisible();
    await menu.click();
    await page.getByRole("menuitem", { name: "Sign out" }).click();
    await expect(page.getByRole("link", { name: "Sign in", exact: true })).toBeVisible();
    const session = await page.request.post(`${alternate}/rpc/auth/session/get`, { data: {} });
    expect(await session.json()).toEqual({ json: null });

    await page.route("https://accounts.google.com/o/oauth2/v2/auth?**", async (route) => {
      const { searchParams } = new URL(route.request().url());
      const callback = new URL(searchParams.get("redirect_uri")!);
      expect(callback.href).toBe(`${primary}/api/auth/callback/google`);
      callback.searchParams.set("state", searchParams.get("state")!);
      callback.searchParams.set("code", "test-code");
      await route.fulfill({ status: 302, headers: { location: callback.href } });
    });
    await page.goto(`${alternate}/sign-in?next=/settings`);
    const [socialStart, callback] = await Promise.all([
      page.waitForResponse(`${alternate}/api/auth/sign-in/social`),
      page.waitForResponse((response) => {
        const url = new URL(response.url());
        return url.origin === primary && url.pathname === "/api/auth/callback/google";
      }),
      page.getByRole("button", { name: "Continue with Google" }).click(),
    ]);
    expect(socialStart.ok()).toBe(true);
    expect(await callback.headerValue("set-cookie")).toMatch(
      /kipivo\.shared\.session_token=[^\r\n]*Domain=kipivo\.localhost/i,
    );
    await expect(page.getByRole("button", { name: "Account menu" })).toBeVisible();

    const readSession = (host: string) =>
      page.request.post(`${host}/rpc/auth/session/get`, { data: {} });
    const primarySession = await readSession(primary);
    const alternateSession = await readSession(alternate);
    expect(primarySession.ok()).toBe(true);
    expect(alternateSession.ok()).toBe(true);
    const signedIn = await primarySession.json();
    expect(signedIn).toMatchObject({
      json: {
        user: { email: "google-oauth@example.com" },
        session: { id: expect.any(String) },
      },
    });
    expect(await alternateSession.json()).toEqual(signedIn);
  } finally {
    await web.stop();
    await api.stop();
  }
});

test("RPC and REST enforce roles and publish the same API contract through Web", async ({
  request: admin,
  playwright,
}) => {
  const rest = `${origin}/api/v1`;
  const accounts = `${rest}/admin/accounts`;
  const roleUrl = (id: string) => `${accounts}/${id}/role`;
  const headers = { Origin: origin };
  const member = await playwright.request.newContext();

  const directoryName = `Directory ${randomUUID()}`;
  async function signUp(request: APIRequestContext, suffix: string) {
    const response = await request.post(`${origin}/api/auth/sign-up/email`, {
      headers,
      data: {
        name: `${directoryName} ${suffix}`,
        email: `rbac-${randomUUID()}@example.com`,
        password: "kipivo-test-password-123",
        role: "admin",
      },
    });
    expect(response.status(), await response.text()).toBe(200);
    const { user } = (await response.json()) as {
      user: { id: string; email: string; name: string };
    };
    return { id: user.id, email: user.email, name: user.name };
  }

  try {
    const publicClient = createApiClient(origin);
    expect(await publicClient.system.ping()).toEqual({ ok: true });
    await expect(publicClient.accounts.me.get()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
      defined: true,
    });
    const anonymous = await admin.get(`${rest}/accounts/me`);
    expect(anonymous.status()).toBe(401);
    expect(anonymous.headers()["cache-control"]).toBe("no-store");
    expect((await admin.get(`${rest}/account/me`)).status()).toBe(404);

    const specification = await admin.get(`${origin}/api/openapi.json`);
    expect(specification.status(), await specification.text()).toBe(200);
    expect(await specification.json()).toMatchObject({
      openapi: expect.stringMatching(/^3\.1\./),
      servers: [{ url: "/api/v1" }],
      paths: {
        "/system/ping": { get: { responses: { "200": expect.any(Object) } } },
        "/accounts/me": {
          get: {
            security: [{ sessionCookie: [] }, { secureSessionCookie: [] }],
            responses: { "401": expect.any(Object) },
          },
        },
        "/admin/accounts": {
          get: {
            parameters: expect.arrayContaining([
              expect.objectContaining({ name: "limit", in: "query" }),
              expect.objectContaining({ name: "query", in: "query" }),
            ]),
          },
        },
        "/admin/accounts/{id}/role": {
          put: {
            requestBody: expect.any(Object),
            responses: { "403": expect.any(Object), "404": expect.any(Object) },
          },
        },
      },
    });

    const adminAccount = await signUp(admin, "owner");
    const memberAccount = await signUp(member, "M%_\\");
    expect(await (await member.get(`${rest}/accounts/me`)).json()).toEqual({
      ...memberAccount,
      settings: { menuLabel: "name" },
      role: "member",
      permissions: ["account.read"],
    });
    expect((await admin.get(accounts)).status()).toBe(403);
    expect((await member.get(accounts, { params: { query: memberAccount.email } })).status()).toBe(
      403,
    );
    expect(
      (await member.put(roleUrl(adminAccount.id), { headers, data: { role: "admin" } })).status(),
    ).toBe(403);

    const personal = `${rest}/accounts/me/settings`;
    expect((await member.put(personal, { headers, data: { menuLabel: "email" } })).status()).toBe(
      200,
    );
    expect(await (await member.get(personal)).json()).toEqual({ menuLabel: "email" });
    expect(await (await admin.get(personal)).json()).toEqual({ menuLabel: "name" });
    expect(
      (
        await member.put(personal, {
          headers,
          data: { menuLabel: "email", userId: adminAccount.id },
        })
      ).status(),
    ).toBe(400);
    const directory = `${rest}/admin/settings/directory`;
    expect((await member.get(directory)).status()).toBe(403);
    expect((await member.put(directory, { headers, data: { pageSize: 1 } })).status()).toBe(403);
    await assignAdminRole(adminAccount.id);

    const { cookies } = await admin.storageState();
    const adminClient = createApiClient(origin, {
      headers: {
        ...headers,
        Cookie: cookies.map(({ name, value }) => `${name}=${value}`).join("; "),
      },
    });
    expect(await adminClient.accounts.me.get()).toMatchObject({
      ...adminAccount,
      role: "admin",
      permissions: ["account.read", "accounts.read", "accounts.roles.update", "settings.manage"],
    });
    expect(await adminClient.admin.settings.directory.get()).toEqual({ pageSize: 25 });
    await adminClient.admin.settings.directory.update({ pageSize: 1 });
    expect((await adminClient.admin.accounts.list({})).items).toHaveLength(1);
    await adminClient.admin.settings.directory.update({ pageSize: 25 });
    const firstPage = await admin.get(`${accounts}?limit=1`);
    expect(firstPage.status(), await firstPage.text()).toBe(200);
    const { items, nextCursor } = await firstPage.json();
    expect(items).toHaveLength(1);
    expect(nextCursor).toBe(items[0].id);
    const secondPage = await adminClient.admin.accounts.list({ cursor: nextCursor, limit: 1 });
    expect(secondPage.items).toHaveLength(1);
    expect(secondPage.items[0]?.id).not.toBe(nextCursor);
    expect((await admin.get(`${accounts}?limit=0`)).status()).toBe(400);
    const query = `  ${directoryName.toUpperCase()}  `;
    const filtered = await adminClient.admin.accounts.list({ query, limit: 1 });
    expect(filtered.items).toHaveLength(1);
    expect(filtered.nextCursor).toBe(filtered.items[0]!.id);
    const last = await adminClient.admin.accounts.list({
      query,
      limit: 1,
      cursor: filtered.nextCursor!,
    });
    expect(last.items).toHaveLength(1);
    expect(last.nextCursor).toBeNull();
    expect([filtered.items[0]!.id, last.items[0]!.id]).toEqual(
      [adminAccount.id, memberAccount.id].sort(),
    );
    for (const text of [memberAccount.email.toUpperCase(), "%", "_", "\\"]) {
      const response = await admin.get(accounts, { params: { query: text } });
      expect(await response.json()).toEqual({
        items: [{ ...memberAccount, role: "member" }],
        nextCursor: null,
      });
    }
    expect((await admin.get(accounts, { params: { query: "x".repeat(129) } })).status()).toBe(400);

    const promote = { role: "admin" };
    const crossOrigin = await admin.put(roleUrl(memberAccount.id), {
      headers: { Origin: "https://untrusted.example" },
      data: promote,
    });
    expect(crossOrigin.status()).toBe(403);
    expect((await admin.put(roleUrl(memberAccount.id), { data: promote })).status()).toBe(403);
    expect(
      (await admin.put(roleUrl(adminAccount.id), { headers, data: { role: "member" } })).status(),
    ).toBe(403);
    expect((await admin.put(roleUrl(randomUUID()), { headers, data: promote })).status()).toBe(404);
    expect(
      (await admin.put(roleUrl(memberAccount.id), { headers, data: { role: "owner" } })).status(),
    ).toBe(400);

    await expect(
      adminClient.admin.accounts.role.update({ id: memberAccount.id, role: "admin" }),
    ).resolves.toEqual({
      ...memberAccount,
      role: "admin",
    });
    expect((await member.get(accounts)).status()).toBe(200);
    expect(
      (await admin.put(roleUrl(memberAccount.id), { headers, data: { role: "member" } })).status(),
    ).toBe(200);
    expect((await member.get(accounts)).status()).toBe(403);

    expect((await admin.put(roleUrl(memberAccount.id), { headers, data: promote })).status()).toBe(
      200,
    );
    const competingDemotions = await Promise.all([
      admin.put(roleUrl(memberAccount.id), { headers, data: { role: "member" } }),
      member.put(roleUrl(adminAccount.id), { headers, data: { role: "member" } }),
    ]);
    expect(competingDemotions.map((response) => response.status()).sort()).toEqual([200, 403]);
  } finally {
    await member.dispose();
  }
});

test("administration can retry an unavailable account without exposing its links", async ({
  page,
}) => {
  await page.context().addCookies((await firstAdmin.storageState()).cookies);
  await page.route("**/rpc/auth/session/get", (route) => route.abort(), { times: 1 });
  await page.goto(`${origin}/admin`);
  await expect(page.getByRole("alert")).toHaveText("Unable to load your account.");
  await expect(page.getByRole("link", { name: "Manage accounts" })).toHaveCount(0);
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByRole("link", { name: "Manage accounts" })).toBeVisible();
  await expect(page).toHaveURL(`${origin}/admin`);
  const nav = page.getByRole("navigation", { name: "Workspace" });
  await expect(nav.getByRole("link", { name: "Administration" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(nav.getByRole("link", { name: "Local runs" })).toHaveCount(0);
  await page.getByRole("link", { name: "Manage accounts" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Accounts" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Administration" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await nav.getByRole("link", { name: "Settings" }).click();
  await expect(nav.getByRole("link", { name: "Settings" })).toHaveAttribute("aria-current", "page");
});

test("the browser resolves guest and signed-in sessions without a separate account request", async ({
  page,
}) => {
  const accountRequests: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname === "/rpc/accounts/me/get")
      accountRequests.push(request.url());
  });
  const [sessionResponse] = await Promise.all([
    page.waitForResponse("**/rpc/auth/session/get"),
    page.goto(`${origin}/sign-in`),
  ]);
  expect(sessionResponse.status()).toBe(200);
  expect(await sessionResponse.json()).toEqual({ json: null });
  await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeEnabled();

  await page.context().addCookies((await firstAdmin.storageState()).cookies);
  const [signedInResponse] = await Promise.all([
    page.waitForResponse("**/rpc/auth/session/get"),
    page.reload(),
  ]);
  expect(signedInResponse.status()).toBe(200);
  expect(await signedInResponse.json()).toMatchObject({
    json: { account: { role: "admin", permissions: expect.arrayContaining(["accounts.read"]) } },
  });
  await expect(page.getByRole("button", { name: "Account menu" })).toBeVisible();
  expect(accountRequests).toEqual([]);

  await page.route(
    "**/rpc/auth/session/get",
    async (route) => {
      const response = await route.fetch();
      const {
        json: { user, session },
      } = await response.json();
      await route.fulfill({ response, json: { json: { user, session } } });
    },
    { times: 1 },
  );
  await page.goto(`${origin}/admin`);
  await expect(page.getByRole("alert")).toHaveText("Unable to load your account.");
  expect(accountRequests).toEqual([]);
});

test("account management recovers from sign-in and permission changes in the browser", async ({
  page,
  request: backupAdmin,
  playwright,
}) => {
  const headers = { Origin: origin };
  const adminUrl = `${origin}/admin/accounts`;
  const email = `browser-${randomUUID()}@example.com`;
  const name = "Browser Administrator";
  const targetName = "Browser Member";
  const password = "kipivo-test-password-123";
  const target = await playwright.request.newContext();

  async function register(request: APIRequestContext, name: string) {
    const response = await request.post(`${origin}/api/auth/sign-up/email`, {
      headers: { ...headers, "X-Forwarded-For": "198.51.100.20" },
      data: { name, email: `seed-${randomUUID()}@example.com`, password },
    });
    expect(response.status(), await response.text()).toBe(200);
    const { user } = (await response.json()) as { user: { id: string } };
    return user.id;
  }

  try {
    await page.setViewportSize({ width: 390, height: 844 });
    const landingUrl = `${origin}/admin`;
    await page.goto(landingUrl);
    await expect(page).toHaveURL(
      (url) => url.pathname === "/sign-in" && url.searchParams.get("next") === "/admin",
    );
    await page.getByRole("link", { name: "Create an account" }).click();
    await expect(page).toHaveURL(
      (url) => url.pathname === "/sign-up" && url.searchParams.get("next") === "/admin",
    );
    await page.getByLabel("Name", { exact: true }).fill(name);
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Create account", exact: true }).click();
    await expect(page).toHaveURL(landingUrl);
    await expect(
      page.getByRole("heading", { name: "Administrator access required" }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Manage accounts" })).toHaveCount(0);
    await page.goto(adminUrl);
    await expect(
      page.getByRole("heading", { name: "Administrator access required" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Account menu" }).click();
    await expect(page.getByRole("menu").getByText("Member", { exact: true })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: "Administration" })).toHaveCount(0);

    const me = await page.request.get(`${origin}/api/v1/accounts/me`);
    expect(me.status()).toBe(200);
    const { id } = (await me.json()) as { id: string };
    await assignAdminRole(id);
    await assignAdminRole(await register(backupAdmin, "Backup Administrator"));
    await register(target, targetName);

    await page.getByRole("menuitem", { name: "Settings", exact: true }).click();
    const menuLabel = page.getByRole("combobox", { name: "Show in account menu" });
    await expect(menuLabel).toHaveJSProperty("tagName", "BUTTON");
    await menuLabel.click();
    const options = page.getByRole("listbox");
    await expect(options).toBeVisible();
    await expect(async () => {
      const trigger = await menuLabel.boundingBox();
      const list = await options.boundingBox();
      expect(list!.y).toBeGreaterThanOrEqual(trigger!.y + trigger!.height);
    }).toPass();
    await options.getByRole("option", { name: "Email address" }).click();
    await page.getByRole("button", { name: "Save changes" }).first().click();
    await expect(page.getByRole("status").filter({ hasText: "Changes saved." })).toBeVisible();
    await page.reload();
    await expect(menuLabel).toHaveText("Email address");
    await expect(page.getByLabel("Accounts per page")).toHaveValue("25");
    await page.getByRole("button", { name: "Account menu" }).click();
    await page.getByRole("menuitem", { name: "Sign out" }).click();
    await expect(page).toHaveURL(`${origin}/`);
    await page.getByRole("link", { name: "Sign in" }).click();
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.route(
      "**/api/auth/sign-in/email",
      async (route) => {
        const response = await route.fetch({
          headers: {
            ...route.request().headers(),
            origin: "http://localhost:4383",
            "x-forwarded-for": "198.51.100.74",
          },
        });
        expect(response.status()).toBe(403);
        await route.fulfill({ response });
      },
      { times: 1 },
    );
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page.getByRole("alert")).toHaveText(
      "This request was blocked. Check the Kipivo web address and try again.",
    );
    await page.getByLabel("Password", { exact: true }).fill("wrong-password-123");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page.getByRole("alert")).toHaveText("The email or password is incorrect.");
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(`${origin}/`);
    await page.getByRole("button", { name: "Account menu" }).click();
    await page.getByRole("menuitem", { name: "Administration" }).click();
    await expect(page).toHaveURL(landingUrl);
    await expect(page.getByRole("heading", { name: "Administration", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Open settings" })).toBeVisible();
    await page.getByRole("link", { name: "Manage accounts" }).click();
    await expect(page).toHaveURL(adminUrl);
    await expect(page.getByRole("heading", { name: "Accounts" })).toBeVisible();

    const ownRow = page.getByRole("listitem").filter({ hasText: email });
    await expect(ownRow.getByText("You", { exact: true })).toBeVisible();
    await expect(ownRow.getByRole("button", { name: /Change role/ })).toHaveCount(0);
    const targetRow = page.getByRole("listitem").filter({ hasText: targetName });
    const search = page.getByLabel("Search by name or email");
    await search.fill("no-such-account@example.invalid");
    await search.press("Enter");
    await expect(page.getByText("No accounts match your search.")).toBeVisible();
    await page.getByRole("button", { name: "Clear", exact: true }).click();
    await expect(ownRow).toBeVisible();
    await search.fill(targetName.toLowerCase());
    await search.press("Enter");
    await expect(targetRow).toBeVisible();
    await expect(ownRow).toHaveCount(0);
    const edit = targetRow.getByRole("button", { name: `Change role for ${targetName}` });
    await edit.click();
    const dialog = page.getByRole("dialog", { name: "Change account role" });
    await expect(dialog.getByText("Permissions added")).toBeVisible();
    await expect(dialog.getByText("Change account roles")).toBeVisible();
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(targetRow.getByText("Member", { exact: true })).toBeVisible();
    await edit.click();
    await dialog.getByRole("button", { name: "Make administrator" }).click();
    await expect(targetRow.getByText("Administrator", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("status").filter({ hasText: `${targetName} is now an administrator.` }),
    ).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);

    await edit.click();
    expect(
      (await page.request.post(`${origin}/api/auth/sign-out`, { headers, data: {} })).status(),
    ).toBe(200);
    await dialog.getByRole("button", { name: "Make member" }).click();
    await expect(page).toHaveURL(/\/sign-in\?next=/);
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(adminUrl);
    await expect(targetRow.getByText("Administrator", { exact: true })).toBeVisible();

    await edit.click();
    await expect(dialog.getByText("Permissions removed")).toBeVisible();
    const demotion = await backupAdmin.put(`${origin}/api/v1/admin/accounts/${id}/role`, {
      headers,
      data: { role: "member" },
    });
    expect(demotion.status(), await demotion.text()).toBe(200);
    await dialog.getByRole("button", { name: "Make member" }).click();
    await expect(page.getByRole("alert")).toContainText("Your permissions changed.");
    await expect(page.getByRole("list", { name: "Accounts" })).toHaveCount(0);
    await page.getByRole("button", { name: "Account menu" }).click();
    await expect(page.getByRole("menuitem", { name: "Administration" })).toHaveCount(0);
    expect(await (await target.get(`${origin}/api/v1/accounts/me`)).json()).toMatchObject({
      role: "admin",
    });
  } finally {
    await target.dispose();
  }
});

const nativeProof = () => {
  const verifier = randomBytes(32).toString("base64url");
  return { verifier, challenge: createHash("sha256").update(verifier).digest("base64url") };
};

test("native authorization requires Web consent and exchanges a client-bound proof once", async ({
  page,
  request,
}) => {
  const { verifier, challenge } = nativeProof();
  const flow = {
    client_id: "expo",
    state: randomUUID(),
    code_challenge: challenge,
    code_challenge_method: "S256",
  };
  const email = `mobile-${randomUUID()}@example.com`;
  await page.setExtraHTTPHeaders({ "X-Forwarded-For": "198.51.100.73" });
  await page.goto(`${origin}/authorize?${new URLSearchParams(flow)}`);
  await page.getByRole("link", { name: "Create an account" }).click();
  await page.getByLabel("Name", { exact: true }).fill("Mobile tester");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(randomUUID());
  await page.getByRole("button", { name: "Create account", exact: true }).click();
  await expect(page.getByText(email, { exact: true })).toBeVisible();
  const authorize = page.waitForResponse((response) =>
    response.url().endsWith("/api/auth/native/authorize"),
  );
  await page.getByRole("button", { name: "Authorize app" }).click();
  const response = await authorize;
  expect(response.status(), await response.text()).toBe(200);
  const callback = new URL((await response.json()).callback);
  expect(`${callback.protocol}//${callback.host}${callback.pathname}`).toBe(
    "kipivo://auth/callback",
  );
  expect([...callback.searchParams.keys()].sort()).toEqual(["code", "state"]);
  expect(callback.searchParams.get("state")).toBe(flow.state);
  const exchange = (data: Record<string, string>, headers?: Record<string, string>) =>
    request.post(`${origin}/api/auth/native/exchange`, { data, headers });
  const body = {
    client_id: "expo",
    code: callback.searchParams.get("code")!,
    code_verifier: verifier,
  };
  expect((await exchange(body, { Origin: origin })).status()).toBe(403);
  expect((await exchange({ ...body, client_id: "desktop" })).status()).toBe(400);
  expect((await exchange({ ...body, code_verifier: nativeProof().verifier })).status()).toBe(400);
  const results = await Promise.all([exchange(body), exchange(body)]);
  expect(results.map((r) => r.status()).sort()).toEqual([200, 400]);
  expect(await (await request.get(`${origin}/api/v1/accounts/me`)).json()).toMatchObject({ email });
  expect(
    (
      await request.post(`${origin}/api/auth/sign-out`, { data: {}, headers: { Origin: origin } })
    ).status(),
  ).toBe(200);
  expect((await request.get(`${origin}/api/v1/accounts/me`)).status()).toBe(401);
  expect((await page.request.get(`${origin}/api/v1/accounts/me`)).status()).toBe(200);
});

test("desktop authorization pins its callback and rejects expired grants", async ({ request }) => {
  const { verifier, challenge } = nativeProof();
  const account = await (await firstAdmin.get("/api/v1/accounts/me")).json();
  const body = {
    client_id: "desktop",
    code_challenge: challenge,
    code_challenge_method: "S256",
    state: randomUUID(),
    account_id: account.id,
  };
  const path = "/api/auth/native/authorize";
  expect(
    (await request.post(`${origin}${path}`, { data: body, headers: { Origin: origin } })).status(),
  ).toBe(401);
  expect(
    (
      await firstAdmin.post(path, { data: body, headers: { Origin: "https://wrong.example" } })
    ).status(),
  ).toBe(403);
  for (const invalid of [
    { client_id: "unknown" },
    { code_challenge_method: "plain" },
    { redirect_uri: "https://wrong.example" },
  ]) {
    expect((await firstAdmin.post(path, { data: { ...body, ...invalid } })).ok()).toBe(false);
  }
  const issued = await firstAdmin.post(path, { data: body });
  expect(issued.status(), await issued.text()).toBe(200);
  const callback = new URL((await issued.json()).callback);
  expect(`${callback.protocol}//${callback.host}${callback.pathname}`).toBe(
    "kipivo-desktop://auth/callback",
  );
  const sql = postgres(database.url, { max: 1 });
  try {
    const updated =
      await sql`UPDATE auth_verification SET expires_at = now() - interval '1 second' WHERE identifier LIKE ${`native-login:desktop:%:${challenge}`}`;
    expect(updated.count).toBe(1);
  } finally {
    await sql.end();
  }
  expect(
    (
      await request.post(`${origin}/api/auth/native/exchange`, {
        data: {
          client_id: "desktop",
          code: callback.searchParams.get("code"),
          code_verifier: verifier,
        },
      })
    ).status(),
  ).toBe(400);
  expect((await request.get(`${origin}/api/v1/accounts/me`)).status()).toBe(401);
});

test("email code, sign-in link, and password recovery work through their Web pages", async ({
  page,
  request,
}) => {
  const path = "/api/v1/admin/settings/email";
  const key = randomUUID();
  expect(await (await firstAdmin.get(path)).json()).toEqual({
    enabled: false,
    from: null,
    hasApiKey: false,
  });
  expect(
    (
      await firstAdmin.put(path, { data: { enabled: true, from: "accounts@example.com" } })
    ).status(),
  ).toBe(400);
  // Manage delivery through the same form an administrator would use; no API restart.
  await page.context().addCookies((await firstAdmin.storageState()).cookies);
  await page.goto(`${origin}/settings`);
  const mailForm = page
    .locator("form")
    .filter({ has: page.getByRole("heading", { name: "Email delivery" }) });
  await mailForm.getByLabel("Sender email").fill("accounts@example.com");
  await mailForm.getByLabel("Resend API key").fill(key);
  await mailForm.getByLabel("Enable email delivery").check();
  await mailForm.getByRole("button", { name: "Save changes" }).click();
  await expect(mailForm.getByRole("status")).toHaveText("Changes saved.");
  await expect(mailForm.getByLabel("Resend API key")).toHaveValue("");
  expect(await (await firstAdmin.get(path)).json()).toEqual({
    enabled: true,
    from: "accounts@example.com",
    hasApiKey: true,
  });
  const sql = postgres(database.url, { max: 1 });
  try {
    const [row] = await sql`select value from config_app where key='email_delivery'`;
    expect(row?.value.sealedKey).toBeTruthy();
    expect(JSON.stringify(row)).not.toContain(key);
  } finally {
    await sql.end();
  }
  await page.context().clearCookies();
  const methods = await request.get(`${origin}/api/auth/email-methods`);
  expect(await methods.json()).toEqual({ enabled: true });
  const email = `flows-${randomUUID()}@example.com`;
  const headers = { Origin: origin, "X-Forwarded-For": "198.51.100.86" };
  await page.setExtraHTTPHeaders({ "X-Forwarded-For": "198.51.100.87" });
  expect(
    (
      await request.post(`${origin}/api/auth/sign-up/email`, {
        headers,
        data: { email, name: "Mail tester", password: randomUUID() },
      })
    ).status(),
  ).toBe(200);
  async function readMessage(subject: string) {
    const latest = async () =>
      JSON.parse(await readFile(join(inbox, "last.json"), "utf8")) as {
        to: string;
        text: string;
        subject: string;
      };
    await expect
      .poll(async () => {
        try {
          const m = await latest();
          return m.to === email && m.subject === subject;
        } catch {
          return false;
        }
      })
      .toBe(true);
    return (await latest()).text;
  }
  await page.goto(`${origin}/sign-in?next=/settings`);
  await page.getByRole("link", { name: "Sign in with an email code" }).click();
  await expect(page.getByRole("heading", { name: "Sign in with a code" })).toBeVisible();
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByRole("button", { name: "Send sign-in code" }).click();
  const otp = (await readMessage("Your Kipivo sign-in code")).match(/\b\d{6}\b/)![0];
  await page.getByLabel("Sign-in code", { exact: true }).fill(otp);
  await page.getByRole("button", { name: "Verify and sign in" }).click();
  await expect(page).toHaveURL(`${origin}/settings`);
  await page.context().clearCookies();
  await page.goto(`${origin}/magic-link?next=/settings`);
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Send sign-in link" }).click();
  const magic = (await readMessage("Sign in to Kipivo")).split("\n")[1]!;
  await page.goto(magic);
  await expect(page).toHaveURL(`${origin}/settings`);
  const beforeReset = (await page.context().cookies())
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");
  await page.goto(`${origin}/forgot-password`);
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Send reset link" }).click();
  const reset = (await readMessage("Reset your Kipivo password")).split("\n")[1]!;
  const newPassword = randomUUID();
  await page.goto(reset);
  await page.getByLabel("New password", { exact: true }).fill(newPassword);
  await page.getByLabel("Confirm new password").fill(newPassword);
  await page.getByRole("button", { name: "Update password" }).click();
  await expect(page.getByRole("heading", { name: "Password updated" })).toBeVisible();
  expect(
    (
      await request.get(`${origin}/api/v1/accounts/me`, { headers: { Cookie: beforeReset } })
    ).status(),
  ).toBe(401);
  expect(
    (
      await request.post(`${origin}/api/auth/sign-in/email`, {
        headers,
        data: { email, password: newPassword },
      })
    ).status(),
  ).toBe(200);
  expect(
    (
      await request.post(`${origin}/api/auth/reset-password`, {
        headers,
        data: { token: new URL(reset).hash.slice(1), newPassword: randomUUID() },
      })
    ).ok(),
  ).toBe(false);
  expect((await request.get(`${origin}${path}`)).status()).toBe(403);
  expect(
    (
      await request.put(`${origin}${path}`, { headers, data: { from: null, enabled: false } })
    ).status(),
  ).toBe(403);
  const disabled = await firstAdmin.put(path, {
    data: { from: "accounts@example.com", enabled: false },
  });
  expect(await disabled.json()).toMatchObject({ enabled: false, hasApiKey: true });
  expect(await (await request.get(`${origin}/api/auth/email-methods`)).json()).toEqual({
    enabled: false,
  });
  expect(
    (
      await request.post(`${origin}/api/auth/sign-in/magic-link`, { headers, data: { email } })
    ).status(),
  ).toBe(503);
  const cleared = await firstAdmin.put(path, {
    data: { enabled: false, from: null, apiKey: null },
  });
  expect(await cleared.json()).toEqual({ enabled: false, from: null, hasApiKey: false });
});

test("workbench sign-in returns to a separate account board", async ({ page }) => {
  await page.goto(`${origin}/workbench`);
  await page.getByRole("button", { name: "New task", exact: true }).click();
  await page.getByLabel("Title", { exact: true }).fill("Guest draft");
  await page.getByRole("button", { name: "Create task", exact: true }).click();
  await expect(page.getByRole("button", { name: "Guest draft" })).toBeVisible();
  await page.getByRole("link", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(
    (url) => url.pathname === "/sign-in" && url.searchParams.get("next") === "/workbench",
  );
  // Reuse the fixture session instead of consuming the suite's shared sign-up rate limit.
  await page.context().addCookies((await firstAdmin.storageState()).cookies);
  await page.reload();
  await expect(page).toHaveURL(`${origin}/workbench`);
  await expect(page.getByRole("button", { name: "Account menu" })).toBeVisible();
  await expect(page.getByRole("button", { name: "New task", exact: true })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Guest draft" })).toHaveCount(0);
  await expect(
    page
      .getByRole("navigation", { name: "Workspace", exact: true })
      .getByRole("link", { name: "Administration" }),
  ).toBeVisible();
});

for (const [provider, name, authorizeURL, authPage] of [
  ["google", "Google", "https://accounts.google.com/o/oauth2/v2/auth", "/sign-in"],
  ["github", "GitHub", "https://github.com/login/oauth/authorize", "/sign-up"],
] as const) {
  test(`${name} returns to the requested page with a member session`, async ({ page }) => {
    await page.addInitScript(() => {
      Reflect.deleteProperty(URL, "parse");
    });
    // Exercise two attempts per provider without sharing one test client's rate-limit bucket.
    await page.setExtraHTTPHeaders({
      "X-Forwarded-For": provider === "google" ? "198.51.100.75" : "198.51.100.76",
    });
    let cancel = true;
    await page.route(`${authorizeURL}?**`, async (route) => {
      const { searchParams } = new URL(route.request().url());
      const callback = new URL(searchParams.get("redirect_uri")!);
      expect(callback.href).toBe(`${origin}/api/auth/callback/${provider}`);
      expect(searchParams.get("client_id")).toBe(`test-${provider}`);
      expect(searchParams.get("code_challenge_method")).toBe("S256");
      callback.searchParams.set("state", searchParams.get("state")!);
      callback.searchParams.set(cancel ? "error" : "code", cancel ? "access_denied" : "test-code");
      await route.fulfill({ status: 302, headers: { location: callback.href } });
    });

    await page.goto(`${origin}${authPage}?next=/settings`);
    expect(await page.evaluate(() => typeof URL.parse)).toBe("undefined");
    const button = page.getByRole("button", { name: `Continue with ${name}` });
    await button.click();
    await expect(page.getByRole("alert")).toContainText("Authorization was canceled");
    await expect(page).toHaveURL(
      (url) => url.pathname === authPage && url.searchParams.get("next") === "/settings",
    );
    cancel = false;
    await button.click();
    await expect(page).toHaveURL(`${origin}/settings`);
    expect(await (await page.request.get(`${origin}/api/v1/accounts/me`)).json()).toMatchObject({
      email: `${provider}-oauth@example.com`,
      role: "member",
    });
  });
}
