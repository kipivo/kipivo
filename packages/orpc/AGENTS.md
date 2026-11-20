# oRPC

- Use [the public API contract](../contract/AGENTS.md) for server procedures and client types.
- Keep the `/client` and `/errors` exports safe to import in a browser. The [typed client](src/client/index.ts) calls `/rpc` at the supplied origin and accepts injectable headers and fetch. Keep their runtime dependencies in `src/client/` or declare workspace dependencies in the client transit task. The [API build](../../apps/api/turbo.json) also tracks the server implementation.
- Implement handlers by domain in [`src/procedures/`](src/procedures/) and compose them in [router.ts](src/procedures/router.ts).
- Use the [authenticated builder](src/procedures/builders.ts) for protected operations. It resolves the actor from the request identity and enforces the trusted Origin decision for writes declared by the contract. The account and settings operations enforce resource permissions.
- Use the [core settings interfaces](../core/src/settings.ts) for personal, directory, and email settings operations.
- [index.ts](src/index.ts) constructs the RPC and REST handlers and generates OpenAPI. The [API application](../../apps/api/AGENTS.md) mounts them on Hono, supplies the services, and writes the response headers. Pass [business services](src/services.ts) when creating the handlers. Each procedure group binds its own dependency at construction. Provide the request identity, trusted Origin decision, request ID, and logger in the request context.
- Run `bun run kpdev check` for workspace changes. Update the [API guide](../../docs/api.md) and run `bun run kpdev test e2e` for wire changes. Run `bun run kpdev test auth` for protected flows.
