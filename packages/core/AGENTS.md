# Account access workflows

- Implement account operations behind `createAccessService` in [access.ts](src/access.ts). Depend on the `AccountRepository` interface and [RBAC](../rbac/AGENTS.md), not on Drizzle, HTTP headers, or an oRPC error type. Return domain results; the API maps them to transport errors.
- For role changes, the repository must recheck the actor's current permission in the same transaction as the write. A service-level check alone cannot protect against concurrent changes. Keep the contract and its [database implementation](../db/src/access.ts) consistent.
- Exercise decisions with a supplied repository in [access.test.ts](src/access.test.ts) using `bun run test --filter=@kipivo/core`. Run `bun run test:auth` for cross-layer or transactional behavior.
