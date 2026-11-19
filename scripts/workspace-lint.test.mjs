import { describe, it } from "node:test";
import { RuleTester } from "oxlint/plugins-dev";
import { fileURLToPath } from "node:url";
import plugin from "./workspace-lint.mjs";

RuleTester.describe = describe;
RuleTester.it = it;
const tester = new RuleTester({ cwd: fileURLToPath(new URL("../", import.meta.url)) });
const connection = 'import "@kipivo/runtime/local/connection";';

tester.run("workspace-imports", plugin.rules["workspace-imports"], {
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
});
