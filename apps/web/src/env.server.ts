import "@tanstack/react-start/server-only";
import { parseHttpOrigin, z, type Preset } from "@kipivo/env";

export const webEnv = {
  id: "web",
  server: { API_ORIGIN: z.string().optional() },
} as const satisfies Preset;

export function resolveApiOrigin(apiOrigin: string | undefined, development: boolean) {
  return parseHttpOrigin(apiOrigin ?? (development ? "http://127.0.0.1:3001" : ""));
}
