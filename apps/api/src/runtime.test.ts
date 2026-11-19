import { createEnv, type RuntimeEnv } from "@kipivo/env";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "./app";
import { apiEnv, resolveResourceConfig } from "./env";
import { createRuntime } from "./runtime";

const factories = vi.hoisted(() => ({
  auth: vi.fn(),
  cache: vi.fn(),
  database: vi.fn(),
  storage: vi.fn(),
}));

vi.mock("./app", { spy: true });
vi.mock("@kipivo/auth/factory", () => ({ createAuth: factories.auth }));
vi.mock("@kipivo/cache/factory", () => ({ createCache: factories.cache }));
vi.mock("@kipivo/db/factory", () => ({ createDatabase: factories.database }));
vi.mock("@kipivo/storage/factory", () => ({ createObjectStorage: factories.storage }));

const configuredEnv = {
  DATABASE_URL: "postgresql://db.example/kipivo",
  BETTER_AUTH_URL: "https://app.example/",
  BETTER_AUTH_SECRET: " auth-test-secret-long-enough-for-validation ",
  REDIS_URL: "redis://cache.example",
  S3_ENDPOINT: "https://s3.example",
  S3_BUCKET: "kipivo",
  S3_REGION: "us-east-1",
  S3_ACCESS_KEY_ID: "test-key",
  S3_SECRET_ACCESS_KEY: " storage-test-secret ",
} satisfies RuntimeEnv;

async function createConfiguredRuntime(overrides: RuntimeEnv = {}) {
  const env = createEnv(apiEnv, { runtimeEnv: { ...configuredEnv, ...overrides } });
  return createRuntime(resolveResourceConfig(env));
}

const closeDatabase = vi.fn();
const closeCache = vi.fn();
const disposeStorage = vi.fn();
const db = {};

beforeEach(() => {
  vi.resetAllMocks();
  factories.database.mockReturnValue({
    db,
    repositories: { accounts: {}, setup: { initialize: vi.fn() } },
    ready: vi.fn(),
    close: closeDatabase,
  });
  factories.auth.mockReturnValue({});
  factories.cache.mockReturnValue({ close: closeCache });
  factories.storage.mockReturnValue({ dispose: disposeStorage });
});

describe("API resource lifecycle", () => {
  it("keeps optional resources disabled when their environment values are unset", async () => {
    const env = createEnv(apiEnv, {
      runtimeEnv: { DATABASE_URL: "  ", S3_BUCKET: "", REDIS_URL: " " },
    });
    const resources = await createRuntime(resolveResourceConfig(env));
    const statuses = await Promise.all(
      ["/healthz", "/readyz", "/api/auth/get-session", "/api/v1/account/me"].map(async (path) => {
        const response = await resources.fetch(new Request(`http://localhost${path}`));
        return response.status;
      }),
    );
    expect(statuses).toEqual([200, 503, 503, 503]);
    expect(factories.cache).not.toHaveBeenCalled();
    expect(factories.storage).not.toHaveBeenCalled();
    await resources.close();
  });

  it("validates authentication and storage configuration before creating clients", async () => {
    await expect(createConfiguredRuntime({ BETTER_AUTH_SECRET: " " })).rejects.toThrow(
      "Set DATABASE_URL, BETTER_AUTH_URL, and BETTER_AUTH_SECRET together.",
    );
    await expect(createConfiguredRuntime({ S3_SECRET_ACCESS_KEY: " " })).rejects.toThrow(
      "Set S3_ENDPOINT, S3_BUCKET, S3_REGION, S3_ACCESS_KEY_ID, and S3_SECRET_ACCESS_KEY together.",
    );
    await expect(
      createConfiguredRuntime({ BETTER_AUTH_URL: "https://app.example/auth" }),
    ).rejects.toThrow("BETTER_AUTH_URL must be the public Web HTTP(S) origin.");
    await expect(createConfiguredRuntime({ BETTER_AUTH_SECRET: "short" })).rejects.toThrow(
      "BETTER_AUTH_SECRET must be at least 32 characters.",
    );
    await expect(createConfiguredRuntime({ REDIS_URL: "https://cache.example" })).rejects.toThrow(
      "REDIS_URL must be a Redis TCP URL",
    );
    await expect(createConfiguredRuntime({ S3_BUCKET: "bad bucket" })).rejects.toThrow(
      "S3_BUCKET must be a valid S3 bucket name.",
    );
    expect(factories.database).not.toHaveBeenCalled();
    expect(factories.cache).not.toHaveBeenCalled();
    expect(factories.storage).not.toHaveBeenCalled();
  });

  it("normalizes the auth origin and passes the configured inputs to the factories", async () => {
    const resources = await createConfiguredRuntime();
    try {
      expect(factories.database).toHaveBeenCalledWith(configuredEnv.DATABASE_URL);
      expect(factories.auth).toHaveBeenCalledWith({
        database: db,
        baseURL: "https://app.example",
        secret: configuredEnv.BETTER_AUTH_SECRET,
      });
      expect(factories.cache).toHaveBeenCalledWith(configuredEnv.REDIS_URL);
      expect(factories.storage).toHaveBeenCalledWith({
        endpoint: configuredEnv.S3_ENDPOINT,
        bucket: configuredEnv.S3_BUCKET,
        region: configuredEnv.S3_REGION,
        accessKeyId: configuredEnv.S3_ACCESS_KEY_ID,
        secretAccessKey: configuredEnv.S3_SECRET_ACCESS_KEY,
      });
    } finally {
      await resources.close();
    }
  });

  it("closes previously created clients when resource initialization fails", async () => {
    const cause = new Error("Storage configuration rejected");
    factories.storage.mockImplementation(() => {
      throw cause;
    });

    await expect(createConfiguredRuntime()).rejects.toBe(cause);
    expect(closeDatabase).toHaveBeenCalledOnce();
    expect(closeCache).toHaveBeenCalledOnce();
    expect(disposeStorage).not.toHaveBeenCalled();
  });

  it("releases all clients if the HTTP app fails to initialize", async () => {
    const cause = new Error("HTTP app initialization failed");
    vi.mocked(createApp).mockImplementationOnce(() => {
      throw cause;
    });

    await expect(createConfiguredRuntime()).rejects.toBe(cause);
    expect(closeDatabase).toHaveBeenCalledOnce();
    expect(closeCache).toHaveBeenCalledOnce();
    expect(disposeStorage).toHaveBeenCalledOnce();
  });

  it("shares one shutdown across concurrent calls", async () => {
    const resources = await createConfiguredRuntime();
    const closing = resources.close();

    expect(resources.close()).toBe(closing);
    await closing;
    expect(closeDatabase).toHaveBeenCalledOnce();
    expect(closeCache).toHaveBeenCalledOnce();
    expect(disposeStorage).toHaveBeenCalledOnce();
  });

  it("retains the startup error when cleanup fails", async () => {
    const cause = new Error("Storage initialization failed");
    const cleanupError = new Error("Database shutdown failed");
    factories.storage.mockImplementation(() => {
      throw cause;
    });
    closeDatabase.mockRejectedValueOnce(cleanupError);

    await expect(createConfiguredRuntime()).rejects.toMatchObject({
      errors: [cause, { errors: [cleanupError] }],
    });
    expect(closeDatabase).toHaveBeenCalledOnce();
    expect(closeCache).toHaveBeenCalledOnce();
  });
});
