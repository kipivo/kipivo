import { createFileRoute } from "@tanstack/react-router";
import { proxyApi } from "@/api-proxy.server";

export const Route = createFileRoute("/rpc/$")({
  server: {
    handlers: {
      GET: ({ request }) => proxyApi(request),
      POST: ({ request }) => proxyApi(request),
    },
  },
});
