import { describe, expect, test } from "bun:test";
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { ROOT } from "../internal/root";

const resolveFromRoot = createRequire(join(ROOT, "package.json")).resolve;
const OXLINT = join(dirname(resolveFromRoot("oxlint/package.json")), "bin/oxlint");
const connection = 'import "@kipivo/runtime/local/connection";';

type Fixture = { filename: string; code: string; errors?: number };

const cases: { valid: Fixture[]; invalid: Required<Fixture>[] } = {
  valid: [
    {
      filename: "apps/web/src/account.ts",
      code: 'import type { ApiClient } from "@kipivo/contract"; export { errorStatus } from "@kipivo/orpc/errors"; import("@kipivo/orpc/client");',
    },
    {
      filename: "apps/web/src/login.ts",
      code: 'import "@kipivo/auth/errors"; import "@kipivo/auth/native";',
    },
    {
      filename: "apps/web/src/api.server.ts",
      code: 'import "@tanstack/react-start/server-only"; import "@kipivo/orpc";',
    },
    { filename: "apps/api/src/routes.ts", code: 'import "@kipivo/orpc";' },
    {
      filename: "packages/contract/src/account.ts",
      code: 'import "@orpc/contract"; import "@kipivo/account"; import "@kipivo/email/settings";',
    },
    {
      filename: "packages/core/src/account.ts",
      code: 'import "@kipivo/core/access"; import "@kipivo/rbac"; import type { EmailSettings } from "@kipivo/email/settings";',
    },
    { filename: "apps/web/src/page.ts", code: 'import "@kipivo/contracts/runs";' },
    { filename: "packages/db/scripts/run.ts", code: 'import "../src/env";' },
    { filename: "scripts/ci/result.ts", code: 'import "./plan";' },
    { filename: "apps/cli/src/index.ts", code: connection },
    { filename: "packages/runtime/src/local/test.ts", code: 'import "./connection";' },
    { filename: "apps/web/src/page.ts", code: 'import "@kipivo/runtime/env";' },
    {
      filename: "apps/web/src/proxy.server.ts",
      code: 'import "@tanstack/react-start/server-only";' + connection,
    },
  ],
  invalid: [
    { filename: "apps/web/src/page.ts", code: 'import "../../../scripts/ci/plan.ts";', errors: 1 },
    { filename: "apps/web/src/account.tsx", code: 'import "@kipivo/orpc";', errors: 1 },
    { filename: "apps/web/src/api.server.ts", code: 'import "@kipivo/orpc";', errors: 1 },
    {
      filename: "apps/web/src/api.server.ts",
      code: 'import type {} from "@tanstack/react-start/server-only"; import "@kipivo/orpc";',
      errors: 1,
    },
    {
      filename: "apps/web/src/api.ts",
      code: 'import "@tanstack/react-start/server-only"; import "@kipivo/auth/session";',
      errors: 1,
    },
    {
      filename: "apps/web/src/login.ts",
      code: 'export * from "@kipivo/auth/factory";',
      errors: 1,
    },
    {
      filename: "packages/contract/src/account.ts",
      code: 'export type { ProcedureServices } from "@kipivo/orpc";',
      errors: 1,
    },
    {
      filename: "packages/contract/src/session.ts",
      code: 'import("@kipivo/orpc/client"); import("@kipivo/core/access");',
      errors: 2,
    },
    {
      filename: "packages/core/src/access.ts",
      code: 'import "@kipivo/db"; type Connection = import("@kipivo/db/factory").Database;',
      errors: 2,
    },
    {
      filename: "packages/core/src/setup.ts",
      code: 'require("@kipivo/contract"); import("@kipivo/orpc/errors");',
      errors: 2,
    },
    {
      filename: "packages/contract/src/settings.ts",
      code: 'export * from "@kipivo/email/config";',
      errors: 1,
    },
    {
      filename: "apps/web/src/data.ts",
      code: "import(`@kipivo/db/factory?raw`);",
      errors: 1,
    },
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
        for (const file of [
          ".oxlintrc.json",
          "scripts/check/workspace-lint.ts",
          "scripts/internal/root.ts",
        ]) {
          const destination = join(cwd, file);
          mkdirSync(dirname(destination), { recursive: true });
          copyFileSync(join(ROOT, file), destination);
        }
        writeFileSync(fixture, code);

        // Disable built-in rules so each fixture exercises just the workspace rule.
        const result = Bun.spawnSync(
          [process.execPath, OXLINT, "--allow=all", "--threads=1", "--format=json", filename],
          { cwd },
        );
        const output = result.stdout.toString();
        expect(result.exitCode, result.stderr.toString() || output).toBe(errors ? 1 : 0);
        const report = JSON.parse(output) as {
          number_of_files: number;
          diagnostics: { code: string }[];
        };
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
