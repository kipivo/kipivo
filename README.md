![Kipivo — From spark to done.](assets/banner.svg)

Kipivo gives developers AI bots that understand their projects, do the work, and show what they did.

See the [documentation index](docs/README.md) for the workspace layout and guides.

## Development

Install Bun 1.4.3 and the Node.js version in `.node-version`.

```sh
bun install --frozen-lockfile
bun run dev
```

Open [localhost:3000](http://localhost:3000). Run `bun run check` to verify formatting, lint, types, Knip, and tests. Use `bun run format` to apply formatting.

To start the Web production build locally, run `bun run build --filter=web` followed by `bun run start`.

Run `bun run dev:storybook` for the Fumadocs Story component manual at [localhost:6006](http://localhost:6006). The `storybook` workspace name is retained. See the [UI guide](packages/ui/README.md) for shadcn/Base UI components and themes, and the [component stories guide](apps/storybook/README.md) for builds and browser tests.

Run `bun run dev:api` to start the public API locally on port 3001. See the [architecture and local runner guide](docs/architecture.md) and the [testing guide](docs/testing.md).

See [database and authentication](docs/auth.md) to start PostgreSQL, apply Drizzle migrations, and configure email/password authentication.

## CLI

After installing the workspace dependencies, run `bun run kipivo --help` or `bun run kpvo --help` from the repository root. Both commands accept `--version`.

Run `bun run build --filter=kipivo` to bundle the CLI, then run `bun apps/cli/dist/kipivo.js --help` to use the bundle.

## Mobile

Run `bun run dev:mobile` to start Expo for `apps/mobile`. Open the app in Expo Go, or press `i` or `a` from the Expo terminal to launch an installed iOS simulator or Android emulator.

Run `bun run build --filter=mobile` to export the iOS and Android bundles to `apps/mobile/dist`.

## Docker

Build from the repository root so Docker can access the workspace lockfile and shared assets.

```sh
docker build -t kipivo-web .
docker run --rm -e PORT=8080 -p 127.0.0.1:3000:8080 kipivo-web
```

With the container running, use `node scripts/smoke-web.mjs http://127.0.0.1:3000 --production` to verify the home page, assets, health check, and local task routes.

Build the API image with `docker build -f apps/api/Dockerfile -t kipivo-api .`. See the [testing guide](docs/testing.md) for its HTTP checks.

## Railway

Create an empty Railway project named `kipivo` and grant the Railway GitHub App access to `kipivo/kipivo`. Once the Dockerfile is on `main`, install [Railway CLI](https://docs.railway.com/cli) 5.42.1 or newer and run these commands from the repository root:

```sh
bun install --frozen-lockfile
railway login
railway link
railway config plan
```

Select the project's production environment when linking. Review the plan before running `railway config apply`. The configuration declares `web`, `api`, and `postgres` resources, including the database connection reference and API pre-deploy migrations.

In Web and API settings, enable **Wait for CI** and generate a public domain. Configure the API's `BETTER_AUTH_URL` and `BETTER_AUTH_SECRET` using the [authentication deployment steps](docs/auth.md#docker-and-railway). Railway checks Web's `/healthz` and API's `/readyz` before switching traffic and uses each service's watch paths to decide what to rebuild. Verify the Web deployment with `node scripts/smoke-web.mjs https://<web-domain> --production`. Verify the API over HTTPS using the [testing guide](docs/testing.md).
