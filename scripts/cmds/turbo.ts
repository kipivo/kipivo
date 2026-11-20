import { defineCommand } from "citty";
import { join } from "node:path";
import { execute } from "../internal/execute";
import { ROOT } from "../internal/root";

export default defineCommand({
  meta: { name: "kpdev turbo", description: "Run Turborepo commands" },
  run({ rawArgs }) {
    const turbo = Bun.which("turbo", { PATH: join(ROOT, "node_modules", ".bin") });
    if (!turbo) throw new Error("Install the workspace dependencies to run Turbo.");
    execute(turbo, rawArgs.slice(1));
  },
});
