import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { promisify } from "node:util";
import { expect, test } from "@playwright/test";
import { healthy, launch, repoRoot } from "../fixtures/process";

const origin = "http://127.0.0.1:4383";
const apiOrigin = "http://127.0.0.1:4382";
let api: ReturnType<typeof launch> | undefined;
let web: ReturnType<typeof launch> | undefined;

test.beforeAll(async () => {
  const databaseUrl = process.env.TEST_DATABASE_URL;
  if (!databaseUrl) throw new Error("Set TEST_DATABASE_URL to a disposable PostgreSQL database.");

  await promisify(execFile)("bun", ["run", "db:migrate"], {
    cwd: repoRoot,
    env: { ...process.env, DATABASE_URL: databaseUrl },
    timeout: 20_000,
  });
  api = launch([".output/server/index.mjs"], join(repoRoot, "apps/api"), {
    PORT: "4382",
    HOST: "127.0.0.1",
    DATABASE_URL: databaseUrl,
    BETTER_AUTH_URL: origin,
    BETTER_AUTH_SECRET: "kipivo-auth-e2e-disposable-database-secret",
  });
  await api.waitFor(
    async () => (await fetch(`${apiOrigin}/readyz`, { signal: AbortSignal.timeout(2000) })).ok,
  );
  web = launch([".output/server/index.mjs"], join(repoRoot, "apps/web"), {
    PORT: "4383",
    HOST: "127.0.0.1",
    API_ORIGIN: apiOrigin,
  });
  await web.waitFor(() => healthy(origin));
});

test.afterAll(async () => {
  await web?.stop();
  await api?.stop();
});

test("email authentication persists and revokes sessions through Web", async ({ request }) => {
  const url = `${origin}/api/auth`;
  const email = `e2e-${randomUUID()}@example.com`;
  const password = "kipivo-test-password-123";
  const headers = { Origin: origin, "X-Forwarded-For": "198.51.100.10" };

  expect(await (await request.get(`${url}/get-session`)).json()).toBeNull();
  const signUp = await request.post(`${url}/sign-up/email`, {
    headers,
    data: { name: "Kipivo E2E", email, password },
  });
  expect(signUp.status(), await signUp.text()).toBe(200);
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
  expect(
    (await request.post(`${url}/sign-in/email`, { headers, data: { email, password } })).status(),
  ).toBe(200);
  expect((await (await request.get(`${url}/get-session`)).json()).user.email).toBe(email);
  expect((await request.post(`${url}/sign-out`, { headers, data: {} })).status()).toBe(200);
});
