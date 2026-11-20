import { defineCommand, renderUsage } from "citty";
import { runChecks } from "../check/run";

export default defineCommand({
  meta: { name: "kpdev check", description: "Run repository validation" },
  args: { help: { type: "boolean", alias: "h", description: "Show command help" } },
  async run({ cmd, args }) {
    if (args.help) {
      console.log(await renderUsage(cmd));
      return;
    }
    process.exitCode = runChecks();
  },
});
