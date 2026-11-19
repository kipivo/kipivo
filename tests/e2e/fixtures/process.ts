import { spawn } from "node:child_process";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

export const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));

export function launch(args: string[], cwd: string, env: NodeJS.ProcessEnv = {}) {
  const child = spawn("bun", args, {
    cwd,
    env: { ...process.env, ...env },
    detached: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  let exited = false;
  for (const stream of [child.stdout, child.stderr]) {
    stream.setEncoding("utf8").on("data", (text: string) => {
      output = (output + text).slice(-16_000);
    });
  }
  const done = new Promise<number | null>((resolve) => {
    child.once("error", (error) => {
      output += error.message;
      exited = true;
      resolve(null);
    });
    child.once("close", (code) => {
      exited = true;
      resolve(code);
    });
  });

  function signal(signal: NodeJS.Signals) {
    if (!child.pid) return;
    try {
      process.kill(-child.pid, signal);
    } catch (error) {
      if (!(error instanceof Error) || !("code" in error) || error.code !== "ESRCH") throw error;
    }
  }

  return {
    get output() {
      return output;
    },
    async waitForExit() {
      const code = await Promise.race([
        done,
        delay(10_000, undefined, { ref: false }).then(() => {
          throw new Error(`Process did not exit\n${output}`);
        }),
      ]);
      return { code, output };
    },
    async waitFor(ready: () => Promise<boolean>) {
      const deadline = Date.now() + 25_000;
      while (!exited && Date.now() < deadline) {
        if (await ready().catch(() => false)) return;
        await delay(100);
      }
      throw new Error(`Process not ready: bun ${args.join(" ")}\n${output}`);
    },
    async stop() {
      if (!exited) {
        signal("SIGTERM");
        await Promise.race([done, delay(6000, undefined, { ref: false })]);
        if (!exited) signal("SIGKILL");
      }
      await done;
    },
  };
}

export function launchBuiltApi(port: number, env: NodeJS.ProcessEnv = {}, preload?: string) {
  return launch(
    ["--no-env-file", ...(preload ? ["--preload", preload] : []), ".output/server/index.mjs"],
    join(repoRoot, "apps/api"),
    {
      NODE_ENV: "production",
      PORT: String(port),
      HOST: "127.0.0.1",
      NITRO_PORT: String(port),
      NITRO_HOST: "127.0.0.1",
      NITRO_SSL_CERT: "",
      NITRO_SSL_KEY: "",
      NITRO_UNIX_SOCKET: "",
      DATABASE_URL: "",
      DB_MIGRATE_ON_START: "",
      BETTER_AUTH_URL: "",
      BETTER_AUTH_SECRET: "",
      GOOGLE_CLIENT_ID: "",
      GOOGLE_CLIENT_SECRET: "",
      GITHUB_CLIENT_ID: "",
      GITHUB_CLIENT_SECRET: "",
      REDIS_URL: "",
      S3_ENDPOINT: "",
      S3_BUCKET: "",
      S3_REGION: "",
      S3_ACCESS_KEY_ID: "",
      S3_SECRET_ACCESS_KEY: "",
      ...env,
    },
  );
}

export async function healthy(origin: string) {
  return (await fetch(`${origin}/healthz`, { signal: AbortSignal.timeout(1000) })).ok;
}
