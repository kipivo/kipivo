import { createEnv, z, type Preset } from "@kipivo/env";

export const runtimeEnv = {
  id: "runtime",
  server: { KIPIVO_HOME: z.string().optional() },
} as const satisfies Preset;

export const envs = () => createEnv(runtimeEnv);
