import { defineRailway, github, project, service } from "railway/iac";

export default defineRailway(() => {
  const web = service("web", {
    source: github("kipivo/kipivo", { branch: "main" }),
    healthcheck: "/healthz",
    replicas: 1,
  });

  return project("kipivo", { resources: [web] });
});
