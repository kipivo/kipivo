# Kipivo documentation

## Workspace layout

| Workspace                                     | Purpose                                     |
| --------------------------------------------- | ------------------------------------------- |
| [`apps/web`](../apps/web)                     | TanStack Start web app                      |
| [`apps/api`](../apps/api)                     | Nitro, Hono, and oRPC public API            |
| [`apps/mobile`](../apps/mobile)               | Expo app for iOS and Android                |
| [`apps/cli`](../apps/cli)                     | Bun CLI with `kipivo` and `kpvo` commands   |
| [`apps/storybook`](../apps/storybook)         | Component development and browser tests     |
| [`packages/ui`](../packages/ui)               | Shared React components used by the web app |
| [`packages/api`](../packages/api)             | Public API contract and client              |
| [`packages/db`](../packages/db)               | PostgreSQL, Drizzle schema, and migrations  |
| [`packages/auth`](../packages/auth)           | Better Auth server factory                  |
| [`packages/contracts`](../packages/contracts) | Local runner contract                       |
| [`packages/tsconfig`](../packages/tsconfig)   | Shared TypeScript presets                   |
| [`tests/e2e`](../tests/e2e)                   | Playwright HTTP and browser tests           |

## Guides

- [Local development and checks](../README.md#development)
- [Architecture and local runner](architecture.md)
- [Testing and service verification](testing.md)
- [Database and authentication](auth.md)
- [Mobile development and bundle exports](../README.md#mobile)
- [Shared UI components and themes](../packages/ui/README.md)
- [Storybook and component browser tests](../apps/storybook/README.md)
- [Running and building the CLI](../README.md#cli)
- [Building and verifying the web container](../README.md#docker)
- [Deploying Web and API to Railway](../README.md#railway)
