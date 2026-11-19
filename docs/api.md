# Public API

Kipivo exposes REST under `/api/v1` and typed RPC under `/rpc`. Use the same Web origin for both. The OpenAPI document at `/api/openapi.json` includes REST schemas, error responses, and the session cookie requirements.

## Route access

| API route                                     | RPC procedure                                  | Session           | Additional requirement                                                                                                                                                                 |
| --------------------------------------------- | ---------------------------------------------- | ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /healthz`, `GET /readyz`                 | —                                              | None              | Liveness and database readiness respectively; `503` on `/readyz` is not an authentication decision.                                                                                    |
| `GET /api/openapi.json`                       | —                                              | None              | REST API documentation.                                                                                                                                                                |
| `GET /api/v1/system/ping`                     | `system.ping`                                  | None              | No session lookup.                                                                                                                                                                     |
| `GET`, `POST /api/auth/*`                     | —                                              | Endpoint-specific | Better Auth handles cookies, sessions and origin checks. Sign-up is blocked until installation closes; sign-in accepts anonymous requests; get-session returns `null` when signed out. |
| `POST /api/auth/native/authorize`             | —                                              | Required          | Trusted Web Origin, matching displayed account, and a registered native client with an S256 challenge. See [native sign-in](auth.md#system-browser-sign-in-for-desktop-and-expo).      |
| `POST /api/auth/native/exchange`              | —                                              | None              | Native HTTP client with a one-time authorization code and matching client ID / PKCE verifier. Issues an independent session cookie.                                                    |
| `GET /api/v1/account/me`                      | `account.me`                                   | Required          | `account.read` (members and admins); returns the current account only.                                                                                                                 |
| `GET /api/v1/setup/status`                    | `setup.status`                                 | None              | Returns whether installation is open.                                                                                                                                                  |
| `POST /api/v1/setup/install`                  | `setup.install`                                | None              | Trusted `Origin`, empty installation, and open setup. Creates the first administrator.                                                                                                 |
| `GET /api/v1/admin/accounts`                  | `admin.accounts.list`                          | Required          | `accounts.read` (currently admin only). Optional `query` filters by name or email; see [pagination and matching](admin.md).                                                            |
| `PUT /api/v1/admin/accounts/{id}/role`        | `admin.accounts.setRole`                       | Required          | Trusted `Origin`, `accounts.roles.update` (currently admin only), and a target other than the caller.                                                                                  |
| `GET`, `PUT /api/v1/settings/personal`        | `settings.personal`, `settings.savePersonal`   | Required          | Session owner only; writes require trusted `Origin`. Accepts only `menuLabel` (`name` or `email`).                                                                                     |
| `GET`, `PUT /api/v1/admin/settings/directory` | `settings.directory`, `settings.saveDirectory` | Required          | `settings.manage`; writes require trusted `Origin`. Accepts only `pageSize` (1–100).                                                                                                   |
| `GET`, `PUT /api/v1/admin/settings/email`     | `settings.email`, `settings.saveEmail`         | Required          | `settings.manage`. Writes require trusted `Origin`. Responses expose `enabled`, `from`, and `hasApiKey`.                                                                               |

For email settings, omitting `apiKey` preserves the stored key. A string replaces it, and `null` removes it when delivery is disabled. See [email sign-in and recovery](auth.md#email-sign-in-and-password-recovery).

### Authentication via RPC

`createApiClient(origin).auth` exposes the following first-party operations. The REST adapter exposes the same contract at `/api/v1/auth/*` (see OpenAPI for paths and inputs). `/api/auth/*` remains the Better Auth protocol endpoint, including browser redirects and magic-link verification. RPC does not proxy arbitrary Better Auth paths.

| RPC operations                                                                              | Access / response                                                                                                                                                    |
| ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `getSession`, `emailMethods`, `socialMethods`                                               | Anonymous reads. Session is `null` or `{ user, session: { id, expiresAt } }`; `socialMethods` returns configured provider names.                                     |
| `signUp`, `signIn`, `signOut`                                                               | Trusted Web Origin. Success returns `{ ok: true }`; session cookies are issued or cleared on the HTTP response. The existing administrator setup gate still applies. |
| `signInSocial`                                                                              | Trusted Web Origin and completed setup. Returns the Google or GitHub authorization URL. The provider returns to `/api/auth/callback/:id`.                            |
| `sendMagicLink`, `sendEmailCode`, `signInWithCode`, `requestPasswordReset`, `resetPassword` | Trusted Web Origin. Email delivery and sign-in restrictions remain those configured in Better Auth.                                                                  |
| `native.authorize`                                                                          | Signed-in browser and trusted Web Origin. Returns `{ callback }` after validating the displayed account and native client.                                           |
| `native.exchange`                                                                           | Native client, **no** browser Origin, valid code and PKCE verifier. Returns `{ success: true }` and an independent session cookie.                                   |

For example, `await api.auth.signIn({ email, password })` establishes the browser cookie used by `api.account.me()`. Server and native clients must manage their own cookie jar; do not copy cookies into a JSON payload. Mutations use JSON POST. Rate limits are shared with the original endpoints; a throttled call preserves `429` and `Retry-After` when supplied.

Hono handles request IDs, logging, security headers and service injection. It does **not** apply a blanket login check to `/rpc`, `/api/v1` or `/api/auth`. For new oRPC endpoints, put anonymous operations in the public contract and protected operations in `sessionContract`: choose `sessionRead` for reads or `trustedWrite` for mutations. Both transports execute the same session middleware. It checks the policy of the matched procedure, not the incoming HTTP method (an RPC read can use POST).

For a protected procedure, missing auth configuration returns `503`; no valid session returns `401`; a missing or untrusted Origin on a protected write returns `403`. After those checks, core evaluates current permissions, and the database rechecks the role-change rule or one-time setup state in the write transaction. Neither request middleware nor the browser is the authority for those decisions.

The account list accepts a `limit` from 1 to 100, defaulting to the instance directory setting (initially 25). Send the returned `nextCursor` as `cursor` to continue. A `null` cursor marks the final page.

Installation accepts `{ name, email, password }`. A closed installation returns `409 SETUP_CLOSED`. After a lost response, read `setup.status` and sign in if installation finished; never automatically replay the write.

Send `{ "role": "admin" }` or `{ "role": "member" }` to the role endpoint. Role writes require an `Origin` matching `BETTER_AUTH_URL`. A missing session returns `401`, insufficient privileges return `403`, and an unknown target account returns `404`. See [database and authentication](auth.md) for sign-in and administrator setup.

In browser code, the typed client uses the current origin and the existing session cookie.

```ts
import { createApiClient } from "@kipivo/api/client";

const api = createApiClient(window.location.origin);
const account = await api.account.me();
```

Server-side callers can pass a `headers` callback to forward the current user's session cookie and an optional `fetch` override for the runtime or test harness.
