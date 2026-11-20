import { createEmailRepository } from "@kipivo/db/email";
import { sessionCookiePrefix } from "@kipivo/auth/env";
import { createAuth } from "@kipivo/auth/factory";
import { createRequestIdentity } from "@kipivo/auth/session";
import { createCache } from "@kipivo/cache/factory";
import { createAccessService, createCurrentAccountQuery } from "@kipivo/core/access";
import { createDatabase } from "@kipivo/db/factory";
import { createObjectStorage } from "@kipivo/storage/factory";
import { createApp } from "../app";
import type { ResourceConfig } from "../env";
import type { AppServices } from "./services";
import { cachedInstallStatus } from "./setup-status";

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

    const cache = redisUrl ? createCache(redisUrl) : null;
    if (cache) closers.push(() => cache.close());

    const storage = storageConfig ? createObjectStorage(storageConfig) : null;
    if (storage) closers.push(() => storage.dispose());

    const services: AppServices = {
      ready: database ? () => database.ready() : undefined,
      trustProxy: config.trustProxy,
    };
    if (database && databaseUrl && authSettings) {
      const auth = createAuth({ database: database.db, ...authSettings });
      const { repositories } = database;
      await repositories.setup.initialize();
      const accounts = createAccessService(repositories.accounts);

      services.authentication = {
        handle: (request) => auth.handler(request),
        identify: (headers, outgoing) => createRequestIdentity(auth, headers, outgoing),
        trustedOrigins: authSettings.trustedOrigins,
        cookiePrefix: sessionCookiePrefix(authSettings.cookieDomain),
      };
      services.procedures = {
        accounts,
        currentAccount: createCurrentAccountQuery(accounts, repositories.settings),
        settings: repositories.settings,
        email: createEmailRepository(database.db, authSettings.secret),
        setup: {
          isOpen: cachedInstallStatus(
            repositories.setup.isOpen,
            cache,
            databaseUrl,
            authSettings.secret,
          ),
          install: ({ name, email, password }) =>
            repositories.setup.install({ name, email }, async () =>
              (await auth.$context).password.hash(password),
            ),
        },
      };
    }
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
