# Database and authentication

`@kipivo/db` owns the Postgres.js connection pool, its factory, Drizzle schema, and SQL migrations. `@kipivo/auth/factory` builds Better Auth with the Drizzle adapter. The API closes its connection pool during Nitro shutdown.

Email/password authentication uses database-backed sessions. Passwords require at least 12 characters. Better Auth checks request origins and writes HttpOnly cookies, with Secure enabled for HTTPS deployments.

`@kipivo/db` exports `database` from `DATABASE_URL`. `@kipivo/auth` exports `auth` from the authentication environment and uses that same database pool. For standalone use, call `database.close()` at shutdown. Applications that manage their own resources can use `createDatabase` from `@kipivo/db/factory` and `createAuth` from `@kipivo/auth/factory`.

Web forms use the typed `api.auth` RPC procedures. Native Better Auth endpoints remain available for existing clients and email callbacks. See the [RPC operations and cookie handling](api.md#authentication-resources).

## System-browser sign-in for desktop and Expo

This is a first-party session handoff, not a general OAuth provider. Native clients do not need a client secret, and their callback schemes are **not** trusted Web origins. No new environment settings or database migration are required.

| `client_id` | Registered callback              |
| ----------- | -------------------------------- |
| `desktop`   | `kipivo-desktop://auth/callback` |
| `expo`      | `kipivo://auth/callback`         |

1. In the native app, generate a new verifier (32 cryptographically random bytes, base64url without padding) and a separate random `state` (at least 16 bytes, base64url). Keep the pending state, verifier, client ID and original Kipivo origin together in the app. Compute `code_challenge = BASE64URL(SHA256(ASCII(verifier)))`, without padding.
2. Open the **system browser** at `{webOrigin}/authorize?client_id=…&state=…&code_challenge=…&code_challenge_method=S256`. Use the configured HTTPS Web origin in production. Do not send the verifier or a redirect URL. The browser signs in with the existing account flow and shows which app and account the user is about to authorize. Canceling or closing the page before approval issues nothing.
3. After explicit consent the Web page calls `POST /api/auth/native/authorize`. The server checks the session, Web Origin and displayed account ID, then returns the registered callback with only `code` and `state`. The authorization code expires in **60 seconds**. For Expo use a native build that registers `kipivo`, not an Expo Go `exp://` callback; the desktop client must register its own scheme.
4. Handle the OS callback only for a pending request. `readNativeCode(callback, { client_id, state })` from the browser-safe `@kipivo/auth/native` export checks the exact callback and state; discard a `null` result. Never take the server origin or verifier from the callback. Exchange the code once, over a native HTTP transport, at the **original** Web origin:

   ```http
   POST /api/auth/native/exchange
   Content-Type: application/json

   {"client_id":"expo","code":"<callback code>","code_verifier":"<original verifier>"}
   ```

5. Use an empty native cookie jar for the exchange (no browser `Origin`, `Sec-Fetch-*` or existing cookies). Success is `200 {"success":true}` with the new Better Auth session in `Set-Cookie`, not a bearer token in JSON. Keep that cookie in the app's protected, origin-scoped cookie storage. Use it for existing authenticated APIs; protected writes and sign-out still need the configured Web `Origin`. Signing out in the app does not sign out the browser. Discard pending state and verifier on completion or cancellation; after expiry or a lost exchange response, start a new login.

The Web and API sides are implemented here. Native launch, deep-link registration/handling, secure storage, and device-level testing belong to the desktop and Expo apps. A custom scheme alone does not establish that the OS launched the genuine app; PKCE binds redemption to the initiating app's verifier.

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
export DB_MIGRATE_ON_START=true
export BETTER_AUTH_URL='http://localhost:3000'
export BETTER_AUTH_SECRET="$(openssl rand -hex 32)"
bun run dev:api
```

In another terminal, run `bun run dev` and open [localhost:3000](http://localhost:3000). Keep the hostname consistent with `BETTER_AUTH_URL`. The Web development proxy defaults to `http://127.0.0.1:3001`. Override `API_ORIGIN` when the API runs elsewhere. Keep the secret stable across restarts to preserve sessions.

The API expects `DATABASE_URL`, `BETTER_AUTH_URL`, and `BETTER_AUTH_SECRET` together. `BETTER_AUTH_URL` is the public Web HTTP(S) origin. The secret must have at least 32 characters. The API exposes `/healthz` for liveness and `/readyz` for database connectivity, the authentication tables, and the account role column. With authentication unconfigured, its auth endpoints and readiness check return `503`.

Startup migrations are off by default. Set `DB_MIGRATE_ON_START=true` to apply pending migrations after configuration validation and before the API initializes its runtime clients. Enabling the switch requires `DATABASE_URL`.

## Authentication endpoints

Kipivo forms call the typed auth RPC client. Integrations using Better Auth directly can call `/api/auth/*` on the same Web origin. The Web proxy forwards cookies, Origin and X-Forwarded-For to the API and relays each Set-Cookie header. Better Auth uses the forwarded client IP for session metadata and rate limiting. The deployment's edge proxy supplies this header. Authentication responses use `Cache-Control: no-store`.

| Method | Path                      | Request body                                                                      |
| ------ | ------------------------- | --------------------------------------------------------------------------------- |
| POST   | `/api/auth/sign-up/email` | `{ "name": "Kipivo", "email": "you@example.com", "password": "a-long-password" }` |
| POST   | `/api/auth/sign-in/email` | `{ "email": "you@example.com", "password": "a-long-password" }`                   |
| GET    | `/api/auth/get-session`   |                                                                                   |
| POST   | `/api/auth/sign-out`      | `{}`                                                                              |

Use browser `fetch` with JSON content headers and the default same-origin credentials. The session endpoint returns the current user and session, or `null` for a signed-out browser. Server-side API handlers can read a session through the injected auth instance's `api.getSession({ headers })` method.

## Google and GitHub sign-in

Create a [Google Web OAuth client](https://better-auth.com/docs/authentication/google) or [GitHub OAuth App](https://better-auth.com/docs/authentication/github) for each deployment. Use the Web origin from `BETTER_AUTH_URL` when registering the callback URL. On Railway, set the matching variables on the API service and redeploy it.

| Provider | API variables                              | Callback URL                                 |
| -------- | ------------------------------------------ | -------------------------------------------- |
| Google   | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | `<BETTER_AUTH_URL>/api/auth/callback/google` |
| GitHub   | `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | `<BETTER_AUTH_URL>/api/auth/callback/github` |

Each configured provider appears on `/sign-in` and `/sign-up`. GitHub requests `read:user` and `user:email` so private email addresses can be read during sign-in. Use separate OAuth apps for local development and production when the provider requires a single callback URL.

After administrator setup, the first successful social sign-in creates a member account. An existing account can be linked automatically only when both the Kipivo email and the returned provider email are verified and match. If an email is already in use and cannot be linked, sign in with the original method. Keep client secrets in the API's secret store.

## Email sign-in and password recovery

`/sign-in` and `/sign-up` are separate password flows. To offer `/magic-link`, `/email-code` and `/forgot-password`, open **Settings → Email delivery** as an administrator, enter a verified Resend sender address and sending API key, enable delivery and save. Changes apply across API instances without a restart. New installations default to password-only. When upgrading, re-enter any previously deployed mail environment variables here; the API no longer reads them. The credential is write-only and encrypted in PostgreSQL with a key derived from `BETTER_AUTH_SECRET`. Keep that secret stable and backed up separately from the database. If it changes, replace the Resend key in Settings. Disabling preserves the key unless you explicitly remove it. `/api/auth/email-methods` reports availability, not credentials or provider health. Keep `BETTER_AUTH_URL` set to the public Web origin used in emails.

Email codes and magic links sign in existing accounts only; they do not replace registration or first-admin installation. Codes and links expire after five minutes. Recovery emails open `/reset-password`; completing a reset revokes previous sessions. Never log or forward email contents, links, or codes. Monitor mail delivery in Resend; a successful request is intentionally not confirmation that an account exists or a message reached its inbox.

## Roles and the first administrator

Kipivo assigns the `member` role to existing accounts during migration and to new accounts at registration. Members can read their own account. Administrators can also list accounts and assign roles to other accounts. Role changes take effect on the next API call, including for existing sessions.

In Web, use **Sign in** in the header to sign in or create an account. The account menu shows the signed-in identity and current role. Administrators can open **Administration → Manage accounts** to find another account and review the permissions gained or lost before confirming a role change.

### Set up the first administrator

1. Apply the database migrations and configure Better Auth. Keep `BETTER_AUTH_SECRET` in the deployment secret store. There is no installation token, token file, or SSH step.
2. Open the Web site over HTTPS immediately after deploying. An empty installation redirects to `/setup`. Anyone who can reach it can submit the first administrator's name, email and password. Ordinary registration is blocked until installation finishes.
3. Sign in with the new credentials. The API creates the administrator and password credential and permanently closes setup in the same transaction. Concurrent installations cannot create a second administrator. Removing all users does not reopen setup.

**Coordinated upgrade:** stop old application instances, apply migrations and deploy matching API/Web builds before opening traffic. An existing account (even a member) closes installation; existing roles and sessions are unchanged. If upgrading a database with members but no administrator, provision an administrator through a trusted database administrator before upgrading. Old setup tokens have no effect.

Connection URLs follow Postgres.js semantics, with no node-postgres compatibility layer: explicitly use `sslmode=verify-full` and the required CA to validate the server certificate and hostname. Review deployment URLs before upgrade.

### Assign additional administrators

After setup closes, only a signed-in administrator can promote another account, through **Manage accounts** or the [public API](api.md). Role changes require the configured Web origin. Administrators cannot change their own role. Keep a second administrator account if you need a fallback: there is no command to promote an account or reopen setup if the last administrator loses access.

## Schema changes

After changing `packages/db/src/schema.ts`, generate and review the SQL and snapshot files, then apply them to the intended database.

```sh
bun run db:generate --name=describe_change
bun run db:check
bun run db:migrate
```

Commit the generated `packages/db/drizzle` directory with the schema change. `bun run db:migrate` runs migrations on demand using `DATABASE_URL`. Both the command and API startup take the same PostgreSQL advisory lock so concurrent migrators run one at a time. Drizzle records completed migrations and skips them on subsequent runs. A migration failure stops API startup.

## Docker and Railway

The API image bundles the SQL migrations. With the local PostgreSQL container above running, connect it and the API to a Docker network and enable startup migrations.

```sh
docker build -f apps/api/Dockerfile -t kipivo-api .
docker network create kipivo
docker network connect kipivo kipivo-postgres
export DATABASE_URL='postgresql://kipivo:kipivo_local@kipivo-postgres:5432/kipivo'
docker run --rm --name kipivo-api --network kipivo -p 127.0.0.1:3001:3001 \
  --env DATABASE_URL --env DB_MIGRATE_ON_START=true \
  --env BETTER_AUTH_URL --env BETTER_AUTH_SECRET \
  -e PORT=3001 kipivo-api
```

The same API executable handles `db:migrate` without starting HTTP. Only `DATABASE_URL` is required. To run only the migrations with this image, use `docker run --rm --network kipivo --env DATABASE_URL kipivo-api db:migrate`.

In another terminal, start the Web container on the same network.

```sh
docker build -f apps/web/Dockerfile -t kipivo-web .
docker run --rm --network kipivo -p 127.0.0.1:3000:3000 \
  -e PORT=3000 -e API_ORIGIN=http://kipivo-api:3001 kipivo-web
```

Railway supplies the API’s database reference and Web’s private API origin. It sets `DB_MIGRATE_ON_START=true` on the API and checks `/readyz` before switching API traffic.

During first setup, generate the Web public domain and set the API's `BETTER_AUTH_URL` to that HTTPS origin. Generate `BETTER_AUTH_SECRET` with `openssl rand -hex 32` and save it in the API's Railway variables. The IaC configuration preserves these operator-managed values. Redeploy the API once the variables are present, then check `/readyz` and the Web-origin session endpoint. Follow the [Railway setup](../apps/docs/content/docs/self-hosting.mdx#railway) to preview and apply infrastructure changes.

## Integration tests

Run `bun run test:auth` with a disposable PostgreSQL database. The [testing guide](testing.md#database-and-authentication-tests) lists the required database privileges, server ports, and scenarios.
