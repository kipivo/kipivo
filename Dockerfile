FROM oven/bun:1.4.4-slim AS bun

FROM node:22.23.5-bookworm-slim AS tooling
WORKDIR /app
COPY --from=bun /usr/local/bin/bun /usr/local/bin/bun

FROM tooling AS prune
RUN bun x turbo@2.11.12 --version
COPY . .
RUN bun x turbo@2.11.12 prune web --docker

FROM tooling AS build
COPY --from=prune /app/out/json/ ./
COPY --from=prune /app/out/bun.lock ./bun.lock
RUN bun install --frozen-lockfile
COPY --from=prune /app/out/full/ ./
COPY .node-version ./
COPY assets/logo.svg ./assets/logo.svg
RUN bun run build --filter=web

FROM bun AS runtime
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0
COPY --from=build --chown=bun:bun /app/apps/web/.output/ ./.output/
USER bun
EXPOSE 3000
CMD ["bun", "run", "./.output/server/index.mjs"]
