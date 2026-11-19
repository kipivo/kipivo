# Public API contract and client

- Declare public RPC and REST operations once in [contract.ts](src/contract.ts): include the route, schemas, and errors. Reuse shared account schemas and RBAC constants. Local runner endpoints belong to [contracts](../contracts/AGENTS.md), not this package.
- Distinguish anonymous operations, session reads, and writes requiring a trusted Origin. Contract metadata documents those requirements; the [API app](../../apps/api/AGENTS.md) must enforce them. Keep Hono handlers and resource construction out of the contract and client exports.
- The [typed client](src/client.ts) uses `/rpc` at the supplied origin; preserve injectable headers and fetch. Update the [API guide](../../docs/api.md) and run `bun run test:e2e` for wire changes, plus `bun run test:auth` for protected flows.
