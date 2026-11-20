import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { fumadocsMdx } from "fumadocs-mdx/vite";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";
import { docsBase, docsPort } from "./mount.ts";

export default defineConfig({
  base: `${docsBase}/`,
  resolve: { tsconfigPaths: true },
  server: { host: "127.0.0.1", port: docsPort, strictPort: true },
  plugins: [
    fumadocsMdx({ index: false }),
    tailwindcss(),
    tanstackStart({
      router: { basepath: docsBase },
      prerender: {
        enabled: true,
        autoStaticPathsDiscovery: false,
        failOnError: true,
        filter: ({ path }) => path === docsBase || path.startsWith(`${docsBase}/`),
      },
      pages: [{ path: `${docsBase}/` }, { path: `${docsBase}/search.json` }],
    }),
    nitro({ preset: "bun" }),
    react(),
  ],
});
