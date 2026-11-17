import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

export default defineConfig({
  server: { host: "127.0.0.1", port: 3001, strictPort: true },
  plugins: [
    nitro({
      preset: "bun",
      serverEntry: "./server.ts",
      plugins: ["./src/plugins/resources.ts"],
    }),
  ],
});
