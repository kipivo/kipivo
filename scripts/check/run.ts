import { spawnSync } from "node:child_process";
import { constants } from "node:os";
import { ROOT } from "../internal/root";

const CHECKS = [
  ["run", "format:check"],
  ["run", "lint"],
  ["run", "kpdev", "ci", "test"],
  ["run", "db:check"],
  ["run", "typecheck"],
  ["run", "tsc", "-p", ".railway/tsconfig.json"],
  ["run", "knip"],
  ["scripts/check/i18n-messages.ts"],
  ["test", "scripts/kpdev.test.ts", "scripts/check/i18n-usage.test.ts"],
  ["run", "test"],
];

export function runChecks() {
  for (const args of CHECKS) {
    const { error, signal, status } = spawnSync(process.execPath, args, {
      cwd: ROOT,
      stdio: "inherit",
    });
    if (error) throw error;
    if (status !== 0) return status ?? (signal ? 128 + constants.signals[signal] : 1);
  }
  return 0;
}
