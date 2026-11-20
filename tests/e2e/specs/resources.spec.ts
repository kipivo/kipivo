import { randomUUID } from "node:crypto";
import { createServer as createHttpServer } from "node:http";
import { createServer } from "node:net";
import { join } from "node:path";
import { createApiClient } from "@kipivo/orpc/client";
import { createCache } from "@kipivo/cache/factory";
import { createObjectStorage } from "@kipivo/storage/factory";
import type { APIRequestContext } from "@playwright/test";
import { healthy, launch, launchBuiltApi, repoRoot } from "../fixtures/process";
import { expect, test } from "../fixtures/resources";

async function availablePort() {
  const server = createServer();
  const port = await new Promise<number>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        reject(new Error("Could not reserve an API test port"));
        return;
      }
      resolve(address.port);
    });
  });
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
  return port;
}

type StorageSettings = Parameters<typeof createObjectStorage>[0];

function storageEnv(settings: StorageSettings) {
  return {
    S3_ENDPOINT: settings.endpoint,
    S3_BUCKET: settings.bucket,
    S3_REGION: settings.region,
    S3_ACCESS_KEY_ID: settings.accessKeyId,
    S3_SECRET_ACCESS_KEY: settings.secretAccessKey,
  };
}

async function expectBuiltApi(request: APIRequestContext, env?: NodeJS.ProcessEnv) {
  const port = await availablePort();
  const origin = `http://127.0.0.1:${port}`;
  const api = launchBuiltApi(port, env);
  try {
    await api.waitFor(() => healthy(origin));
    const health = await request.get(`${origin}/healthz`);
    expect(health.status()).toBe(200);
    expect(await health.text()).toBe("ok");
    expect(await createApiClient(origin).system.ping()).toEqual({ ok: true });
    expect((await request.get(`${origin}/readyz`)).status()).toBe(503);
  } finally {
    await api.stop();
  }
}

test("Redis persists JSON and returns misses after deletion and expiry", async ({ redisUrl }) => {
  const cache = createCache(redisUrl);
  const key = randomUUID();
  const payload = { enabled: false, count: 0, values: ["中文", null] };
  try {
    expect(await cache.getJson(key)).toBeNull();
    await cache.setJson(key, payload, 30);
    expect(await cache.getJson<typeof payload>(key)).toEqual(payload);
    await cache.delete(key);
    expect(await cache.getJson(key)).toBeNull();

    await cache.setJson(key, payload, 2);
    expect(await cache.getJson<typeof payload>(key)).toEqual(payload);
    await expect.poll(() => cache.getJson(key), { timeout: 5_000 }).toBeNull();
  } finally {
    await cache.close();
  }
});

test("resource factories accept explicit settings and shared instances read the environment", async ({
  redisUrl,
  objectStorageSettings,
}) => {
  const probe = launch(
    [
      "--no-env-file",
      "-e",
      `import assert from "node:assert/strict";
import { createCache } from "@kipivo/cache/factory";
import { createObjectStorage } from "@kipivo/storage/factory";

createCache(process.env.TEST_REDIS_URL).close();
assert.equal(typeof createObjectStorage, "function");
process.env.REDIS_URL = process.env.TEST_REDIS_URL;
Object.assign(process.env, JSON.parse(process.env.TEST_S3_ENV));

const { cache } = await import("@kipivo/cache");
const { storage } = await import("@kipivo/storage");
assert.ok(cache);
assert.ok(storage);
const key = crypto.randomUUID();
try {
  await cache.setJson(key, { ok: true }, 30);
  assert.deepEqual(await cache.getJson(key), { ok: true });
  const bytes = Uint8Array.of(0, 255);
  await storage.write(key, bytes);
  assert.deepEqual(await storage.read(key), bytes);
  await storage.delete(key);
} finally {
  cache.close();
  await storage.dispose();
}`,
    ],
    join(repoRoot, "tests/e2e"),
    {
      REDIS_URL: "invalid-redis-config",
      S3_ENDPOINT: "",
      S3_BUCKET: "partial-config",
      S3_REGION: "",
      S3_ACCESS_KEY_ID: "",
      S3_SECRET_ACCESS_KEY: "",
      TEST_REDIS_URL: redisUrl,
      TEST_S3_ENV: JSON.stringify(storageEnv(objectStorageSettings)),
    },
  );
  try {
    const { code, output } = await probe.waitForExit();
    expect(code, output).toBe(0);
  } finally {
    await probe.stop();
  }
});

test("S3 persists exact bytes and returns misses after deletion", async ({
  objectStorageSettings,
}) => {
  const storage = createObjectStorage(objectStorageSettings);
  const key = `e2e/${randomUUID()} 数据+%2F.bin `;
  const bytes = Uint8Array.from([0x00, 0x01, 0x7f, 0x80, 0xfe, 0xff, 0x00]);
  const buffer = Uint8Array.from([0xaa, ...bytes, 0xbb]);
  try {
    expect(await storage.read(key)).toBeNull();
    await storage.write(key, buffer.subarray(1, -1));
    expect(await storage.read(key)).toEqual(bytes);
    await storage.delete(key);
    expect(await storage.read(key)).toBeNull();
  } finally {
    await storage.dispose();
  }
});

test("disposing S3 cancels a pending read without shutting down other clients", async () => {
  let started!: () => void;
  const reading = new Promise<void>((resolve) => {
    started = resolve;
  });
  const server = createHttpServer((req, res) => {
    if (req.url?.endsWith("/slow")) {
      res.write("partial");
      started();
    } else {
      res.end("ok");
    }
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Missing test server port");
    const settings = {
      endpoint: `http://127.0.0.1:${address.port}`,
      bucket: "test",
      region: "us-east-1",
      accessKeyId: "test",
      secretAccessKey: "test",
    };
    const first = createObjectStorage(settings);
    const second = createObjectStorage(settings);
    try {
      const pending = expect(first.read("slow")).rejects.toMatchObject({ name: "AbortError" });
      await reading;
      await first.dispose();
      await pending;
      await expect(first.read("next")).rejects.toMatchObject({ name: "AbortError" });
      expect(new TextDecoder().decode((await second.read("next"))!)).toBe("ok");
    } finally {
      await Promise.all([first.dispose(), second.dispose()]);
    }
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

test("S3 rejects writes to an absent bucket", async ({ objectStorageSettings }) => {
  const storage = createObjectStorage({
    ...objectStorageSettings,
    bucket: `missing-${randomUUID()}`,
  });
  try {
    await expect(storage.write("object.bin", Uint8Array.of(1))).rejects.toThrow(/404|NoSuchBucket/);
  } finally {
    await storage.dispose();
  }
});

test("built API serves health and ping without optional resources", async ({ request }) => {
  await expectBuiltApi(request);
});

test("built API serves health and ping with only Redis", async ({ request, redisUrl }) => {
  await expectBuiltApi(request, { REDIS_URL: redisUrl });
});

test("built API serves health and ping with only S3", async ({
  request,
  objectStorageSettings,
}) => {
  await expectBuiltApi(request, storageEnv(objectStorageSettings));
});

test("built API serves health and ping with Redis and S3", async ({
  request,
  redisUrl,
  objectStorageSettings,
}) => {
  await expectBuiltApi(request, { REDIS_URL: redisUrl, ...storageEnv(objectStorageSettings) });
});

test("built API rejects partial S3 configuration at startup", async () => {
  const api = launchBuiltApi(await availablePort(), { S3_BUCKET: "kipivo-e2e" });
  try {
    const { code, output } = await api.waitForExit();
    expect(code).toBe(1);
    expect(output).toContain("S3_ENDPOINT");
    expect(output).toContain("S3_SECRET_ACCESS_KEY");
  } finally {
    await api.stop();
  }
});
