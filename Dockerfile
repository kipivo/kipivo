FROM oven/bun:1.4.3-slim AS bun

FROM node:22.23.3-bookworm-slim AS build
WORKDIR /app
COPY --from=bun /usr/local/bin/bun /usr/local/bin/bun
COPY . .
RUN bun install --frozen-lockfile
RUN bun run build --filter=web

FROM bun AS runtime
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0
COPY --from=build --chown=bun:bun /app/apps/web/.output/ ./.output/
USER bun
EXPOSE 3000
CMD ["bun", "run", "./.output/server/index.mjs"]
