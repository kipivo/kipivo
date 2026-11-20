import type { Cache } from "@kipivo/cache/factory";
import { createHmac } from "node:crypto";

type ReadStatus = () => Promise<boolean | undefined>;

// A cache lookup must leave time for Postgres inside the Web guard's request deadline.
async function bestEffort<T>(operation: () => Promise<T>) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation(),
      new Promise<undefined>((resolve) => {
        timer = globalThis.setTimeout(() => resolve(undefined), 100);
      }),
    ]);
  } catch {
    return undefined;
  } finally {
    clearTimeout(timer);
  }
}

export function cachedInstallStatus(
  read: ReadStatus,
  cache: Pick<Cache, "getJson" | "setJson"> | null,
  databaseUrl: string,
  authSecret: string,
): ReadStatus {
  if (!cache) return read;
  // Installations sharing Redis must not share state. Never put a DSN or credential in a key.
  const namespace = createHmac("sha256", authSecret).update(databaseUrl).digest("hex");
  const key = `setup:v1:${namespace}`;
  return async () => {
    if ((await bestEffort(() => cache.getJson<unknown>(key))) === "closed") return false;
    const open = await read();
    // Never cache a pending or missing row: the first read after a commit must see closure.
    if (open === false) await bestEffort(() => cache.setJson(key, "closed", 60));
    return open;
  };
}
