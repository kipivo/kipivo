import { defineRailway, github, postgres, preserve, project, service } from "railway/iac";

export default defineRailway(() => {
  const source = github("kipivo/kipivo", { branch: "main" });
  const common = [
    "/package.json",
    "/bun.lock",
    "/turbo.json",
    "/.node-version",
    "/.dockerignore",
    "/packages/tsconfig/**",
  ];
  const db = postgres("postgres");
  const api = service("api", {
    source,
    build: {
      builder: "DOCKERFILE",
      dockerfilePath: "/apps/api/Dockerfile",
      watchPatterns: [
        ...common,
        "/apps/api/**",
        "/packages/api/**",
        "/packages/db/**",
        "/packages/auth/**",
      ],
    },
    deploy: { preDeployCommand: ["bun db/scripts/migrate.mjs"] },
    env: {
      HOST: "::",
      PORT: "3001",
      DATABASE_URL: db.env.DATABASE_URL,
      BETTER_AUTH_URL: preserve(),
      BETTER_AUTH_SECRET: preserve(),
    },
    healthcheck: "/readyz",
    replicas: 1,
  });
  const web = service("web", {
    source,
    build: {
      builder: "DOCKERFILE",
      dockerfilePath: "/Dockerfile",
      watchPatterns: [
        ...common,
        "/Dockerfile",
        "/assets/logo.svg",
        "/apps/web/**",
        "/packages/ui/**",
        "/packages/contracts/**",
      ],
    },
    env: { API_ORIGIN: "http://${{api.RAILWAY_PRIVATE_DOMAIN}}:3001" },
    healthcheck: "/healthz",
    replicas: 1,
  });

  return project("kipivo", { resources: [web, api, db] });
});
