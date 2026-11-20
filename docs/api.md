# Public API

Kipivo exposes typed RPC under `/rpc` and REST under `/api/v1`. Better Auth handles authentication at `/api/auth` and the typed client reads the session over RPC. Use the same Web origin for both transports. The OpenAPI document at `/api/openapi.json` includes REST schemas, error responses, and session cookie requirements.

The Web client and API use the oRPC v2 protocol. Both builds track the public contract. Changes confined to server procedures trigger the API build. Error responses carry the error code in the body and the status in the HTTP response.

## Route access

| API route                                     | RPC procedure                                                     | Session           | Additional requirement                                                                                                                                                                 |
| --------------------------------------------- | ----------------------------------------------------------------- | ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /healthz`, `GET /readyz`                 | —                                                                 | None              | Liveness and database readiness respectively; `503` on `/readyz` is not an authentication decision.                                                                                    |
| `GET /api/openapi.json`                       | —                                                                 | None              | REST API documentation.                                                                                                                                                                |
| `GET /api/v1/system/ping`                     | `system.ping`                                                     | None              | No session lookup.                                                                                                                                                                     |
| `GET`, `POST /api/auth/*`                     | —                                                                 | Endpoint-specific | Better Auth handles cookies, sessions and origin checks. Sign-up is blocked until installation closes; sign-in accepts anonymous requests; get-session returns `null` when signed out. |
| `POST /api/auth/native/authorize`             | —                                                                 | Required          | Trusted Web Origin, matching displayed account, and a registered native client with an S256 challenge. See [native sign-in](auth.md#system-browser-sign-in-for-desktop-and-expo).      |
| `POST /api/auth/native/exchange`              | —                                                                 | None              | Native HTTP client with a one-time authorization code and matching client ID / PKCE verifier. Issues an independent session cookie.                                                    |
| `GET /api/v1/accounts/me`                     | `accounts.me.get`                                                 | Required          | `account.read` (members and admins); returns the current account only.                                                                                                                 |
| `GET /api/v1/setup`                           | `setup.get`                                                       | None              | Returns whether installation is open.                                                                                                                                                  |
| `POST /api/v1/setup`                          | `setup.create`                                                    | None              | Trusted `Origin`, empty installation, and open setup. Creates the first administrator.                                                                                                 |
| `GET /api/v1/admin/accounts`                  | `admin.accounts.list`                                             | Required          | `accounts.read` (currently admin only). Optional `query` filters by name or email; see [pagination and matching](admin.md).                                                            |
| `PUT /api/v1/admin/accounts/{id}/role`        | `admin.accounts.role.update`                                      | Required          | Trusted `Origin`, `accounts.roles.update` (currently admin only), and a target other than the caller.                                                                                  |
| `GET`, `PUT /api/v1/accounts/me/settings`     | `accounts.me.settings.get`, `accounts.me.settings.update`         | Required          | Session owner only; writes require trusted `Origin`. Accepts only `menuLabel` (`name` or `email`).                                                                                     |
| `GET`, `PUT /api/v1/admin/settings/directory` | `admin.settings.directory.get`, `admin.settings.directory.update` | Required          | `settings.manage`; writes require trusted `Origin`. Accepts only `pageSize` (1–100).                                                                                                   |
| `GET`, `PUT /api/v1/admin/settings/email`     | `admin.settings.email.get`, `admin.settings.email.update`         | Required          | `settings.manage`. Writes require trusted `Origin`. Responses expose `enabled`, `from`, and `hasApiKey`.                                                                               |

For email settings, omitting `apiKey` preserves the stored key. A string replaces it, and `null` removes it when delivery is disabled. See [email sign-in and recovery](auth.md#email-sign-in-and-password-recovery).

### Authentication and session reads

Web forms call the [Better Auth endpoints](auth.md#authentication-endpoints) at `/api/auth/*` for sign-in, registration, sign-out, email codes, password recovery, and native authorization. OAuth and magic-link callbacks are served under the same prefix.

While the first administrator is waiting to be created, email registration and social sign-in return `409 INSTALLATION_REQUIRED`. The Web form links to `/setup` when it receives this code.

`api.auth.session.get({ includeAccount: true })` calls `POST /rpc/auth/session/get` with the current session cookie. The API reads it through `auth.api.getSession({ headers, returnHeaders: true })` and Hono forwards each `Set-Cookie` header. The procedure returns `null` for a guest, or the public user and session fields plus the account, permissions, and personal settings when requested.

Browser auth writes use JSON. Hono validates a supplied Origin against the configured exact Web origins. Provider callbacks reach Better Auth for protocol-specific validation, and native code exchange has its own client rules. Better Auth handles its endpoint checks, cookies, and rate limits. See [Web origins and shared sessions](auth.md#web-origins-and-shared-sessions).

Hono limits explicit RPC session reads to 100 requests per 10 seconds per client address, per API process. A limited read returns `429 TOO_MANY_REQUESTS` with `Retry-After` before it consults Better Auth. IPv6 clients share a bucket by `/64`, and IPv4-mapped IPv6 addresses share the corresponding IPv4 bucket.

Direct deployments use the socket peer. Set `API_TRUST_PROXY=true` only on a private API whose ingress replaces `X-Real-IP` with a verified client address. Railway supplies that header through its edge. For self-hosting, an ingress can instead strip `X-Real-IP` and replace `X-Forwarded-For` with one verified client address. The Web proxy passes these headers through, so restrict access to the Web proxy to that trusted ingress as well. A malformed `X-Real-IP` or a multi-address `X-Forwarded-For` falls back to the socket peer.

Public operations declare their access rules in the contract. Protected reads and writes share the signed-in middleware across RPC and REST. A protected write also requires a trusted Origin. Protected operations read the actor with session refresh disabled. Both session modes forward any `Set-Cookie` and `Retry-After` produced by Better Auth.

For a protected procedure, missing auth configuration returns `503`; no valid session returns `401`; a missing or untrusted Origin on a protected write returns `403`. After those checks, core evaluates current permissions, and the database rechecks the role-change rule or one-time setup state in the write transaction. Neither request middleware nor the browser is the authority for those decisions.

The account list accepts a `limit` from 1 to 100, defaulting to the instance directory setting (initially 25). Send the returned `nextCursor` as `cursor` to continue. A `null` cursor marks the final page.

Installation accepts `{ name, email, password }`. A closed installation returns `409 SETUP_CLOSED`. After a lost response, read `setup.get` and sign in if installation finished; never automatically replay the write.

Send `{ "role": "admin" }` or `{ "role": "member" }` to the role endpoint. Role writes require a trusted Web `Origin`. A missing session returns `401`, insufficient privileges return `403`, and an unknown target account returns `404`. See [database and authentication](auth.md) for sign-in and administrator setup.

In browser code, the typed client uses the current origin and the existing session cookie. Use `includeAccount: true` to read the signed-in account, permissions, and personal settings along with the session.

```ts
import { createApiClient } from "@kipivo/orpc/client";

const api = createApiClient(window.location.origin);
const session = await api.auth.session.get({ includeAccount: true });
const account = session?.account;
```

Server-side callers can pass a `headers` callback to forward the current user's session cookie and an optional `fetch` override for the runtime or test harness.
