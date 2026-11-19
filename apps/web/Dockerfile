FROM oven/bun:1.4.4-slim AS bun
WORKDIR /app

FROM bun AS prune
RUN bun x --bun turbo@2.11.12 --version
COPY . .
RUN bun x --bun turbo@2.11.12 prune web --docker

FROM bun AS build
COPY --from=prune /app/out/json/ ./
COPY --from=prune /app/out/bun.lock ./bun.lock
COPY bunfig.toml ./
RUN bun install --frozen-lockfile
COPY --from=prune /app/out/full/ ./
COPY assets/logo.svg ./assets/logo.svg
ARG VITE_CLOUDFLARE_ANALYTICS_TOKEN
ARG VITE_UMAMI_WEBSITE_ID
RUN bun run build --filter=web

FROM bun AS runtime
ENV NODE_ENV=production HOST=0.0.0.0
COPY --from=build --chown=bun:bun /app/apps/web/.output/ ./.output/
USER bun
EXPOSE 3000
CMD ["bun", "./.output/server/index.mjs"]
