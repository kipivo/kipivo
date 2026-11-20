import { fileURLToPath } from "node:url";
import { scripts } from "../../package.json";
import { runCommands } from "./commands";

try {
  process.chdir(fileURLToPath(new URL("../../", import.meta.url)));
  await runCommands(process.argv.slice(2), scripts);
} catch (error) {
  console.error(`kpdev: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
