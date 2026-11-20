import { ciTasks } from "../ci/plan";

const BUN_EXECUTABLE = process.execPath;

export const smokeCommands = {
  api: [BUN_EXECUTABLE, "scripts/smoke/api-image.ts"],
  changed: [BUN_EXECUTABLE, "scripts/smoke/changed.ts", "changed"],
  cli: [BUN_EXECUTABLE, "scripts/smoke/turbo.ts", ciTasks.cli],
  docs: [BUN_EXECUTABLE, "scripts/smoke/http-image.ts", "docs"],
  gateway: [BUN_EXECUTABLE, "scripts/smoke/compose.ts", "gateway"],
  plan: [BUN_EXECUTABLE, "scripts/smoke/changed.ts", "plan"],
  topology: [BUN_EXECUTABLE, "scripts/smoke/compose.ts", "topology"],
  web: [BUN_EXECUTABLE, "scripts/smoke/http-image.ts", "web"],
} satisfies Record<string, [string, ...string[]]>;
