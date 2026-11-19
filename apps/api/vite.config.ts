import { nitro } from "nitro/vite";
import { cp } from "node:fs/promises";
import { join } from "node:path";
import { defineConfig } from "vite";

const migrations = new URL("../../packages/db/drizzle/", import.meta.url);

export default defineConfig({
  server: { host: "127.0.0.1", port: 3001, strictPort: true },
  plugins: [
    nitro({
      preset: "bun",
      serverEntry: "./src/server.ts",
      plugins: ["./src/plugins/resources.ts"],
      hooks: {
        async compiled({ options }) {
          await cp(migrations, join(options.output.serverDir, "drizzle"), { recursive: true });
        },
      },
    }),
    {
      name: "kipivo:wait-for-api",
      async configureServer(server) {
        const worker = server.environments.nitro;
        if (!worker || !("dispatchFetch" in worker) || typeof worker.dispatchFetch !== "function") {
          throw new Error("Nitro development worker is unavailable.");
        }

        // Dispatch internally so the server entry can finish before Vite binds its port.
        const health: Response = await worker.dispatchFetch(
          new Request("http://localhost/healthz"),
        );
        await health.body?.cancel();
        if (!health.ok) throw new Error(`API startup returned HTTP ${health.status}.`);
      },
    },
  ],
});
