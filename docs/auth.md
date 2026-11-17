# Database and authentication

`@kipivo/db` owns the PostgreSQL connection factory, Drizzle schema, and SQL migrations. `@kipivo/auth/server` builds Better Auth with the Drizzle adapter. The API creates both instances from its runtime environment and closes its connection pool during Nitro shutdown.

Email/password authentication uses database-backed sessions. Passwords require at least 12 characters. Better Auth checks request origins and writes HttpOnly cookies, with Secure enabled for HTTPS deployments.

## Local development

Start PostgreSQL 17 with a named volume for local data. Run these commands from the repository root.

```sh
docker run -d --name kipivo-postgres \
  -e POSTGRES_USER=kipivo \
  -e POSTGRES_PASSWORD=kipivo_local \
  -e POSTGRES_DB=kipivo \
  -p 127.0.0.1:5432:5432 \
  -v kipivo-postgres:/var/lib/postgresql/data \
  postgres:17-alpine

export DATABASE_URL='postgresql://kipivo:kipivo_local@127.0.0.1:5432/kipivo'
export BETTER_AUTH_URL='http://localhost:3000'
export BETTER_AUTH_SECRET="$(openssl rand -hex 32)"
bun run db:migrate
bun run dev:api
```

In another terminal, run `bun run dev` and open [localhost:3000](http://localhost:3000). Keep the hostname consistent with `BETTER_AUTH_URL`. The Web development proxy defaults to `http://127.0.0.1:3001`. Override `API_ORIGIN` when the API runs elsewhere. Keep the secret stable across restarts to preserve sessions.

The API expects `DATABASE_URL`, `BETTER_AUTH_URL`, and `BETTER_AUTH_SECRET` together. `BETTER_AUTH_URL` is the public Web HTTP(S) origin. The secret must have at least 32 characters. The API exposes `/healthz` for liveness and `/readyz` for database connectivity and the authentication tables. With authentication unconfigured, its auth endpoints and readiness check return `503`.

## Authentication endpoints

Browsers call `/api/auth/*` on the Web origin. TanStack Start forwards these requests to the API, including cookies, origin, and X-Forwarded-For headers, and relays each Set-Cookie header. Better Auth uses the forwarded client IP for session metadata and rate limiting. The deployment's edge proxy supplies this header. Authentication responses use `Cache-Control: no-store`.

| Method | Path                      | Request body                                                                      |
| ------ | ------------------------- | --------------------------------------------------------------------------------- |
| POST   | `/api/auth/sign-up/email` | `{ "name": "Kipivo", "email": "you@example.com", "password": "a-long-password" }` |
| POST   | `/api/auth/sign-in/email` | `{ "email": "you@example.com", "password": "a-long-password" }`                   |
| GET    | `/api/auth/get-session`   |                                                                                   |
| POST   | `/api/auth/sign-out`      | `{}`                                                                              |

Use browser `fetch` with JSON content headers and the default same-origin credentials. The session endpoint returns the current user and session, or `null` for a signed-out browser. Server-side API handlers can read a session through the injected auth instance's `api.getSession({ headers })` method.

## Schema changes

After changing `packages/db/src/schema.ts`, generate and review the SQL and snapshot files, then apply them to the intended database.

```sh
bun run db:generate --name=describe_change
bun run db:check
bun run db:migrate
```

Commit the generated `packages/db/drizzle` directory with the schema change. Migrations use an advisory lock on a dedicated PostgreSQL connection to serialize concurrent deployments. Drizzle records completed migrations and safely skips them on subsequent runs.

## Docker and Railway

The API image includes `db/scripts/migrate.mjs` and `db/drizzle`. With the local PostgreSQL container above running, connect it and the API to a Docker network. Run migrations using the same image and database environment before starting the API.

```sh
docker build -f apps/api/Dockerfile -t kipivo-api .
docker network create kipivo
docker network connect kipivo kipivo-postgres
export DATABASE_URL='postgresql://kipivo:kipivo_local@kipivo-postgres:5432/kipivo'
docker run --rm --network kipivo --env DATABASE_URL kipivo-api bun db/scripts/migrate.mjs
docker run --rm --name kipivo-api --network kipivo -p 127.0.0.1:3001:3001 \
  --env DATABASE_URL --env BETTER_AUTH_URL --env BETTER_AUTH_SECRET \
  -e PORT=3001 kipivo-api
```

In another terminal, start the Web container on the same network.

```sh
docker build -t kipivo-web .
docker run --rm --network kipivo -p 127.0.0.1:3000:3000 \
  -e PORT=3000 -e API_ORIGIN=http://kipivo-api:3001 kipivo-web
```

Railway IaC declares `web`, `api`, and `postgres`. It supplies the API's database reference and Web's private API origin. The API runs migrations as its pre-deploy command and checks `/readyz` before receiving traffic.

During first setup, generate the Web public domain and set the API's `BETTER_AUTH_URL` to that HTTPS origin. Generate `BETTER_AUTH_SECRET` with `openssl rand -hex 32` and save it in the API's Railway variables. The IaC configuration preserves these operator-managed values. Redeploy the API once the variables are present, then check `/readyz` and the Web-origin session endpoint. Follow the root [Railway setup](../README.md#railway) to preview and apply infrastructure changes.

## Integration tests

Point `TEST_DATABASE_URL` at a disposable PostgreSQL database, then run `bun run test:auth`. The suite applies the checked-in migrations, starts production Web and API builds on ports 4383 and 4382, and exercises sign-up, HttpOnly cookies, session lookup, origin rejection, sign-out, and password authentication through the Web proxy. It writes test accounts to that database. CI provisions PostgreSQL for this suite.
