# Testing

`bun run check` runs formatting, lint, TypeScript, Knip, and the Bun and Vitest tests. Web generates its route types using Vite without making a production bundle. Use `bun run knip` for the workspace usage analysis alone.

## Component tests

Run `bun run test:ui:install` once, then `bun run test:ui` to render the shared UI stories in Chromium in both light and dark themes. The suite checks accessibility and interactive behavior without backend services. `bun run build:storybook` verifies the static component workspace. See the [Storybook guide](../apps/storybook/README.md). CI runs these checks in the `ui` job.

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
