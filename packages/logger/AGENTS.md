# Logging adapters

- Use the root export for service-level logger configuration, `/hono` for request middleware, and `/orpc` for procedure instrumentation. Configure the service once at startup; do not initialize a separate logger in each handler.
- The [Hono adapter](src/hono.ts) consumes the ID from Hono's request-ID middleware. Preserve the request logger and ID passed into oRPC by the [API app](../../apps/api/AGENTS.md); do not generate a second ID for the same request. Preserve deferred completion for streaming responses.
- Run `bun run kpdev test --filter=api` for request-context changes and `bun run kpdev test e2e` when response headers or observable request handling change.
