import { createFileRoute } from "@tanstack/react-router";
import { proxyRuns } from "@/features/runs/local-runner.server";

export const Route = createFileRoute("/api/local/runs/")({
  server: {
    handlers: {
      GET: ({ request }) => proxyRuns(request),
      POST: ({ request }) => proxyRuns(request),
    },
  },
});
