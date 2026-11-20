# Redis and object storage

The API owns the Redis and S3-compatible clients. Keep credentials and resource access in server code. Kipivo exposes no HTTP upload route.

- `@kipivo/cache/factory` provides `createCache` with `getJson`, `setJson`, and `delete`. Writes require a positive TTL in seconds. The client prefixes keys with `kipivo:`.
- `@kipivo/cache` exports a shared `cache` instance configured from `REDIS_URL`. It exports `null` when the variable is unset.
- `@kipivo/storage/factory` provides `createObjectStorage` with `read`, `write`, and `delete` for binary objects. Use relative object paths. The client stores them under `kipivo/` in the configured bucket.
- `@kipivo/storage` exports a shared `storage` instance from the `S3_*` variables. It exports `null` when the entire group is unset.

On API shutdown, the database pool is ended and the Redis client is disconnected. The S3 signer does not own a connection pool: `dispose()` aborts that storage instance’s outstanding fetches and rejects new operations. It does not close shared HTTP connections or remove objects.

## API environment

Configure each resource independently. Omit `REDIS_URL` to run without Redis. Omit all five S3 variables to run without object storage. Set all five when enabling S3.

| Variable               | Value                                                  |
| ---------------------- | ------------------------------------------------------ |
| `REDIS_URL`            | Redis connection URL using `redis://` or `rediss://`   |
| `S3_ENDPOINT`          | HTTP(S) endpoint of a path-style S3-compatible service |
| `S3_BUCKET`            | Name of the existing private bucket                    |
| `S3_REGION`            | Signing region expected by the provider                |
| `S3_ACCESS_KEY_ID`     | Access key for the API                                 |
| `S3_SECRET_ACCESS_KEY` | Secret key for the API                                 |

Redis and S3 operate independently of PostgreSQL and authentication. The API's `/readyz` continues to check PostgreSQL connectivity and the authentication tables.

## Railway

Railway provisions Redis and passes the API a reference to its private `REDIS_URL`. Keep Redis private and use the reference from within the same Railway environment.

Provision a private bucket with an external S3-compatible provider and give the API credentials to read, write, and delete objects under `kipivo/` in that bucket. Use an HTTPS endpoint reachable from the API and keep public bucket access disabled. Set the five S3 variables on the Railway API service. The Railway configuration preserves values already set there.

## Local verification

Run `bun run kpdev test resources` from the repository root with Docker running. The suite starts temporary Redis and RustFS containers and provisions its own bucket. See [resource tests](testing.md#resource-tests) for details.
