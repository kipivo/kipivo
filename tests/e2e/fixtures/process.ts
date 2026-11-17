import { spawn } from "node:child_process";
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
  const done = new Promise<void>((resolve) => {
    child.once("error", (error) => {
      output += error.message;
      exited = true;
      resolve();
    });
    child.once("close", () => {
      exited = true;
      resolve();
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

export async function healthy(origin: string) {
  return (await fetch(`${origin}/healthz`, { signal: AbortSignal.timeout(1000) })).ok;
}
