import { defineEnv, z } from "@kipivo/env";

export const env = defineEnv({
  schema: z.object({
    VITE_CLOUDFLARE_ANALYTICS_TOKEN: z.string().trim().optional(),
    VITE_UMAMI_WEBSITE_ID: z.string().trim().optional(),
  }),
  runtimeEnv: {
    VITE_CLOUDFLARE_ANALYTICS_TOKEN: import.meta.env.VITE_CLOUDFLARE_ANALYTICS_TOKEN,
    VITE_UMAMI_WEBSITE_ID: import.meta.env.VITE_UMAMI_WEBSITE_ID,
  },
});
