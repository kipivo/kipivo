import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

export default defineConfig({
  resolve: { tsconfigPaths: true },
  // Bundle the lazy workspace's store with React before the first workspace route loads.
  optimizeDeps: { include: ["zustand", "zustand/middleware"] },
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
