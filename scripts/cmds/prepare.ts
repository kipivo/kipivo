import { existsSync } from "node:fs";
import { defineCommand, renderUsage } from "citty";
import { execute } from "../internal/execute";

export default defineCommand({
  meta: {
    name: "kpdev prepare",
    description: "Compile installed catalogs and set up local Git hooks",
  },
  args: { help: { type: "boolean", alias: "h", description: "Show command help" } },
  async run({ cmd, args }) {
    if (args.help) {
      console.log(await renderUsage(cmd));
      return;
    }

    const compile = Bun.spawnSync(
      [process.execPath, "scripts/kpdev.ts", "i18n", "compile", "--if-installed"],
      {
        stdio: ["inherit", "inherit", "inherit"],
      },
    );
    if (compile.exitCode !== 0) {
      process.exitCode = compile.exitCode;
      return;
    }

    if (process.env.CI || !existsSync(".git")) return;
    const husky = Bun.which("./node_modules/.bin/husky");
    if (husky) execute(process.execPath, [husky]);
  },
});
