import { defineConfig } from "tsdown";

export default defineConfig({
  entry: { kipivo: "./src/index.ts" },
  target: "node22",
  fixedExtension: false,
  dts: false,
  outputOptions: { codeSplitting: false },
  deps: {
    alwaysBundle: [/^@kipivo\/(?:contracts|runtime|env)(?:\/|$)/, /^(?:citty|consola|zod)(?:\/|$)/],
    neverBundle: ["bun:sqlite"],
  },
});
