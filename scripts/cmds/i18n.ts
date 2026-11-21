import { defineCommand, renderUsage } from "citty";
import { execute } from "../internal/execute";

const helpArg = {
  help: { type: "boolean", alias: "h", description: "Show command help" },
} as const;

const compile = defineCommand({
  meta: {
    name: "kpdev i18n compile",
    description: "Compile the message catalogs into packages/i18n/generated",
  },
  args: helpArg,
  async run({ cmd, args }) {
    if (args.help) {
      console.log(await renderUsage(cmd));
      return;
    }
    execute(process.execPath, ["run", "--cwd", "packages/i18n", "compile"]);
  },
});

const check = defineCommand({
  meta: {
    name: "kpdev i18n check",
    description: "Report unused and missing message ids",
  },
  args: helpArg,
  async run({ cmd, args }) {
    if (args.help) {
      console.log(await renderUsage(cmd));
      return;
    }
    execute(process.execPath, ["scripts/check/i18n-messages.ts"]);
  },
});

export default defineCommand({
  meta: { name: "kpdev i18n", description: "Compile and check the message catalogs" },
  subCommands: Object.assign(Object.create(null), { compile, check }),
  async run({ cmd, rawArgs }) {
    if (rawArgs.every((arg) => arg.startsWith("-"))) console.log(await renderUsage(cmd));
  },
});
