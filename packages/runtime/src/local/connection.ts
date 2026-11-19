import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { z } from "zod";
import { envs } from "../env";

const connectionSchema = z.object({
  port: z.int().min(1).max(65535),
  token: z.string().regex(/^[0-9a-f]{64}$/),
});

export function runnerHome() {
  const { KIPIVO_HOME } = envs();
  return resolve(KIPIVO_HOME ?? join(homedir(), ".kipivo"));
}

export async function requestRunner(path: `/v1/runs${string}`, init?: RequestInit) {
  const connection = connectionSchema.parse(
    JSON.parse(await readFile(join(runnerHome(), "runner.json"), "utf8")),
  );
  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${connection.token}`);

  return fetch(`http://127.0.0.1:${connection.port}${path}`, {
    ...init,
    headers,
    redirect: "error",
    signal: AbortSignal.timeout(5000),
  });
}
