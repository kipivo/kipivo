# Account and settings access

- Implement account operations behind `createAccessService` in [access.ts](src/access.ts). Depend on the `AccountRepository` interface and [RBAC](../rbac/AGENTS.md), not on Drizzle, HTTP headers, or an oRPC error type. Return domain results; the API maps them to transport errors.
- Compose account and personal settings reads with `createCurrentAccountQuery` in [access.ts](src/access.ts). The current-account and session procedures share this query.
- Define installation operations and their input in [setup.ts](src/setup.ts).
- For role changes, the repository must recheck the actor's current permission in the same transaction as the write. A service-level check alone cannot protect against concurrent changes. Keep the contract and its [database implementation](../db/src/access.ts) consistent.
- Define settings operations in [settings.ts](src/settings.ts) using the shared personal, directory, and email settings types. Enforce `settings.manage` for directory and email operations in the [database transaction](../db/src/config.ts).
- Exercise decisions with a supplied repository in [access.test.ts](src/access.test.ts) using `bun run kpdev test --filter=@kipivo/core`. Run `bun run kpdev test auth` for cross-layer or transactional behavior.
