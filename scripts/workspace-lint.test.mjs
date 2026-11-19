import { describe, expect, test } from "bun:test";
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const oxlint = fileURLToPath(new URL("bin/oxlint", import.meta.resolve("oxlint/package.json")));
const connection = 'import "@kipivo/runtime/local/connection";';

const cases = {
  valid: [
    { filename: "apps/web/src/page.ts", code: 'import "@kipivo/contracts/runs";' },
    { filename: "packages/db/scripts/run.ts", code: 'import "../src/env";' },
    { filename: "apps/cli/src/index.ts", code: connection },
    { filename: "packages/runtime/src/local/test.ts", code: 'import "./connection";' },
    { filename: "apps/web/src/page.ts", code: 'import "@kipivo/runtime/env";' },
    {
      filename: "apps/web/src/proxy.server.ts",
      code: 'import "@tanstack/react-start/server-only";' + connection,
    },
  ],
  invalid: [
    {
      filename: "apps/web/src/page.ts",
      code: 'import "../../../packages/runtime/src/local/connection";',
      errors: 1,
    },
    { filename: "apps/web/src/page.ts", code: connection, errors: 1 },
    { filename: "apps/web/src/proxy.server.ts", code: connection, errors: 1 },
    {
      filename: "apps/mobile/src/app.ts",
      code: 'export * from "@kipivo/runtime/local/connection";',
      errors: 1,
    },
    {
      filename: "apps/web/src/page.ts",
      code: 'import("../../../packages/db/src/env");',
      errors: 1,
    },
    { filename: "packages/env/src/env.ts", code: 'export * from "../../db/src/env";', errors: 1 },
    { filename: "packages/env/src/env.ts", code: 'import "../../db/scripts/migrate";', errors: 1 },
    {
      filename: "apps/web/src/page.ts",
      code: 'import "@kipivo/runtime/local/connection?raw";',
      errors: 1,
    },
    {
      filename: "apps/web/src/page.ts",
      code: 'type Private = import("@kipivo/db/src/env").Env;',
      errors: 1,
    },
  ],
};

describe("workspace-imports", () => {
  for (const { filename, code, errors = 0 } of [...cases.valid, ...cases.invalid]) {
    test(`${filename} · ${code}`, () => {
      const cwd = mkdtempSync(join(tmpdir(), "kipivo-workspace-lint-"));
      try {
        const fixture = join(cwd, filename);
        mkdirSync(dirname(fixture), { recursive: true });
        mkdirSync(join(cwd, "scripts"), { recursive: true });
        copyFileSync(join(root, ".oxlintrc.json"), join(cwd, ".oxlintrc.json"));
        copyFileSync(
          join(root, "scripts/workspace-lint.mjs"),
          join(cwd, "scripts/workspace-lint.mjs"),
        );
        writeFileSync(fixture, code);

        // Disable built-in rules so each fixture exercises just the workspace rule.
        const result = Bun.spawnSync(
          [process.execPath, oxlint, "--allow=all", "--threads=1", "--format=json", filename],
          { cwd },
        );
        const output = result.stdout.toString();
        expect(result.exitCode, result.stderr.toString() || output).toBe(errors ? 1 : 0);
        const report = JSON.parse(output);
        expect(report.number_of_files).toBe(1);
        expect(report.diagnostics.map(({ code }) => code)).toEqual(
          Array(errors).fill("kipivo(workspace-imports)"),
        );
      } finally {
        rmSync(cwd, { recursive: true, force: true });
      }
    });
  }
});
