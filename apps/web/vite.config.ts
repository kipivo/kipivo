import { fileURLToPath } from "node:url";
import { paraglideVitePlugin } from "@inlang/paraglide-js";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { docsBase, docsPort } from "docs/mount";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

const docsAssets = fileURLToPath(new URL("../docs/.output/public", import.meta.url));

export default defineConfig({
  resolve: { tsconfigPaths: true },
  server: {
    proxy: {
      [`^${docsBase}(?:/|$)`]: { target: `http://127.0.0.1:${docsPort}`, ws: true },
    },
  },
  // Bundle the lazy workspace's store with React before the first workspace route loads.
  optimizeDeps: { include: ["zustand", "zustand/middleware"] },
  plugins: [
    paraglideVitePlugin({
      project: fileURLToPath(new URL("../../packages/i18n/project.inlang", import.meta.url)),
      outdir: fileURLToPath(new URL("../../packages/i18n/generated", import.meta.url)),
    }),
    tailwindcss(),
    tanstackStart({ server: { build: { inlineCss: true } } }),
    nitro({
      preset: "bun",
      publicAssets: [{ baseURL: docsBase, dir: docsAssets }],
      routeRules: {
        "/": { headers: { "cache-control": "no-store" } },
        "/setup": { headers: { "cache-control": "no-store" } },
        "/sign-in": { headers: { "cache-control": "no-store" } },
      },
    }),
    react(),
  ],
});
