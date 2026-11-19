# Kipivo repository instructions

Use domain directories and lowercase `kebab-case` filenames; do not repeat the enclosing domain in each filename. See the [file naming guide](docs/file-naming.md) for components, hooks, test suffixes, routes, and exceptions.

Use Conventional Commits for new commits: `type(scope): subject`, with an optional scope. Follow the [commit guide](CONTRIBUTING.md) for types, examples, and checks.

## Workspace guides

Start with the guide for the workspace you are changing. Commands in these guides run from the repository root unless noted otherwise.

- **Applications:** [Web](apps/web/AGENTS.md), [API server](apps/api/AGENTS.md), [CLI and local runner](apps/cli/AGENTS.md), [Mobile](apps/mobile/AGENTS.md), [Storybook](apps/storybook/AGENTS.md).
- **Contracts and access:** [Public API and client](packages/api/AGENTS.md), [Local run schemas](packages/contracts/AGENTS.md), [Account schemas](packages/account/AGENTS.md), [Admin directory](packages/admin/AGENTS.md), [RBAC rules](packages/rbac/AGENTS.md), [Access workflows](packages/core/AGENTS.md).
- **Server resources:** [Authentication](packages/auth/AGENTS.md), [Database](packages/db/AGENTS.md), [Redis cache](packages/cache/AGENTS.md), [Object storage](packages/storage/AGENTS.md), [Local runner connection](packages/runtime/AGENTS.md).
- **Shared foundations:** [Environment validation](packages/env/AGENTS.md), [Logging](packages/logger/AGENTS.md), [TypeScript presets](packages/tsconfig/AGENTS.md), [Web icons](packages/icons/AGENTS.md), [Web UI](packages/ui/AGENTS.md).

## Task guides

Use the directory guide for Kipivo conventions and the linked skill for framework mechanics. Follow the installed dependency versions; upstream examples are not instructions to add tools or replace the project architecture.

| Task                                             | Directory guide                                                            | Framework skill                                                                                                                                         |
| ------------------------------------------------ | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Web server function                              | [Web](apps/web/AGENTS.md)                                                  | [Start core](.agents/skills/start-core/SKILL.md), then [server functions](.agents/skills/server-functions/SKILL.md)                                     |
| React rendering or component design              | [Web](apps/web/AGENTS.md) · [Shared UI](packages/ui/README.md)             | [React performance](.agents/skills/vercel-react-best-practices/SKILL.md) · [Component composition](.agents/skills/vercel-composition-patterns/SKILL.md) |
| HTTP route or public procedure                   | [API](apps/api/AGENTS.md)                                                  | [Hono](.agents/skills/hono/SKILL.md) for the HTTP layer                                                                                                 |
| Auth configuration, sessions, or auth tables     | [Auth](packages/auth/AGENTS.md) · [Database](packages/db/AGENTS.md)        | [Better Auth](.agents/skills/better-auth-best-practices/SKILL.md) for the adapter and sessions                                                          |
| Route loaders, search params, or navigation      | [Web](apps/web/AGENTS.md)                                                  | [TanStack Router](.agents/skills/tanstack-router-best-practices/SKILL.md)                                                                               |
| Shared shadcn components                         | [Shared UI](packages/ui/README.md) · [Storybook](apps/storybook/README.md) | [shadcn](.agents/skills/shadcn/SKILL.md) with the existing `base-nova` configuration                                                                    |
| PostgreSQL schema or query changes               | [Database](packages/db/AGENTS.md)                                          | [Postgres and Drizzle](.agents/skills/postgres-drizzle/SKILL.md)                                                                                        |
| Web build configuration or Vite plugins          | [Web build config](apps/web/vite.config.ts)                                | [Vite](.agents/skills/vite/SKILL.md)                                                                                                                    |
| Task dependencies, caching, or workspace filters | Root toolchain and CI rules below                                          | [Turborepo](.agents/skills/turborepo/SKILL.md)                                                                                                          |

## Toolchain

- Use the Bun version pinned in the root `package.json` and the Node.js version in `.node-version`. Install from the repository root with `bun install --frozen-lockfile`.
- Declare dependencies in the workspace that imports them. Use `workspace:*` for local packages and `catalog:` for Zod, Vite, and Vitest. Edit their versions in the root manifest and update `bun.lock` when dependencies change.
- Use the root scripts and Turbo filters, such as `bun run build --filter=api`. Use `bun x oxfmt <paths>` to format changed files with the root Oxfmt configuration, including SVGs under `assets/`.

## Workspace boundaries

- Keep app code in `apps/<app>` and reusable code in `packages/<package>`. App package names use their directory names, with `apps/cli` named `kipivo`. The CLI exposes `kipivo` and `kpvo` and builds with tsdown.
- Import another workspace's code through its package exports. Keep single-app features in their app. Extract shared rules when a second app needs them.
- Keep Web feature code in `apps/web/src/features/<feature>/` and TanStack Start route registration and guards in `apps/web/src/routes/`. Turbo generates `apps/web/src/routeTree.gen.ts` during Web builds and type checks.
- Use `@kipivo/contracts/runs` for local run schemas. Import `@kipivo/runtime/local/connection` only in the CLI or a Web `.server.ts` module marked with `@tanstack/react-start/server-only`.
- Add Hono route groups under `apps/api/src/routes/` and mount them in `apps/api/src/app.ts`. Keep the public oRPC contract and typed client in `packages/api` and the local runner contract in `packages/contracts`. Use the existing logger adapters to carry the Hono request ID into oRPC.
- Share Web components through `@kipivo/ui` component exports. Use Tailwind utilities and the shared semantic tokens for styling. Add examples and interaction states in `apps/storybook/src/`. See the [UI guide](packages/ui/README.md) and [Storybook guide](apps/storybook/README.md).

## Environment and startup

- Put environment presets in the owning workspace's `src/env.ts`, using the package name for the preset. Apps compose presets with `extends` and read them with `createEnv(appEnv)` from `@kipivo/env`. For Web, keep server environment reads in server-only modules such as `src/env.server.ts`.
- Use the shared server packages' `/factory` exports when an app owns resource lifecycle and their `/env` exports for presets and validation. The package root provides the environment-configured instance for standalone use. See the [architecture guide](docs/architecture.md).
- Keep API startup in `apps/api/src/server.ts`. Validate configuration, run migrations if enabled, then create runtime resources and serve requests. Startup migrations default to off. Railway sets `DB_MIGRATE_ON_START=true`. Nitro closes resources on shutdown. `/healthz` reports liveness and `/readyz` checks PostgreSQL and the auth tables.
- After changing the Drizzle schema, run `bun run db:generate --name=<change>` and review the SQL. Include the generated migration and its metadata under `packages/db/drizzle/`. See the [database guide](docs/auth.md).

## Validation

Use `bun run check` for formatting, lint, CI planner tests, Drizzle metadata, TypeScript, Knip, and unit tests. Run additional checks for the affected behavior.

| Area                                 | Check                                                                                     |
| ------------------------------------ | ----------------------------------------------------------------------------------------- |
| Web, CLI runner, or public API flows | `bun run test:e2e`                                                                        |
| Shared UI and Storybook              | `bun run test:stories` and `bun run test:ui`                                              |
| Database and Auth                    | `bun run test:auth` with `TEST_DATABASE_URL` pointing to a disposable PostgreSQL database |
| Redis and S3                         | `bun run test:resources` with Docker running                                              |
| CI selection                         | `bun run ci:test` and `bun run ci:plan --base <sha> --head <sha>`                         |

The [testing guide](docs/testing.md) covers browser installation, test services, and image smoke checks.

## CI and deployment

- Use `next` as the development and Railway deployment branch. Create PRs only when requested. When adding a workspace, update the workspace-to-job mapping in `scripts/ci-plan.mjs`. PRs select CI jobs by affected workspace. Pushes to `next` use the most recent successful CI ancestor and fall back to the full suite when no baseline is available. Pushes to `main` and manual CI runs run the full suite. Register framework entry points in `knip.json` when Knip cannot infer them.
- Build the Web, API, and `.railway/gateway/Dockerfile` images from the repository root. When runtime dependencies change, check the corresponding service's watch paths in `.railway/railway.ts`. Keep the gateway independent of Web/API startup and public domain bindings. Verify gateway changes with `scripts/smoke-gateway-image.sh`; its health check is `/gateway-healthz`. Preview infrastructure changes with `railway config plan`. See the [deployment steps](README.md#railway).
