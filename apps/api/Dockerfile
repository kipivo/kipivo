FROM oven/bun:1.4.3-slim AS bun

FROM node:22.23.3-bookworm-slim AS tooling
WORKDIR /app
COPY --from=bun /usr/local/bin/bun /usr/local/bin/bun

FROM tooling AS prune
RUN bun x turbo@2.11.11 --version
COPY . .
RUN bun x turbo@2.11.11 prune api --docker

FROM tooling AS build
COPY --from=prune /app/out/json/ ./
COPY --from=prune /app/out/bun.lock ./bun.lock
RUN bun install --frozen-lockfile
COPY --from=prune /app/out/full/ ./
COPY .node-version ./
RUN bun run build --filter=api
RUN bun build packages/db/scripts/migrate.ts --target=bun --external pg-native --outfile=/out/db/scripts/migrate.mjs

FROM bun AS runtime
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0
COPY --from=build --chown=bun:bun /app/apps/api/.output/ ./.output/
COPY --from=build --chown=bun:bun /out/db/ ./db/
COPY --from=build --chown=bun:bun /app/packages/db/drizzle/ ./db/drizzle/
USER bun
EXPOSE 3001
CMD ["bun", "./.output/server/index.mjs"]
