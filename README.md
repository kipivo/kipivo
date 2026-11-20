![Kipivo — From spark to done.](assets/banner.svg)

Kipivo (/kɪˈpiːvoʊ/) gives developers AI bots that understand their projects, do the work, and show what they did.

Start with the [Kipivo Quickstart](apps/docs/content/docs/quickstart.mdx). See the [repository documentation index](docs/README.md) for the workspace layout and contributor guides.

## Development

Install [mise](https://mise.jdx.dev/getting-started.html) to use the Bun and Node.js versions pinned in [mise.toml](mise.toml). Run these commands from the repository root.

```sh
mise install --locked
mise exec -- bun install --frozen-lockfile
mise exec -- bun run dev
```

Once mise is activated in your shell, use `bun` directly for the commands below.

See the [contributing guide](CONTRIBUTING.md) for commit messages and the local Git hook.

Open [localhost:3000](http://localhost:3000). Run `bun run check` to verify formatting, lint, types, Knip, and tests. Use `bun run format` to apply formatting.

Open [localhost:3000/docs](http://localhost:3000/docs) for the user guides, or run `bun run dev:docs` to work on the [documentation app](apps/docs/README.md) by itself.

To start the Web production build locally, run `bun run build --filter=web` followed by `bun run start`.

Run `bun run dev:storybook` for the Storybook component workbench at [localhost:6006](http://localhost:6006). See the [UI guide](packages/ui/README.md) for shadcn/Base UI components and themes, and the [component stories guide](apps/storybook/README.md) for builds and browser tests.

Run `bun run dev:api` to start the public API locally on port 3001. See the [architecture and local runner guide](docs/architecture.md) and the [testing guide](docs/testing.md).

Set `DB_MIGRATE_ON_START=true` to apply pending Drizzle migrations during API startup. See [database and authentication](docs/auth.md) to start PostgreSQL and configure email/password authentication. See [Redis and object storage](docs/resources.md) for the optional API resources and their local tests.

Once setup is complete, administrators can open [`/admin`](docs/admin.md) from the account menu. See [product events](docs/telemetry.md) to inspect successful setup and administration actions in the API logs.

## CLI

After installing the workspace dependencies, run `bun run kipivo --help` or `bun run kpvo --help` from the repository root. Both commands accept `--version`.

To start the runner, submit a check and inspect its output, follow the [Quickstart](apps/docs/content/docs/quickstart.mdx).

Run `bun run build --filter=kipivo` to bundle the CLI, then run `bun apps/cli/dist/kipivo.js --help` to use the bundle.

## Mobile

See the [mobile workspace guide](apps/mobile/README.md) to connect a device to your Kipivo instance. Run `bun run dev:mobile` to start Expo for `apps/mobile`. Open the app in Expo Go, or press `i` or `a` from the Expo terminal to launch an installed iOS simulator or Android emulator.

Run `bun run build --filter=mobile` to export the iOS and Android bundles to `apps/mobile/dist`.

## Docker

Build from the repository root so Docker can access the workspace lockfile and shared assets.

```sh
docker build -f apps/web/Dockerfile -t kipivo-web .
docker run --rm -e PORT=8080 -p 127.0.0.1:3000:8080 kipivo-web
```

With the container running, use `bun scripts/smoke-web.mjs http://127.0.0.1:3000 --production` to verify the home page, assets, health check, and local task routes.

Run `scripts/smoke-web-image.sh kipivo-web` to smoke-test the image in a temporary container.

Build the API image with `docker build -f apps/api/Dockerfile -t kipivo-api .`. See the [testing guide](docs/testing.md) for its HTTP checks.

Build the Docs image with `docker build -f apps/docs/Dockerfile -t kipivo-docs:ci .` and run `bash scripts/smoke-docs-image.sh` to verify the standalone `/docs` service.

Build the standalone gateway with `docker build -f .railway/gateway/Dockerfile -t kipivo-gateway:ci .` and run `scripts/smoke-gateway-image.sh` with Docker Compose installed to verify routing on an isolated network.

## Railway

Create an empty Railway project named `kipivo` and grant the Railway GitHub App access to `kipivo/kipivo`. The services deploy from `next`. Install [Railway CLI](https://docs.railway.com/cli) 5.42.1 or newer and run these commands from the repository root:

```sh
bun install --frozen-lockfile
railway login
railway link
railway config plan
```

Select the project's `next` environment when linking. Review the plan before running `railway config apply`. The configuration declares `gateway`, `web`, `api`, `docs`, `postgres`, and `redis` resources, including the private database and Redis connection references. Configure the external private S3-compatible bucket on the API service using the [resource guide](docs/resources.md#railway).

The source configuration enables **Wait for CI**. Keep the existing Web and API public domains while deploying the gateway as a separate service; domain changes are a separate step. Configure the API's `BETTER_AUTH_URL` and `BETTER_AUTH_SECRET` using the [authentication deployment steps](docs/auth.md#docker-and-railway). Railway checks Web's `/healthz` and API's `/readyz` before switching traffic and uses each service's watch paths to decide what to rebuild. Verify the Web deployment with `bun scripts/smoke-web.mjs https://<web-domain> --production`. Verify the API over HTTPS using the [testing guide](docs/testing.md).

The gateway uses `WEB_UPSTREAM`, `API_UPSTREAM`, and `DOCS_UPSTREAM` for its private upstreams. It forwards `/docs` to Docs, and Railway checks `/docs` before switching traffic to a new Docs deployment. Use `/gateway-healthz` to check the gateway itself. The [routing guide](docs/architecture.md#web-and-public-api) covers REST, RPC, authentication, and health checks.
