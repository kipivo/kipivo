import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { promisify } from "node:util";
import { test as base } from "@playwright/test";
import { AwsClient } from "aws4fetch";

const exec = promisify(execFile);

async function docker(args: string[], timeout = 10_000) {
  return (await exec("docker", args, { timeout })).stdout.trim();
}

async function removeContainer(name: string) {
  try {
    await docker(["rm", "--force", "--volumes", name]);
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes("No such container")) throw error;
  }
}

async function publishedPort(name: string, containerPort: number) {
  const binding = await docker(["port", name, `${containerPort}/tcp`]);
  const match = /^127\.0\.0\.1:(\d+)$/.exec(binding);
  if (!match) throw new Error(`Expected a loopback port for ${name}, received ${binding}`);
  return match[1];
}

async function waitForService(name: string, ready: () => Promise<boolean>) {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (await ready().catch(() => false)) return;
    await delay(250);
  }
  const logs = await exec("docker", ["logs", "--tail", "50", name], { timeout: 10_000 });
  throw new Error(`${name} did not become ready\n${logs.stdout}${logs.stderr}`);
}

interface ObjectStorageSettings {
  endpoint: string;
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
}

export const test = base.extend<
  {},
  { redisUrl: string; objectStorageSettings: ObjectStorageSettings }
>({
  redisUrl: [
    // eslint-disable-next-line no-empty-pattern -- Playwright parses fixture dependencies from this parameter.
    async ({}, use) => {
      const name = `kipivo-e2e-redis-${randomUUID()}`;
      try {
        await docker(
          [
            "run",
            "--detach",
            "--name",
            name,
            "--publish",
            "127.0.0.1::6379",
            "redis:8-alpine",
            "redis-server",
            "--save",
            "",
            "--appendonly",
            "no",
          ],
          300_000,
        );
        const port = await publishedPort(name, 6379);
        await waitForService(
          name,
          async () => (await docker(["exec", name, "redis-cli", "PING"])) === "PONG",
        );
        await use(`redis://127.0.0.1:${port}`);
      } finally {
        await removeContainer(name);
      }
    },
    { scope: "worker", timeout: 390_000 },
  ],
  objectStorageSettings: [
    // eslint-disable-next-line no-empty-pattern -- Playwright parses fixture dependencies from this parameter.
    async ({}, use) => {
      const name = `kipivo-e2e-rustfs-${randomUUID()}`;
      const credentials = {
        accessKeyId: "kipivo-e2e",
        secretAccessKey: randomUUID(),
      };
      const region = "us-east-1";
      const bucket = "kipivo-e2e";
      try {
        await docker(
          [
            "run",
            "--detach",
            "--name",
            name,
            "--publish",
            "127.0.0.1::9000",
            "--volume",
            "/data",
            "--env",
            `RUSTFS_ACCESS_KEY=${credentials.accessKeyId}`,
            "--env",
            `RUSTFS_SECRET_KEY=${credentials.secretAccessKey}`,
            "--env",
            "RUSTFS_CONSOLE_ENABLE=false",
            "--env",
            "RUSTFS_OBS_LOGGER_LEVEL=error",
            "rustfs/rustfs:1.0.5",
            "/data",
          ],
          300_000,
        );
        const endpoint = `http://127.0.0.1:${await publishedPort(name, 9000)}`;
        const client = new AwsClient({ ...credentials, region, service: "s3", retries: 0 });
        // RustFS can serve /health before its S3 operations are ready.
        await waitForService(name, async () => {
          const response = await client.fetch(`${endpoint}/`, {
            signal: AbortSignal.timeout(1500),
          });
          await response.text();
          return response.ok;
        });
        const response = await client.fetch(`${endpoint}/${bucket}`, {
          method: "PUT",
          signal: AbortSignal.timeout(10_000),
        });
        const responseBody = await response.text();
        if (!response.ok) {
          throw new Error(`RustFS bucket creation returned ${response.status}\n${responseBody}`);
        }
        await use({ endpoint, bucket, region, ...credentials });
      } finally {
        await removeContainer(name);
      }
    },
    { scope: "worker", timeout: 390_000 },
  ],
});

export { expect } from "@playwright/test";
