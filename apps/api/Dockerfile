FROM oven/bun:1.4.4-slim AS bun
WORKDIR /app

FROM bun AS prune
RUN bun x --bun turbo@2.11.12 --version
COPY . .
RUN bun x --bun turbo@2.11.12 prune api --docker

FROM bun AS build
COPY --from=prune /app/out/json/ ./
COPY --from=prune /app/out/bun.lock ./bun.lock
COPY bunfig.toml ./
RUN bun install --frozen-lockfile
COPY --from=prune /app/out/full/ ./
RUN bun run build --filter=api

FROM bun AS runtime
ENV NODE_ENV=production HOST=0.0.0.0
COPY --from=build --chown=bun:bun /app/apps/api/.output/ ./.output/
USER bun
EXPOSE 3001
ENTRYPOINT ["bun", "/app/.output/server/index.mjs"]
CMD []
