import { createFileRoute } from "@tanstack/react-router";
import { proxyAuth } from "../../../auth-proxy.server";

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: ({ request }) => proxyAuth(request),
      POST: ({ request }) => proxyAuth(request),
    },
  },
});
