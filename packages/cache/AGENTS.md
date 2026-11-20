# Redis cache

- Use `@kipivo/cache/env` for configuration and `@kipivo/cache/factory` when the caller owns shutdown. Importing the package root selects the environment-configured instance; do not use it to create a second client inside an API request.
- Keep the [JSON cache](src/factory.ts) namespaced under `kipivo:`. TTLs are positive integer seconds. Share the lazy connection attempt across concurrent operations and keep timeouts bounded; a Redis outage must not silently queue writes.
- Run `bun run kpdev test resources` with Docker for changes to connection options, serialization, expiry, or cleanup. See the [resource guide](../../docs/resources.md).
