import { createEnv, z, type Preset } from "@kipivo/env";

const loggerEnv = {
  id: "logger",
  server: {
    NODE_ENV: z.string().default("development"),
    CI: z.string().optional(),
  },
} as const satisfies Preset;

export const envs = () => createEnv(loggerEnv);
