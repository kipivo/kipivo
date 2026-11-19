import { createFileRoute } from "@tanstack/react-router";
import { proxyApi } from "@/api-proxy.server";

export const Route = createFileRoute("/api/v1/$")({
  server: {
    handlers: {
      GET: ({ request }) => proxyApi(request),
      POST: ({ request }) => proxyApi(request),
      PUT: ({ request }) => proxyApi(request),
    },
  },
});
