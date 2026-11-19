# Testing

`bun run check` runs formatting, lint, TypeScript, Knip, and the Bun and Vitest tests. `bun run lint` checks workspace import boundaries and runs the rule's examples with Bun. Web generates its route types using Vite without making a production bundle. Use `bun run knip` for the workspace usage analysis alone.

## CI job selection

Every pull request runs `check` in parallel with a lightweight `changes` job. The planner uses `turbo run … --affected --dry=json` to select CI tasks from their inputs and dependency graph. The selected jobs run the same tasks with `--affected`. Both steps use the same Git range through `TURBO_SCM_BASE` and `TURBO_SCM_HEAD`, including the PR merge commit.

| Affected consumer | Additional jobs                           |
| ----------------- | ----------------------------------------- |
| Mobile            | `mobile` (iOS and Android Expo exports)   |
| Storybook         | `ui`                                      |
| Web               | `ui`, `auth`, `e2e`, `web-e2e`, Web image |
| API               | `auth`, `e2e`, `web-e2e`, API image       |
| CLI (`kipivo`)    | `cli`, `e2e`, `web-e2e`                   |
| `tests/e2e`       | `auth`, `e2e`, `web-e2e`, API image       |

Declare CI task inputs and dependencies in the workspace's `turbo.json` with `"extends": ["//"]`. For example, Storybook's `ci:ui` depends on `web#transit` so changes to Web or its dependencies select the Storybook checks. Shared library changes follow their consumers through Turbo. Root and existing workspace `README.md` files and Markdown under `docs/` only require `check` when changed on their own. CI configuration, lockfiles, shared root tooling, and unmapped paths trigger a full task run. When Git or Turbo cannot determine the scope, the planner runs the full suite and reports the error.

Git paths also select the hosted image checks for Dockerfiles, image smoke scripts, and gateway configuration. `.dockerignore` selects all three images. When hosted image checks are enabled, Turbo also selects the Web and API images through their affected build tasks.

Pushes to `next` compare against the most recent ancestor with a successful `next` push CI run so that changes from failed or cancelled runs are included in the comparison. For ordinary changes, CI runs the selected tests and Railway builds the deployment images after CI succeeds. Changes to deployment Dockerfiles, `.dockerignore`, `.railway/`, or image smoke scripts also run the selected GitHub image checks. `next` runs the full suite when the workflow history is unavailable or no successful ancestor is found. Pushes to `main` and manual `workflow_dispatch` runs also run the full suite.

A newer run cancels the older run on the same PR. Image builds use independent matrix entries with fail-fast disabled. The stable `CI result` check requires `changes`, `check`, and every selected blocking job to succeed. Configure branch protection to require `CI result`. The `changes` summary records the `next` baseline when available and explains which jobs were selected.

Storybook component interactions and browser checks are required through `ui` for Web changes. The `e2e` job gates CI on API and resource integrations. `Web E2E (advisory)` runs the Chromium application tests and uploads failure traces to `web-playwright-results`. Its result is advisory. Railway's **Wait for CI** still waits for the workflow to finish.

Reproduce and test the plan locally:

```sh
bun run ci:plan --base <base-sha> --head <head-sha>
bun run ci:plan --full
bun run ci:test
```

`ci:test` also runs as part of `bun run check`. The planner job installs the pinned Turbo binary without installing workspace dependencies. When replaying a different head or working from a dirty tree, the planner checks out the committed head in a temporary clone with Git history. It installs that revision’s pinned Turbo into a temporary directory if needed.

## CI caches

The workflow uses `.github/actions/setup-workspace` to install the pinned Bun version and restore caches through GitHub Actions:

- Bun's global package cache (`~/.bun/install/cache`) is shared between jobs for the same runner OS, architecture, Bun version, and lockfile. A version-matched fallback can supply unchanged packages after a lockfile update. Every job that needs dependencies still runs `bun install --frozen-lockfile`.
- Turbo's task artifacts (`.turbo/cache`) and Vite's default cache directories (`node_modules/.vite` and `apps/*/node_modules/.vite`) are saved per job and commit. Restore keys reuse the latest matching cache for the same toolchain and dependency files. Turbo and Vite validate their own inputs before reusing entries.
- Vite's disk cache accelerates dependency prebundling in the development server and related test tooling. Turbo restores production build outputs declared in `turbo.json`. The component browser suite builds through Turbo so it can reuse cached build artifacts.
- The `ui`, `auth`, and `Web E2E (advisory)` jobs share a Chromium headless shell cache keyed by Playwright version, runner OS, and architecture. Each job ensures the required browser is present and installs system dependencies only if Chromium cannot launch.
- Docker uses Buildx's GitHub Actions layer cache, with separate scopes for the Web, API, and gateway images. Built images are loaded locally for the existing smoke checks.

Each image job checks the final filesystem for checkout and dotenv files outside third-party dependencies before running its smoke test.

These caches need no remote Turbo account or additional repository secrets. A cache miss runs the normal install/build path. To reset a cache after changing its layout, increment the `bun-v1` or `tasks-v1` prefix in the shared action, or change the corresponding Docker cache scope.

## Component tests

Run `bun run test:ui:install` once, then `bun run test:stories` to run all Storybook stories as Chromium component tests through the Vitest addon. The same tests can be run and watched from Storybook's sidebar testing widget.

Run `bun run test:ui` to check the Storybook application in Chromium in both light and dark themes. Playwright builds and serves it on loopback port 4384. The suite protects core interactions, accessible labels and descriptions, native Controls and Docs, narrow screens, and browser-composited color contrast without backend services. `bun run build:storybook` verifies the static build. See the [component stories guide](../apps/storybook/README.md). CI runs both suites in the `ui` job.

## End-to-end tests

```sh
bun run test:e2e:install --only-shell
bun run test:e2e
```

Playwright starts a built API for HTTP checks and shares one Web development server across the Chromium tests. The runner tests use the built CLI and give each test a fresh SQLite database, temporary checkout, and controlled check script. The suite uses loopback ports 4380 and 4381 and assigns each runner an ephemeral port. CI retains traces when tests fail.

Assert user-visible outcomes with accessible locators. Use viewport sizes to set up layout scenarios and measure overflow against the layout width available after the browser reserves scrollbar space. Use a JavaScript-disabled browser context to check server-rendered fallbacks.

Use the Playwright page clock for browser timers. The local-run tests wait for the CLI result, then advance the clock to trigger the next UI poll. Process readiness and Redis expiry are checked against the actual services, not the browser clock.

## Resource tests

```sh
bun run test:resources
```

This command uses the Docker CLI to start temporary `redis:8-alpine` and `rustfs/rustfs:1.0.5` containers on random loopback ports. The suite provisions its own private bucket and removes the containers on exit. Run it with Docker running locally. CI runs `bun run test:resources --project=api` for the blocking integration job. Use `bun run test:e2e --project=resources` to run API, Chromium, and resource tests together locally.

## Database and authentication tests

Install Chromium with `bun run test:e2e:install`, set `TEST_DATABASE_URL` to a disposable PostgreSQL database, then run `bun run test:auth`. The suite starts the built Web and API on ports 4383 and 4382 with API startup migrations enabled. It verifies registration, session cookies, origin checks, concurrent role changes, and the browser account management flow. Both auth specs create and drop their own databases on the same server (the test role needs `CREATEDB`). The setup race test also uses ports 4385–4387. CI starts a PostgreSQL service for this job. See the [database setup](auth.md).

## API production image smoke test

Run with Docker running locally, Bun available, and workspace dependencies installed.

```sh
docker build -f apps/api/Dockerfile -t kipivo-api:ci .
scripts/smoke-api-image.sh
```

Pass an image tag or ID as the first argument to test a different local build. Use the checkout the image was built from so its migration journal matches the image.

The API image job runs this script against a disposable PostgreSQL 17 container on a dedicated Docker network. With a configured but empty database and the migration switch unset, setup initialization stops startup without modifying the schema. Without database/auth configuration the API still serves `/healthz`. The script verifies that invalid Auth, Redis, and S3 settings stop startup before any migrations run. With valid settings and migrations enabled, two consecutive starts reach `/readyz` with status `200`. The first creates the auth tables and migration ledger. The second leaves the ledger unchanged and runs the API Playwright project. The script also checks the standalone migration command and verifies that invalid PostgreSQL credentials cause startup to fail when migrations are enabled.

## Verify running services

```sh
bun scripts/smoke-web.mjs https://<web-domain> --production
E2E_API_ORIGIN=https://<api-domain> bun run --bun --cwd tests/e2e test:e2e --project=api
```

The Web check covers the SSR home page, stylesheet, logo, `/healthz`, and the production `404` for local tasks. The API test checks `/healthz`, calls `system.ping` through the typed oRPC client, and verifies unknown HTTP and RPC paths return `404`.

## Gateway production image smoke test

Run with Docker and the Compose plugin available locally.

```sh
docker build -f .railway/gateway/Dockerfile -t kipivo-gateway:ci .
scripts/smoke-gateway-image.sh
```

Pass a local image tag or ID as the first argument to check another build. CI runs the same script for the gateway image matrix entry. Compose starts the built gateway and `oven/bun:1.4.4-slim` mock upstreams on an isolated network and waits for their health checks. The script runs the Bun assertions inside the mock service, prints service logs on failure, and removes the Compose project on exit. The checks cover routing boundaries, production local-route rejection, gateway health, HTTPS forwarding, HTML compression, and preservation of query strings, POST bodies, Host, Origin, cookies, Set-Cookie, and upstream security headers.

## Production topology smoke test

Pushes to `next` that select image checks also run **Topology smoke (advisory)** alongside the image jobs. CI calls the same **Production topology smoke** workflow available for manual runs. Docker Bake builds the three targets from the Compose file and reads the existing image job caches. To run the same checks locally, build the images and run the smoke script with Docker Compose available.

```sh
docker build -f .railway/gateway/Dockerfile -t kipivo-gateway:topology .
docker build -f apps/web/Dockerfile -t kipivo-web:topology .
docker build -f apps/api/Dockerfile -t kipivo-api:topology .
bash scripts/smoke-topology.sh
```

Compose pulls any missing PostgreSQL, Redis, and Bun images in parallel, then starts the real gateway, Web, and API images with disposable PostgreSQL and Redis on an internal network. After the services are healthy, a one-shot Bun container calls the gateway over HTTP to check readiness, Web's redirect before setup, first administrator creation, sign-in, the account session over RPC, and session revocation. It then runs the existing production SSR and asset checks through the gateway. The script prints service logs on failure and removes the containers, network, and database volume on exit.
