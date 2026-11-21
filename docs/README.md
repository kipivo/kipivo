# Kipivo documentation

## Guides

| Task                | Documentation                                                                                                                                                              |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Run Kipivo locally  | [Development setup](../README.md#development) · [CLI commands](../apps/docs/content/docs/local-runner.mdx) · [Run a local check](../apps/docs/content/docs/quickstart.mdx) |
| Connect a phone     | [Mobile development and workspace connection](../apps/mobile/README.md)                                                                                                    |
| Set up an instance  | [Database and authentication](auth.md) · [Administration and account directory](admin.md) · [Redis and object storage](resources.md)                                       |
| Work on the API     | [Architecture](architecture.md) · [Public API and access requirements](api.md) · [Product events in API logs](telemetry.md)                                                |
| Build an interface  | [Workspace design guide](design/README.md) · [Shared UI components and themes](../packages/ui/README.md) · [Storybook and browser tests](../apps/storybook/README.md)      |
| Contribute and test | [Commit conventions](../CONTRIBUTING.md) · [File naming](file-naming.md) · [Testing and service verification](testing.md)                                                  |
| Deploy              | [Docker](../apps/docs/content/docs/self-hosting.mdx#docker) · [Railway](../apps/docs/content/docs/self-hosting.mdx#railway)                                                |

## Workspace layout

| Workspace                                     | Purpose                                                              |
| --------------------------------------------- | -------------------------------------------------------------------- |
| [`apps/web`](../apps/web)                     | TanStack Start web app                                               |
| [`apps/api`](../apps/api)                     | Nitro, Hono, and oRPC public API                                     |
| [`apps/docs`](../apps/docs)                   | TanStack Start and Fumadocs site at `/docs`                          |
| [`apps/mobile`](../apps/mobile)               | Expo app for iOS and Android                                         |
| [`apps/cli`](../apps/cli)                     | Bun CLI with `kipivo` and `kpvo` commands                            |
| [`apps/storybook`](../apps/storybook)         | Storybook component examples and browser tests                       |
| [`packages/i18n`](../packages/i18n)           | Compiled message catalogs, Paraglide configuration and React helpers |
| [`packages/icons`](../packages/icons)         | Shared React icon components                                         |
| [`packages/ui`](../packages/ui)               | Shared React components used by the web app                          |
| [`packages/contract`](../packages/contract)   | Public RPC and REST contract                                         |
| [`packages/orpc`](../packages/orpc)           | Typed oRPC client, RPC and REST handlers, and OpenAPI                |
| [`packages/account`](../packages/account)     | Shared account profile and personal settings                         |
| [`packages/admin`](../packages/admin)         | Instance administration schemas                                      |
| [`packages/rbac`](../packages/rbac)           | Roles, permissions, and role assignment rules                        |
| [`packages/core`](../packages/core)           | Server-side account access workflows                                 |
| [`packages/db`](../packages/db)               | PostgreSQL, Drizzle schema, and migrations                           |
| [`packages/auth`](../packages/auth)           | Better Auth server factory                                           |
| [`packages/email`](../packages/email)         | Email delivery settings and Resend sender                            |
| [`packages/cache`](../packages/cache)         | Server-side Redis client                                             |
| [`packages/storage`](../packages/storage)     | Server-side S3-compatible storage                                    |
| [`packages/logger`](../packages/logger)       | Structured logging and Hono request logging                          |
| [`packages/env`](../packages/env)             | Shared Zod environment validation                                    |
| [`packages/contracts`](../packages/contracts) | Shared local runner schemas                                          |
| [`packages/runtime`](../packages/runtime)     | Server-side local runner connection and env                          |
| [`packages/tsconfig`](../packages/tsconfig)   | Shared TypeScript presets                                            |
| [`tests/e2e`](../tests/e2e)                   | Playwright HTTP and browser tests                                    |

## Proposals

- [Web internationalization](i18n.md) describes English and Simplified Chinese password sign-in.
