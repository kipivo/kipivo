import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import postgres from "postgres";
import { createTestDatabase } from "../fixtures/database";
import { healthy, launch, launchBuiltApi, repoRoot } from "../fixtures/process";

test("only one anonymous installer can create the first administrator", async ({
  page,
  request,
}) => {
  const database = await createTestDatabase();
  const db = postgres(database.url);
  const origin = "http://127.0.0.1:4386";
  const headers = { Origin: origin };
  const processes: ReturnType<typeof launch>[] = [];
  async function start(port: number) {
    const api = launchBuiltApi(port, {
      DATABASE_URL: database.url,
      DB_MIGRATE_ON_START: "true",
      BETTER_AUTH_URL: origin,
      BETTER_AUTH_SECRET: "same-secret-for-both-disposable-servers",
      GOOGLE_CLIENT_ID: "test-google",
      GOOGLE_CLIENT_SECRET: "test-google-secret",
    });
    processes.push(api);
    await api.waitFor(async () => (await fetch(`http://127.0.0.1:${port}/readyz`)).ok);
    return api;
  }
  const data = { email: "first@example.com", name: "First", password: randomUUID() };
  const install = (port: number) =>
    request.post(`http://127.0.0.1:${port}/api/v1/setup/install`, { data, headers });
  try {
    const [api] = await Promise.all([start(4385), start(4387)]);
    const web = launch([".output/server/index.mjs"], join(repoRoot, "apps/web"), {
      PORT: "4386",
      HOST: "127.0.0.1",
      API_ORIGIN: "http://127.0.0.1:4385",
    });
    processes.push(web);
    await web.waitFor(() => healthy(origin));
    expect(await (await request.get(origin + "/api/auth/email-methods")).json()).toEqual({
      enabled: false,
    });
    for (const route of [
      "/",
      "/sign-in",
      "/sign-up",
      "/magic-link",
      "/email-code",
      "/forgot-password",
      "/reset-password",
      "/workbench",
      "/settings",
      "/admin",
      "/admin/accounts",
    ]) {
      const initial = await request.get(origin + route, { maxRedirects: 0 });
      expect(initial.status()).toBe(307);
      expect(new URL(initial.headers().location!, origin).pathname).toBe("/setup");
      await page.goto(origin + route);
      await expect(page).toHaveURL(`${origin}/setup`);
    }
    expect(
      (await request.post(origin + "/api/auth/sign-up/email", { data, headers })).status(),
    ).toBe(409);
    expect(
      (
        await request.post(origin + "/api/v1/auth/sign-in/social", {
          data: { provider: "google", callbackURL: "/", errorCallbackURL: "/sign-in" },
          headers,
        })
      ).status(),
    ).toBe(409);
    expect((await request.get(origin + "/api/auth/callback/google?code=unused")).status()).toBe(
      409,
    );
    await page.getByLabel("Name", { exact: true }).fill(data.name);
    await page.getByLabel("Email").fill(data.email);
    await page.getByLabel("Password", { exact: true }).fill(data.password);
    // Race the browser's actual RPC against a REST submission on a different API replica.
    let status: number | undefined;
    await page.route("**/rpc/setup/install", async (route) => {
      const [rpc, rest] = await Promise.all([route.fetch(), install(4387)]);
      status = rest.status();
      await route.fulfill({ response: rpc });
    });
    const [rpc] = await Promise.all([
      page.waitForResponse((r) => r.url().endsWith("/rpc/setup/install")),
      page.getByRole("button", { name: "Create administrator" }).click(),
    ]);
    expect([rpc.status(), status].sort()).toEqual([200, 409]);
    await expect(page).toHaveURL(
      (url) => url.pathname === "/sign-in" && url.searchParams.get("next") === "/admin",
    );
    expect(await db`select role from auth_user`).toMatchObject([{ role: "admin" }]);
    expect(
      (await request.post(origin + "/api/auth/sign-in/email", { data, headers })).status(),
    ).toBe(200);
    await db`delete from auth_user`;
    await api.stop();
    await start(4385);
    const closed = await request.get(origin + "/setup", { maxRedirects: 0 });
    expect(closed.status()).toBe(307);
    expect(new URL(closed.headers().location!, origin).pathname).toBe("/");
    await page.goto(origin + "/setup");
    await expect(page).toHaveURL(origin + "/");
    expect((await install(4385)).status()).toBe(409);
    // A pre-existing member must not open the installer or get promoted on upgrade.
    await db`insert into auth_user(id,name,email) values ('member','Member','member@example.com')`;
    await db`update config_app set value='{"status":"pending"}' where key='admin_setup'`;
    const upgraded = await start(4388);
    expect((await install(4388)).status()).toBe(409);
    expect(await db`select role from auth_user`).toMatchObject([{ role: "member" }]);
    await db`delete from config_app where key='admin_setup'`;
    expect((await request.get("http://127.0.0.1:4388/readyz")).status()).toBe(503);
    await upgraded.stop();
  } finally {
    await Promise.all(processes.map((p) => p.stop()));
    await db.end();
    await database.drop();
  }
});
