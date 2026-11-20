# Local runner contracts

- [runs.ts](src/runs.ts) defines the Zod wire shapes that the CLI and Web share: check submission, run IDs, summaries, details, and errors. Derive types from the schemas and keep the package safe to import in a browser.
- A submission is a strict object for a fixed `check`; a list entry is a summary, while logs belong to a detail response. Runner credentials and file access belong to [runtime](../runtime/AGENTS.md). Public oRPC endpoints belong to [the API contract](../contract/AGENTS.md).
- When the wire format changes, update both the [CLI](../../apps/cli/AGENTS.md) and the [Web](../../apps/web/AGENTS.md) consumer. Run `bun run kpdev test --filter=kipivo` and `bun run kpdev test e2e`.
