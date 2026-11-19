import { Database } from "bun:sqlite";
import { randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { runnerHome } from "@kipivo/runtime/local/connection";
import { runId, submitCheck } from "@kipivo/contracts/runs";
import { startCheckRun } from "./check-run";
import { openRunStore } from "./store";

const host = "127.0.0.1";
const json = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { "Cache-Control": "no-store" } });

function assertKipivoRoot(repo: string) {
  try {
    const manifest = JSON.parse(readFileSync(join(repo, "package.json"), "utf8"));
    const packages = Array.isArray(manifest.workspaces)
      ? manifest.workspaces
      : manifest.workspaces?.packages;
    if (
      manifest.name === "kipivo" &&
      Array.isArray(packages) &&
      packages.includes("apps/*") &&
      typeof manifest.scripts?.check === "string" &&
      existsSync(join(repo, "apps/web/package.json"))
    )
      return;
  } catch {
    // A missing or invalid manifest cannot be a Kipivo workspace.
  }
  throw new Error("Run kipivo serve from the root of a trusted Kipivo checkout.");
}

export function startRunner({
  repo = process.cwd(),
  home = runnerHome(),
  port = 4310,
  timeoutMs = 5 * 60 * 1000,
} = {}) {
  if (process.platform !== "darwin" && process.platform !== "linux") {
    throw new Error("The local runner supports macOS and Linux.");
  }
  assertKipivoRoot(repo);
  mkdirSync(home, { mode: 0o700, recursive: true });
  const state = lstatSync(home);
  if (!state.isDirectory() || (state.mode & 0o077) !== 0) {
    throw new Error("KIPIVO_HOME must be a private directory with permissions 0700.");
  }
  // A separate SQLite lock keeps two runners from sharing the same state, even on different ports.
  const lock = new Database(join(home, "runner.lock.sqlite"));
  try {
    lock.exec("BEGIN IMMEDIATE");
  } catch {
    lock.close();
    throw new Error("A Kipivo runner is already using this state directory.");
  }
  const connectionFile = join(home, "runner.json");
  const token = randomBytes(32).toString("hex");
  const expectedAuth = Buffer.from(`Bearer ${token}`);
  let active: ReturnType<typeof startCheckRun> | undefined;
  let closing: Promise<void> | undefined;
  let store: ReturnType<typeof openRunStore> | undefined;
  let server: ReturnType<typeof Bun.serve> | undefined;
  const tempConnection = join(home, `runner-${randomUUID()}.tmp`);

  try {
    const runs = (store = openRunStore(join(home, "runs.sqlite")));
    const listener = (server = Bun.serve({
      hostname: host,
      port,
      maxRequestBodySize: 4096,
      async fetch(request) {
        const url = new URL(request.url);
        if (url.hostname !== host || request.headers.get("host") !== `${host}:${listener.port}`) {
          return json({ error: "not found" }, 404);
        }
        const auth = Buffer.from(request.headers.get("authorization") ?? "");
        if (auth.length !== expectedAuth.length || !timingSafeEqual(auth, expectedAuth)) {
          return json({ error: "unauthorized" }, 401);
        }
        if (closing) return json({ error: "runner is stopping" }, 503);
        if (url.pathname === "/v1/runs") {
          if (request.method === "GET") return json(runs.list());
          if (request.method === "POST") {
            const input = await request.json().catch(() => null);
            if (!submitCheck.safeParse(input).success) return json({ error: "invalid check" }, 400);
            if (closing) return json({ error: "runner is stopping" }, 503);
            if (active) return json({ error: "a check is already running" }, 409);
            const id = runs.submit();
            try {
              const check = startCheckRun(runs, id, repo, timeoutMs);
              active = check;
              void check.done.then(() => {
                active = undefined;
              });
            } catch {
              runs.finish(id, null, "could not start bun run check");
            }
            return json({ id }, 202);
          }
        }
        if (request.method === "GET" && url.pathname.startsWith("/v1/runs/")) {
          const id = runId.safeParse(url.pathname.slice("/v1/runs/".length));
          const run = id.success ? runs.get(id.data) : null;
          if (run) return json(run);
        }
        return json({ error: "not found" }, 404);
      },
    }));
    runs.interruptUnfinished();
    writeFileSync(tempConnection, JSON.stringify({ port: listener.port, token }), {
      flag: "wx",
      mode: 0o600,
    });
    renameSync(tempConnection, connectionFile);

    return {
      port: listener.port,
      close() {
        return (closing ??= Promise.resolve().then(async () => {
          await listener.stop(true);
          try {
            active?.stop();
            await active?.done;
          } finally {
            try {
              rmSync(connectionFile, { force: true });
            } finally {
              runs.close();
              lock.close();
            }
          }
        }));
      },
    };
  } catch (cause) {
    void server?.stop(true);
    store?.close();
    lock.close();
    rmSync(tempConnection, { force: true });
    throw cause;
  }
}
