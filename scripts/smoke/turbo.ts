import { join } from "node:path";
import { ROOT } from "../internal/root";
import { runSmoke } from "../internal/smoke-process";

process.exitCode = await runSmoke(async (run) => {
  const turbo = Bun.which("turbo", { PATH: join(ROOT, "node_modules", ".bin") });
  if (!turbo) throw new Error("Install the workspace dependencies to run Turbo.");
  // Turbo can exit with status 0 after cancellation. runSmoke preserves the signal status.
  await run([turbo, "run", ...process.argv.slice(2)]);
});
