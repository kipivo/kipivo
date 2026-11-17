# Kipivo architecture

Applications assemble their runtime behavior. Shared workspaces expose explicit source or configuration subpaths, and implementation details stay in their owning app.

## Web and public API

Web is a TanStack Start SSR application. The public API is a separate Hono application. Nitro connects the Hono entry to Vite development and builds its Bun production server. Hono owns `GET /healthz`; the oRPC Fetch adapter serves `system.ping` at the `/rpc` prefix.

The API implements the contract exported by `@kipivo/api/contract`. Callers use `createApiClient(origin)` from `@kipivo/api/client` and supply the service origin. The API health and ping responses work independently of the local runner.

Web and API each prune and build their own workspace dependencies from the repository root. Railway deploys them as separate services with independent app-specific watch paths. Changes to shared build inputs may deploy both.

## Database and authentication

`@kipivo/db` owns PostgreSQL access, the Drizzle schema, and versioned migrations. `@kipivo/auth/server` configures Better Auth against that database. The API assembles these factories from runtime variables and exposes the auth handler at `/api/auth/*`. Its `/readyz` endpoint checks database connectivity and the authentication tables.

Web forwards its same-origin `/api/auth/*` requests to the API. This lets the browser use host-only session cookies on the Web domain. Railway provisions PostgreSQL, injects the database reference and private API origin, and applies migrations before API deployment. See the [database and authentication guide](auth.md).

## Local runner

On macOS and Linux, run these commands from the root of a trusted Kipivo checkout after installing its dependencies:

```sh
bun run kipivo serve
# In another terminal:
bun run dev
bun run kipivo run check
bun run kipivo status <id>
bun run kipivo logs <id>
```

Open [localhost:3000/runs](http://localhost:3000/runs) to submit checks or inspect their output. The runner binds to `127.0.0.1:4310` by default and runs the checkout's fixed `bun run check` script. It accepts one active check, with a five-minute timeout and a 256 KiB log limit per run. SQLite history lives in `~/.kipivo`. Use a separate private `KIPIVO_HOME` to isolate history.

Web's development-only proxy reads a local runner credential server-side. Browser submissions must come from the same origin. The production Web application returns `404` for the local task page and its API. An interrupted check becomes a failed history entry after restart.
