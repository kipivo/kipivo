import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { ROOT } from "../internal/root";
import { runSmoke, type RunCommand } from "../internal/smoke-process";

async function cleanResources(run: RunCommand, label: string, failed: boolean) {
  const errors: unknown[] = [];
  for (const resource of ["container", "volume", "network"]) {
    try {
      const all = resource === "container" ? ["--all"] : [];
      const { stdout } = await run(
        ["docker", resource, "ls", ...all, "--quiet", "--filter", `label=${label}`],
        {
          stdout: "pipe",
          cleanup: true,
        },
      );
      const ids = stdout.trim().split(/\s+/).filter(Boolean);
      if (!ids.length) continue;
      if (resource === "container" && failed) {
        for (const id of ids) {
          console.error(`\nLogs for ${id}`);
          await run(["docker", "logs", id], { cleanup: true }).catch(() => {});
        }
      }
      const flags = resource === "container" ? ["--force", "--volumes"] : [];
      await run(["docker", resource, "rm", ...flags, ...ids], { cleanup: true });
    } catch (error) {
      errors.push(error);
      console.error(error instanceof Error ? error.message : error);
    }
  }
  if (errors.length) throw new Error("Could not remove all API smoke resources.");
}

async function checkApiImage(run: RunCommand, signal: AbortSignal, tag?: string) {
  const docker = async (...args: string[]) =>
    (await run(["docker", ...args], { stdout: "pipe", stderr: "pipe" })).stdout.trim();
  const image = await docker(
    "image",
    "inspect",
    "--format",
    "{{.Id}}",
    "--",
    tag || "kipivo-api:ci",
  );
  const journal: { entries: unknown[] } = await Bun.file(
    join(ROOT, "packages/db/drizzle/meta/_journal.json"),
  ).json();
  assert(journal.entries.length > 0, "Expected a non-empty migration journal.");

  const label = `io.kipivo.api-image-smoke=kipivo-api-smoke-${randomUUID()}`;
  const user = "kipivo";
  const password = "kipivo_smoke";
  const database = "kipivo_image_smoke";
  const databaseUrl = `postgresql://${user}:${password}@postgres:5432/${database}`;

  async function waitFor(description: string, ready: () => Promise<boolean>) {
    const deadline = Date.now() + 60_000;
    let lastError: unknown;
    do {
      try {
        if (await ready()) return;
      } catch (error) {
        signal.throwIfAborted();
        lastError = error;
      }
      await delay(1000, undefined, { signal });
    } while (Date.now() < deadline);
    if (lastError instanceof Error) console.error(lastError.message);
    throw new Error(`Timed out waiting for ${description}`);
  }

  let failed = false;
  try {
    const network = await docker("network", "create", "--label", label, label.split("=")[1]);
    const volume = await docker("volume", "create", "--label", label);

    async function startContainer(...args: string[]) {
      const id = await docker("create", "--label", label, "--network", network, ...args);
      await docker("start", id);
      return id;
    }

    const postgres = await startContainer(
      "--network-alias",
      "postgres",
      "--env",
      `POSTGRES_USER=${user}`,
      "--env",
      `POSTGRES_PASSWORD=${password}`,
      "--env",
      `POSTGRES_DB=${database}`,
      "--mount",
      `type=volume,source=${volume},target=/var/lib/postgresql/data`,
      "postgres:17-alpine",
    );
    const sql = (query: string) =>
      docker(
        "exec",
        "--env",
        `PGPASSWORD=${password}`,
        "--env",
        "PGCONNECT_TIMEOUT=2",
        "--env",
        "PGOPTIONS=-c statement_timeout=5000",
        postgres,
        "psql",
        "-X",
        "-v",
        "ON_ERROR_STOP=1",
        "-At",
        "-h",
        "127.0.0.1",
        "-U",
        user,
        "-d",
        database,
        "-c",
        query,
      );
    await waitFor("PostgreSQL TCP query", async () => (await sql("SELECT 1")) === "1");

    const schemaState = () =>
      sql(`SELECT to_regclass('public.auth_user') IS NOT NULL,
      to_regclass('public.auth_session') IS NOT NULL,
      to_regclass('public.auth_account') IS NOT NULL,
      to_regclass('public.auth_verification') IS NOT NULL,
      to_regclass('drizzle.__drizzle_migrations') IS NOT NULL`);
    const ledger = () =>
      sql("SELECT id, hash, created_at FROM drizzle.__drizzle_migrations ORDER BY id");

    function startApi(connectionString: string, ...args: string[]) {
      return startContainer(
        "--publish",
        "127.0.0.1::8080",
        "--env",
        "PORT=8080",
        "--env",
        `DATABASE_URL=${connectionString}`,
        "--env",
        "AUTH_URL=https://kipivo.example",
        "--env",
        "AUTH_SECRET=kipivo-image-smoke-test-secret-2026",
        ...args,
        image,
      );
    }

    async function waitForExit(container: string, description: string) {
      await waitFor(description, async () => {
        const state = await docker(
          "container",
          "inspect",
          "--format",
          "{{.State.Status}}",
          container,
        );
        return state === "exited" || state === "dead";
      });
      return Number(await docker("wait", container));
    }

    async function expectStartupFailure(
      message: string,
      connectionString: string,
      ...args: string[]
    ) {
      const api = await startApi(connectionString, ...args);
      const exitCode = await waitForExit(api, `API container ${api} to exit`);
      assert.notEqual(exitCode, 0, `Expected API startup to fail with ${message}`);
      const logs = await run(["docker", "logs", api], { stdout: "pipe", stderr: "pipe" });
      assert(
        (logs.stdout + logs.stderr).includes(message),
        `Expected startup logs to include ${message}`,
      );
    }

    async function readyOrigin(api: string) {
      const origin = `http://${await docker("port", api, "8080/tcp")}`;
      async function probe(path: string) {
        const { stdout } = await run(
          [
            "curl",
            "--silent",
            "--show-error",
            "--noproxy",
            "127.0.0.1",
            "--max-time",
            "2",
            "--write-out",
            "\n%{http_code}",
            `${origin}/${path}`,
          ],
          { stdout: "pipe", stderr: "pipe" },
        );
        assert.equal(stdout, "ok\n200", `${path} must return HTTP 200 with body 'ok'`);
        return true;
      }
      await waitFor("/healthz", () => probe("healthz"));
      await probe("readyz");
      return origin;
    }

    console.log("Start the API image against an empty database without the migration switch.");
    const emptySchema = await schemaState();
    assert.equal(emptySchema, "f|f|f|f|f", "Expected an empty schema");
    const unmigrated = await startApi(databaseUrl);
    assert.notEqual(
      await waitForExit(unmigrated, "unmigrated API to fail initialization"),
      0,
      "Expected startup to fail without setup schema",
    );
    assert.equal(await schemaState(), emptySchema, "Expected the schema to remain empty");
    console.log(
      "Without migrations, setup initialization stopped startup and left the schema empty.",
    );

    console.log("Reject invalid Auth, Redis, and S3 settings before applying migrations.");
    const migrateOnStart = ["--env", "DB_MIGRATE_ON_START=true"];
    await expectStartupFailure(
      "AUTH_SECRET must be at least 32 characters.",
      databaseUrl,
      ...migrateOnStart,
      "--env",
      "AUTH_SECRET=short",
    );
    await expectStartupFailure(
      "REDIS_URL must be a Redis TCP URL",
      databaseUrl,
      ...migrateOnStart,
      "--env",
      "REDIS_URL=https://redis.example",
    );
    await expectStartupFailure(
      "S3_ENDPOINT must be an HTTP(S) URL",
      databaseUrl,
      ...migrateOnStart,
      "--env",
      "S3_ENDPOINT=ftp://s3.example",
      "--env",
      "S3_BUCKET=kipivo",
      "--env",
      "S3_REGION=us-east-1",
      "--env",
      "S3_ACCESS_KEY_ID=smoke",
      "--env",
      "S3_SECRET_ACCESS_KEY=smoke",
    );
    assert.equal(
      await schemaState(),
      emptySchema,
      "Expected invalid configuration to leave the schema empty",
    );
    console.log("The API rejected all three invalid configurations and the schema remained empty.");

    console.log("Start the API image with migrations enabled.");
    const first = await startApi(databaseUrl, ...migrateOnStart);
    await readyOrigin(first);
    assert.equal(
      await schemaState(),
      "t|t|t|t|t",
      "Expected four auth tables and the migration ledger",
    );
    const count = await sql("SELECT count(*) FROM drizzle.__drizzle_migrations");
    assert.equal(
      Number(count),
      journal.entries.length,
      "Expected the migration ledger to match the journal",
    );

    console.log("Complete first installation as a non-root API process.");
    await run([
      "docker",
      "exec",
      first,
      "bun",
      "-e",
      `
      import assert from "node:assert/strict";
      assert.notEqual(process.getuid(), 0);
      const headers = { Origin: "https://kipivo.example", "Content-Type": "application/json" };
      const body = JSON.stringify({ name: "Operator", email: "install@example.com", password: crypto.randomUUID() });
      const post = (path) => fetch(\`http://127.0.0.1:8080\${path}\`, { method: "POST", headers, body });
      assert.equal((await post("/api/v1/setup")).status, 200);
      assert.equal((await post("/api/auth/sign-in/email")).status, 200);
    `,
    ]);
    const firstLedger = await ledger();
    await docker("stop", "--time", "5", first);
    console.log(`Readiness returned 200 with all four auth tables and ${count} migration records.`);

    console.log("Start a second API container with migrations enabled against the same database.");
    const second = await startApi(databaseUrl, ...migrateOnStart);
    const origin = await readyOrigin(second);
    await run([
      "docker",
      "exec",
      second,
      "bun",
      "-e",
      `
      import assert from "node:assert/strict";
      const response = await fetch("http://127.0.0.1:8080/api/v1/setup");
      assert.deepEqual(await response.json(), { open: false });
    `,
    ]);
    assert.equal(
      await ledger(),
      firstLedger,
      "Expected the migration ledger to match the first run",
    );
    console.log("Readiness returned 200 and the migration ledger matches the first run.");
    await run(
      [process.execPath, "run", "--bun", "--cwd", "tests/e2e", "test:e2e", "--project=api"],
      {
        env: { ...process.env, E2E_API_ORIGIN: origin },
      },
    );

    console.log("Run the standalone migration command from the API image.");
    const standalone = await startContainer(
      "--env",
      `DATABASE_URL=${databaseUrl}`,
      image,
      "db:migrate",
    );
    assert.equal(
      await waitForExit(standalone, "the standalone migration command to exit"),
      0,
      "Expected standalone migration to succeed",
    );
    assert.equal(
      await ledger(),
      firstLedger,
      "Expected standalone migration to preserve the ledger",
    );

    console.log("Check that a migration connection failure stops API startup.");
    await expectStartupFailure(
      "password authentication failed",
      `postgresql://${user}:wrong_password@postgres:5432/${database}`,
      ...migrateOnStart,
    );
  } catch (error) {
    failed = true;
    throw error;
  } finally {
    // A cancelled Docker command can leave a resource whose ID was never printed.
    await cleanResources(run, label, failed || signal.aborted).catch((error: unknown) => {
      if (!failed) throw error;
    });
  }
}

export async function runApiSmoke([tag, ...extra]: string[]) {
  if (extra.length) {
    console.error("Usage: kpdev smoke api [image]");
    return 2;
  }
  return runSmoke((run, signal) => checkApiImage(run, signal, tag));
}

if (import.meta.main) process.exitCode = await runApiSmoke(process.argv.slice(2));
