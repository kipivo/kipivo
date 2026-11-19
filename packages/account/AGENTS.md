# Account schemas

- Keep shared, transport-independent profile schemas in [the package root](src/index.ts). Derive TypeScript types from Zod; do not add Drizzle rows, Better Auth sessions, or API handlers here.
- [Public settings](src/settings.ts) use explicit allowlists. Do not expose a system-managed setting merely because it exists in storage. Role and permission rules belong to [RBAC](../rbac/AGENTS.md).
- After changing a public shape, check its use in the [API contract](../api/AGENTS.md) and run `bun run typecheck`. For changes to accepted or returned account data, also exercise the affected flow with `bun run test:auth`.
