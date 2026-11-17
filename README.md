![Kipivo — From spark to done.](assets/banner.svg)

Kipivo gives developers AI bots that understand their projects, do the work, and show what they did.

## Development

Install Bun 1.4.3 and the Node.js version in `.node-version`.

```sh
bun install --frozen-lockfile
bun run dev
```

Open [localhost:3000](http://localhost:3000). Run `bun run check` to verify formatting, lint, build, types, and tests. Use `bun run format` to apply formatting.

To start the production build locally, run `bun run build` followed by `bun run start`.

## Docker

Build from the repository root so Docker can access the workspace lockfile and shared assets.

```sh
docker build -t kipivo-web .
docker run --rm -e PORT=8080 -p 127.0.0.1:3000:8080 kipivo-web
```

With the container running, use `node scripts/smoke-web.mjs http://127.0.0.1:3000` to verify the home page, assets, and health check.

## Railway

Create an empty Railway project named `kipivo` and grant the Railway GitHub App access to `kipivo/kipivo`. Once the Dockerfile is on `main`, install [Railway CLI](https://docs.railway.com/cli) 5.42.1 or newer and run these commands from the repository root:

```sh
bun install --frozen-lockfile
railway login
railway link
railway config plan
```

Select the project's production environment when linking. Review the plan before running `railway config apply`. The first plan should add only the `web` service from `.railway/railway.ts`.

In the `web` service settings, enable **Wait for CI** and generate a public domain. Railway builds the root Dockerfile on pushes to `main` and checks `/healthz` before switching traffic. Verify the public deployment with `node scripts/smoke-web.mjs https://<railway-domain>`.
