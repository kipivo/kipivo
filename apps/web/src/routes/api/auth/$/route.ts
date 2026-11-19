import { createFileRoute } from "@tanstack/react-router";
import { proxyApi } from "@/api-proxy.server";

const proxyAuth = ({ request }: { request: Request }) =>
  proxyApi(request, "Authentication unavailable.");

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: proxyAuth,
      POST: proxyAuth,
    },
  },
});
