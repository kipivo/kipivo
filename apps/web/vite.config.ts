import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

export default defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [
    tailwindcss(),
    tanstackStart({ server: { build: { inlineCss: true } } }),
    nitro({
      preset: "bun",
      routeRules: {
        "/": { headers: { "cache-control": "no-store" } },
        "/setup": { headers: { "cache-control": "no-store" } },
        "/sign-in": { headers: { "cache-control": "no-store" } },
      },
    }),
    react(),
  ],
});
