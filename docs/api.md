# Public API

Kipivo exposes REST under `/api/v1` and typed RPC under `/rpc`. Use the same Web origin for both. The OpenAPI document at `/api/openapi.json` includes REST schemas, error responses, and the session cookie requirements.

The Web client and API use the oRPC v2 protocol and deploy together. Error responses carry the error code in the body and the status in the HTTP response.

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

### Authentication resources

REST paths below are relative to `/api/v1`. The typed client groups procedures by resource and uses `get`, `list`, `create`, `update`, and `delete`. For example, `api.auth.session.get()` maps to `GET /api/v1/auth/session`. Better Auth serves the protocol endpoints under `/api/auth/*`, including OAuth callbacks and magic-link verification.

| REST operation                        | RPC procedure                        | Access and response                                                                                       |
| ------------------------------------- | ------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| `GET /auth/session`                   | `auth.session.get`                   | Anonymous. Returns `null` for a guest or the public session and user.                                     |
| `POST /auth/session`                  | `auth.session.create`                | Trusted Web Origin. Creates a session using email and password.                                           |
| `DELETE /auth/session`                | `auth.session.delete`                | Trusted Web Origin. Signs out and clears the session cookie.                                              |
| `POST /auth/registrations`            | `auth.registrations.create`          | Trusted Web Origin and completed administrator setup.                                                     |
| `GET /auth/providers`                 | `auth.providers.list`                | Anonymous. Lists configured social sign-in providers.                                                     |
| `POST /auth/social/authorizations`    | `auth.social.authorizations.create`  | Trusted Web Origin and completed setup. Returns the provider authorization URL.                           |
| `GET /auth/methods/email`             | `auth.methods.email.get`             | Anonymous. Indicates whether email sign-in is enabled.                                                    |
| `POST /auth/magic-links`              | `auth.magicLinks.create`             | Trusted Web Origin. Requests a sign-in link.                                                              |
| `POST /auth/email-codes`              | `auth.emailCodes.create`             | Trusted Web Origin. Requests a sign-in code.                                                              |
| `POST /auth/email-code-verifications` | `auth.emailCodeVerifications.create` | Trusted Web Origin. Creates a session using the email code.                                               |
| `POST /auth/password-resets`          | `auth.passwordResets.create`         | Trusted Web Origin. Requests a reset email.                                                               |
| `PUT /auth/password`                  | `auth.password.update`               | Trusted Web Origin and a valid reset token.                                                               |
| `POST /auth/native/authorizations`    | `auth.native.authorizations.create`  | Signed-in browser and trusted Web Origin. Returns a native app callback.                                  |
| `POST /auth/native/sessions`          | `auth.native.sessions.create`        | Native client with a one-time authorization code and PKCE verifier. Issues an independent session cookie. |

Browser auth writes that accept a body use JSON. Sessions are issued and cleared with HTTP cookies. Server and native clients manage their own cookie jar. Better Auth applies its rate limits and returns `429` with `Retry-After` when available.

Hono handles request IDs, logging, security headers and service injection. It does **not** apply a blanket login check to `/rpc`, `/api/v1` or `/api/auth`. For new oRPC endpoints, put anonymous operations in the public contract and protected operations in `sessionContract`: choose `sessionRead` for reads or `trustedWrite` for mutations. Both transports execute the same session middleware. It checks the policy of the matched procedure, not the incoming HTTP method (an RPC read can use POST).

For a protected procedure, missing auth configuration returns `503`; no valid session returns `401`; a missing or untrusted Origin on a protected write returns `403`. After those checks, core evaluates current permissions, and the database rechecks the role-change rule or one-time setup state in the write transaction. Neither request middleware nor the browser is the authority for those decisions.

The account list accepts a `limit` from 1 to 100, defaulting to the instance directory setting (initially 25). Send the returned `nextCursor` as `cursor` to continue. A `null` cursor marks the final page.

Installation accepts `{ name, email, password }`. A closed installation returns `409 SETUP_CLOSED`. After a lost response, read `setup.get` and sign in if installation finished; never automatically replay the write.

Send `{ "role": "admin" }` or `{ "role": "member" }` to the role endpoint. Role writes require an `Origin` matching `AUTH_URL`. A missing session returns `401`, insufficient privileges return `403`, and an unknown target account returns `404`. See [database and authentication](auth.md) for sign-in and administrator setup.

In browser code, the typed client uses the current origin and the existing session cookie. Use `includeAccount: true` to read the signed-in account, permissions, and personal settings along with the session. The REST equivalent is `GET /api/v1/auth/session?includeAccount=true`.

```ts
import { createApiClient } from "@kipivo/api/client";

const api = createApiClient(window.location.origin);
const session = await api.auth.session.get({ includeAccount: true });
const account = session?.account;
```

Server-side callers can pass a `headers` callback to forward the current user's session cookie and an optional `fetch` override for the runtime or test harness.
