# Testing

`bun run check` runs formatting, lint, TypeScript, Knip, and the Bun and Vitest tests. Web generates its route types using Vite without making a production bundle. Use `bun run knip` for the workspace usage analysis alone.

## CI caches

The workflow uses `.github/actions/setup-workspace` to install the pinned Node and Bun versions and restore caches through GitHub Actions:

- Bun's global package cache (`~/.bun/install/cache`) is shared between jobs for the same runner OS, architecture, Bun version, and lockfile. A version-matched fallback can supply unchanged packages after a lockfile update. Every job that needs dependencies still runs `bun install --frozen-lockfile`.
- Turbo's task artifacts (`.turbo/cache`) and Vite's default cache directories (`node_modules/.vite` and `apps/*/node_modules/.vite`) are saved per job and commit. Restore keys reuse the latest matching cache for the same toolchain and dependency files. Turbo and Vite validate their own inputs before reusing entries.
- Vite's disk cache accelerates dependency prebundling in the development server and related test tooling. Turbo restores production build outputs declared in `turbo.json`. The component browser suite builds through Turbo so it can reuse the preceding build step's artifacts.
- Docker uses Buildx's GitHub Actions layer cache, with separate scopes for the Web and API images. Built images are loaded locally for the existing smoke checks.

These caches need no remote Turbo account or additional repository secrets. A cache miss runs the normal install/build path. To reset a cache after changing its layout, increment the `bun-v1` or `tasks-v1` prefix in the shared action, or change the corresponding Docker cache scope.

## Component tests

Run `bun run test:ui:install` once, then `bun run test:ui` to check the Fumadocs Story manual in Chromium in both light and dark themes. Playwright builds and serves it on loopback port 4384. The small suite protects core interactions, accessible labels and descriptions, generated controls, responsive navigation, and browser-composited color contrast without backend services. `bun run build:storybook` verifies the static manual. See the [component stories guide](../apps/storybook/README.md). CI runs these checks in the `ui` job.

## End-to-end tests

```sh
bun run test:e2e:install --only-shell
bun run test:e2e
```

Playwright starts a built API for HTTP checks and a Web development server for the local task UI. The local test uses the built CLI, real SQLite, temporary checkouts, and controlled check scripts. It does not use the developer's task history. The suite uses loopback ports 4380 and 4381 and assigns each runner an ephemeral port. CI retains traces when tests fail.

## Database and authentication tests

Set `TEST_DATABASE_URL` to a disposable PostgreSQL database and run `bun run test:auth`. The suite applies Drizzle migrations, starts the built Web and API on ports 4383 and 4382, and verifies registration, session cookies, origin checks, logout, and login. CI starts a PostgreSQL service for this job. See the [database setup](auth.md) for environment variables and migration commands.

## Verify running services

```sh
node scripts/smoke-web.mjs https://<web-domain> --production
E2E_API_ORIGIN=https://<api-domain> bun run --cwd tests/e2e test:e2e --project=api
```

The Web check covers the SSR home page, stylesheet, logo, `/healthz`, and the production `404` for local tasks. The API test checks `/healthz`, calls `system.ping` through the typed oRPC client, and verifies unknown HTTP and RPC paths return `404`.
