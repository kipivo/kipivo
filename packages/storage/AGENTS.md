# S3-compatible object storage

- Use `/env` for configuration and `/factory` when the caller owns the client. No S3 settings means storage is disabled; a partial set is invalid. Keep signing credentials server-side and out of logs.
- The [storage factory](src/factory.ts) signs path-style requests under the configured bucket and `kipivo/` prefix. Validate relative object keys before encoding each segment. A missing read returns `null`; do not turn other upstream failures into misses. Preserve cancellation on timeout or disposal.
- Run `bun run kpdev test resources` with Docker for key handling, signing, reads/writes, and cleanup. See the [resource guide](../../docs/resources.md).
