import { defineRailway, github, postgres, preserve, project, redis, service } from "railway/iac";

export default defineRailway(() => {
  const source = github("kipivo/kipivo", { branch: "next", checkSuites: true });
  const common = [
    "/package.json",
    "/bun.lock",
    "/turbo.json",
    "/bunfig.toml",
    "/.dockerignore",
    "/packages/env/**",
    "/packages/email/**",
    "/packages/tsconfig/**",
  ];
  const db = postgres("postgres");
  const cache = redis("redis");
  const gateway = service("gateway", {
    source,
    build: {
      builder: "DOCKERFILE",
      dockerfilePath: "/.railway/gateway/Dockerfile",
      watchPatterns: [
        "/.railway/gateway/Caddyfile",
        "/.railway/gateway/Dockerfile",
        "/.dockerignore",
      ],
    },
    env: {
      PORT: "8080",
      WEB_UPSTREAM: "${{web.RAILWAY_PRIVATE_DOMAIN}}:8080",
      API_UPSTREAM: "${{api.RAILWAY_PRIVATE_DOMAIN}}:3001",
      DOCS_UPSTREAM: "${{docs.RAILWAY_PRIVATE_DOMAIN}}:4321",
      WEB_ALIAS_HOST: preserve(),
      AUTH_URL: "${{api.AUTH_URL}}",
    },
    healthcheck: "/gateway-healthz",
    replicas: 1,
  });
  const api = service("api", {
    source,
    build: {
      builder: "DOCKERFILE",
      dockerfilePath: "/apps/api/Dockerfile",
      watchPatterns: [
        ...common,
        "/apps/api/**",
        "/packages/account/**",
        "/packages/admin/**",
        "/packages/contract/**",
        "/packages/core/**",
        "/packages/db/**",
        "/packages/logger/**",
        "/packages/orpc/**",
        "/packages/rbac/**",
        "/packages/auth/**",
        "/packages/cache/**",
        "/packages/storage/**",
      ],
    },
    deploy: { preDeployCommand: [] },
    env: {
      HOST: "::",
      PORT: "3001",
      API_TRUST_PROXY: "true",
      DATABASE_URL: db.env.DATABASE_URL,
      DB_MIGRATE_ON_START: "true",
      AUTH_URL: preserve(),
      AUTH_SECRET: preserve(),
      AUTH_TRUSTED_ORIGINS: preserve(),
      AUTH_COOKIE_DOMAIN: preserve(),
      GOOGLE_CLIENT_ID: preserve(),
      GOOGLE_CLIENT_SECRET: preserve(),
      GITHUB_CLIENT_ID: preserve(),
      GITHUB_CLIENT_SECRET: preserve(),
      REDIS_URL: cache.env.REDIS_URL,
      S3_ENDPOINT: preserve(),
      S3_BUCKET: preserve(),
      S3_REGION: preserve(),
      S3_ACCESS_KEY_ID: preserve(),
      S3_SECRET_ACCESS_KEY: preserve(),
    },
    healthcheck: "/readyz",
    replicas: 1,
  });
  const web = service("web", {
    source,
    build: {
      builder: "DOCKERFILE",
      dockerfilePath: "/apps/web/Dockerfile",
      watchPatterns: [
        ...common,
        "/assets/logo.svg",
        "/apps/web/**",
        "/apps/docs/**",
        "/packages/auth/package.json",
        "/packages/auth/tsconfig.json",
        "/packages/auth/turbo.json",
        "/packages/auth/src/errors.ts",
        "/packages/auth/src/native/contract.ts",
        "/packages/account/**",
        "/packages/admin/**",
        "/packages/contract/**",
        "/packages/orpc/package.json",
        "/packages/orpc/tsconfig.json",
        "/packages/orpc/turbo.json",
        "/packages/orpc/src/client/**",
        "/packages/rbac/**",
        "/packages/ui/**",
        "/packages/i18n/**",
        "/packages/icons/**",
        "/packages/contracts/**",
        "/packages/runtime/**",
      ],
    },
    env: {
      API_ORIGIN: "http://${{api.RAILWAY_PRIVATE_DOMAIN}}:3001",
      VITE_CLOUDFLARE_ANALYTICS_TOKEN: preserve(),
      VITE_UMAMI_WEBSITE_ID: "2cd5f281-2351-4e31-b2ef-623552e62cb5",
    },
    healthcheck: "/healthz",
    replicas: 1,
  });
  const docs = service("docs", {
    source,
    build: {
      builder: "DOCKERFILE",
      dockerfilePath: "/apps/docs/Dockerfile",
      watchPatterns: [
        "/package.json",
        "/bun.lock",
        "/turbo.json",
        "/bunfig.toml",
        "/.dockerignore",
        "/packages/tsconfig/**",
        "/packages/ui/**",
        "/packages/icons/**",
        "/assets/logo.svg",
        "/apps/docs/**",
      ],
    },
    env: { HOST: "::", PORT: "4321" },
    healthcheck: "/docs",
    replicas: 1,
  });

  return project("kipivo", { resources: [gateway, web, api, docs, db, cache] });
});
