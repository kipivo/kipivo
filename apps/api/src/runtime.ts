import { createEmailRepository } from "@kipivo/db/email";
import { createAuth } from "@kipivo/auth/factory";
import { createCache } from "@kipivo/cache/factory";
import { createAccessService } from "@kipivo/core/access";
import { createDatabase } from "@kipivo/db/factory";
import { createObjectStorage } from "@kipivo/storage/factory";
import { cachedInstallStatus } from "./install-status";
import { createApp } from "./app";
import type { ResourceConfig } from "./env";
import type { AppServices } from "./context";

type CloseResource = () => void | Promise<void>;

async function closeResources(closers: readonly CloseResource[]) {
  const results = await Promise.allSettled(closers.map((close) => Promise.resolve().then(close)));
  const errors = results.flatMap((result) => (result.status === "rejected" ? [result.reason] : []));
  if (errors.length) throw new AggregateError(errors, "API resource shutdown failed.");
}

export async function createRuntime(config: ResourceConfig) {
  const { databaseUrl, redisUrl, auth: authSettings, storage: storageConfig } = config;
  const closers: CloseResource[] = [];
  let closing: Promise<void> | undefined;
  const close = () => (closing ??= closeResources(closers));

  try {
    const database = databaseUrl ? createDatabase(databaseUrl) : null;
    if (database) closers.push(() => database.close());
    const auth =
      authSettings && database ? createAuth({ database: database.db, ...authSettings }) : undefined;

    const cache = redisUrl ? createCache(redisUrl) : null;
    if (cache) closers.push(() => cache.close());

    const storage = storageConfig ? createObjectStorage(storageConfig) : null;
    if (storage) closers.push(() => storage.dispose());

    if (database && auth) await database.repositories.setup.initialize();
    const services: AppServices = {
      handleAuth: auth ? (request) => auth.handler(request) : undefined,
      access:
        database && databaseUrl && auth && authSettings
          ? {
              accounts: createAccessService(database.repositories.accounts),
              settings: database.repositories.settings,
              email: createEmailRepository(database.db, authSettings.secret),
              setup: {
                isOpen: cachedInstallStatus(
                  database.repositories.setup.isOpen,
                  cache,
                  databaseUrl,
                  authSettings.secret,
                ),
                install: ({ name, email, password }) =>
                  database.repositories.setup.install({ name, email }, async () =>
                    (await auth.$context).password.hash(password),
                  ),
              },
              async getActorId(headers: Headers) {
                const session = await auth.api.getSession({
                  headers,
                  query: { disableRefresh: true },
                });
                return session?.user.id;
              },
              trustedOrigin: authSettings.baseURL,
            }
          : undefined,
      ready: database ? () => database.ready() : undefined,
    };
    return { fetch: createApp(services).fetch, close };
  } catch (cause) {
    try {
      await close();
    } catch (error) {
      throw new AggregateError([cause, error], "API startup and resource shutdown failed.");
    }
    throw cause;
  }
}

let runtime: ReturnType<typeof createRuntime> | undefined;

export function startRuntime(config: ResourceConfig) {
  return (runtime ??= createRuntime(config));
}

export async function closeRuntime() {
  await (await runtime)?.close();
}
