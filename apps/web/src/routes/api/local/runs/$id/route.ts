import { createFileRoute } from "@tanstack/react-router";
import { proxyRuns } from "@/features/runs/local-runner.server";

export const Route = createFileRoute("/api/local/runs/$id")({
  server: {
    handlers: {
      GET: ({ request, params }) => proxyRuns(request, params.id),
    },
  },
});
