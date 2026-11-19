# Local runner connection

- [The connection helper](src/local/connection.ts) discovers the runner under `KIPIVO_HOME` (default `~/.kipivo`), validates `runner.json`, and attaches its token to loopback requests. Keep redirects disabled and requests time-limited; do not expose the token in browser data or logs.
- Only the [CLI](../../apps/cli/AGENTS.md) and a [Web](../../apps/web/AGENTS.md) server-only module may import `@kipivo/runtime/local/connection`. Browser-safe wire schemas live in `@kipivo/contracts/runs`.
- Keep discovery compatible with the runner that writes the file. Test changes with `bun run test --filter=kipivo` and `bun run test:e2e` using isolated runner state.
