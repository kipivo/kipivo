import { log } from "@kipivo/logger";
import { isIP } from "node:net";
import { Redis } from "ioredis";
import { parseRedisUrl } from "./env";

export function createCache(connectionString: string) {
  const { url, username, password } = parseRedisUrl(connectionString);
  const host = url.hostname.replace(/^\[|\]$/g, "");
  const client = new Redis({
    host,
    port: url.port ? Number(url.port) : 6379,
    db: Number(url.pathname.slice(1)),
    username: username || undefined,
    password: password || undefined,
    tls: url.protocol === "rediss:" ? { servername: isIP(host) ? undefined : host } : undefined,
    keyPrefix: "kipivo:",
    lazyConnect: true,
    connectTimeout: 2_500,
    commandTimeout: 2_500,
    socketTimeout: 2_500,
    enableOfflineQueue: false,
    autoResendUnfulfilledCommands: false,
    retryStrategy: () => null,
  });
  client.on("error", () =>
    log.error({ action: "redis.connection_failed", message: "Redis connection failed." }),
  );

  let connecting: Promise<void> | undefined;
  let closed = false;

  async function connect() {
    if (closed) throw new Error("Redis cache is closed.");
    if (client.status === "ready") return;
    // Share the handshake, then allow a new attempt after a connection failure.
    connecting ??= client.connect().finally(() => {
      connecting = undefined;
    });
    await connecting;
  }

  return {
    async getJson<T>(key: string): Promise<T | null> {
      await connect();
      const value = await client.get(key);
      return value === null ? null : (JSON.parse(value) as T);
    },
    async setJson(key: string, value: unknown, ttlSeconds: number): Promise<void> {
      if (!Number.isSafeInteger(ttlSeconds) || ttlSeconds <= 0) {
        throw new Error("Redis cache TTL must be a positive safe integer in seconds.");
      }
      const json = JSON.stringify(value);
      if (json === undefined) throw new Error("Redis cache value must be JSON serializable.");
      await connect();
      await client.set(key, json, "EX", ttlSeconds);
    },
    async delete(key: string): Promise<void> {
      await connect();
      await client.del(key);
    },
    close(): void {
      if (closed) return;
      closed = true;
      client.disconnect();
    },
  };
}

export type Cache = ReturnType<typeof createCache>;
