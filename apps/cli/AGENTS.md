# CLI and local runner

- `kipivo` and `kpvo` share [one command entry point](src/index.ts). Keep argument handling there, HTTP serving in [the runner server](src/runner/server.ts), process execution in [the check process](src/runner/check-process.ts), and SQLite history in [the run store](src/runner/store.ts).
- The runner accepts a fixed `check` job, not caller-provided commands. Preserve loopback binding, bearer authentication, one active check, and bounded execution time and output. Use [contracts](../../packages/contracts/AGENTS.md) for wire data and [runtime](../../packages/runtime/AGENTS.md) for connection discovery.
- Use `bun run test --filter=kipivo` for runner behavior and `bun run test:e2e` for CLI/Web interoperability. Use a private temporary `KIPIVO_HOME` for manual runs so they cannot alter real history.
