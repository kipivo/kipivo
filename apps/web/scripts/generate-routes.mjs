import { resolveConfig } from "vite";

// The TanStack Start plugin writes the route tree when Vite resolves its config.
await resolveConfig({}, "serve", "development");
