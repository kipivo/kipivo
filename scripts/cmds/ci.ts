import { defineCommand, renderUsage } from "citty";
import { runPlan } from "../ci/plan";
import { execute } from "../internal/execute";

const plan = defineCommand({
  meta: { name: "kpdev ci plan", description: "Select CI jobs for a Git revision" },
  args: {
    base: { type: "string", description: "Base Git ref", valueHint: "ref" },
    head: { type: "string", description: "Head Git ref", valueHint: "ref" },
    next: { type: "boolean", description: "Use the latest successful next CI ancestor" },
    full: { type: "boolean", description: "Select all CI jobs" },
    help: { type: "boolean", alias: "h", description: "Show command help" },
  },
  async run({ args, cmd, rawArgs }) {
    if (args.help) {
      console.log(await renderUsage(cmd));
      return;
    }
    await runPlan(rawArgs);
  },
});

const test = defineCommand({
  meta: { name: "kpdev ci test", description: "Run the CI planner test suite" },
  run({ rawArgs }) {
    execute(process.execPath, ["test", "scripts/ci/plan.test.ts", ...rawArgs]);
  },
});

export default defineCommand({
  meta: { name: "kpdev ci", description: "Plan and test repository CI" },
  subCommands: Object.assign(Object.create(null), { plan, test }),
  async run({ cmd, rawArgs }) {
    if (rawArgs.every((arg) => arg.startsWith("-"))) console.log(await renderUsage(cmd));
  },
});
