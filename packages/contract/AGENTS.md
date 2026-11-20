# Public oRPC contract

- Define paths, schemas, and procedure errors in the owning domain under [src/](src/). Reuse shared domain schemas and compose the router and derived `ApiClient` in [index.ts](src/index.ts).
- Use [policies.ts](src/policies.ts) for session and trusted Origin requirements. Use `restRoute` from [rest.ts](src/rest.ts) with an explicit method and path to publish a procedure through REST and OpenAPI. The oRPC router also exposes contract procedures over RPC. The session read in [auth.ts](src/auth.ts) uses RPC, and Better Auth serves authentication actions under `/api/auth`.
- Keep the package safe to import in a browser. The [oRPC implementation](../orpc/AGENTS.md) owns the typed client, procedures, and request handling. The [local runner](../contracts/AGENTS.md) has its own contract.
- Update the [API guide](../../docs/api.md) and run `bun run test:e2e` for wire changes. Run `bun run test:auth` for protected flows.
