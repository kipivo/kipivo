import { locales } from "@kipivo/i18n/runtime";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { fumadocsMdx } from "fumadocs-mdx/vite";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";
import { guideUrl } from "./src/language";
import { docsBase, docsPort } from "./mount.ts";

export default defineConfig({
  base: `${docsBase}/`,
  resolve: { tsconfigPaths: true },
  server: { host: "127.0.0.1", port: docsPort, strictPort: true },
  plugins: [
    fumadocsMdx({ index: false }),
    tailwindcss(),
    tanstackStart({
      // The router rewrite owns the public mount path and its slashless home URL.
      router: { basepath: "/" },
    }),
    nitro({
      preset: "bun",
      prerender: {
        routes: [...locales.map((locale) => guideUrl([], locale)), `${docsBase}/search.json`],
        crawlLinks: true,
        failOnError: true,
        // These links belong to the main site. The Docs home is seeded above.
        ignore: [/^\/$/, "/api/"],
      },
    }),
    react(),
  ],
});
