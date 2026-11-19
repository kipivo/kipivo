import { createFileRoute } from "@tanstack/react-router";
import { proxyApi } from "@/api-proxy.server";

export const Route = createFileRoute("/api/openapi.json")({
  server: {
    handlers: {
      GET: ({ request }) => proxyApi(request),
    },
  },
});
