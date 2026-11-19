import "@tanstack/react-start/server-only";
import { createEnv } from "@kipivo/env";
import { createApiClient } from "@kipivo/api/client";
import { resolveApiOrigin, webEnv } from "@/env.server";

export function getInstallClient() {
  const origin = resolveApiOrigin(createEnv(webEnv).API_ORIGIN, import.meta.env.DEV);
  return origin ? createApiClient(origin) : undefined;
}
