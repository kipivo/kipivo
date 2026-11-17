import { defineConfig } from "tsdown";

export default defineConfig({
  entry: { kipivo: "./src/index.ts" },
  target: "node22",
  fixedExtension: false,
  dts: false,
  deps: {
    alwaysBundle: [/^@kipivo\/contracts(?:\/|$)/, /^zod(?:\/|$)/],
    neverBundle: ["bun:sqlite"],
  },
});
