# API

- Define public procedures in the [API contract](../../packages/contract/src/index.ts) and implement them in the [oRPC package](../../packages/orpc/AGENTS.md).
- [app.ts](src/app.ts) mounts Hono middleware and binds each route group to its application dependencies at startup. [Procedure routes](src/routes/procedures.ts) create an identity for the incoming request, pass the trusted Origin decision, request ID and logger into oRPC, and forward session cookies and retry headers. [HTTP middleware](src/http/) owns the public session read limit and response headers.
- [server.ts](src/server.ts) validates configuration and starts the API. [Runtime assembly](src/runtime/resources.ts) binds domain queries to database repositories, creates Better Auth and manages resource shutdown. Tests supply app dependencies through `createApp`.
- Consult the [Hono skill](../../.agents/skills/hono/SKILL.md) for HTTP mechanics. Update the [route access table](../../docs/api.md) when access requirements change. Run `bun run test:e2e` for public flows and the [auth suite](../../packages/auth/AGENTS.md) for session-protected flows.
