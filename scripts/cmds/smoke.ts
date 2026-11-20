import { defineCommand, renderUsage } from "citty";
import { execute } from "../internal/execute";
import { smokeCommands } from "../smoke/targets";

const HELP_FLAGS = ["-h", "--help"];

export default defineCommand({
  meta: { name: "kpdev smoke", description: "Plan and run smoke tests" },
  args: {
    target: {
      type: "positional",
      description: "Smoke target to run",
      required: false,
    },
    base: {
      type: "string",
      description: "Compare with the merge base of this Git ref and HEAD (plan and changed)",
      valueHint: "ref",
    },
    build: {
      type: "boolean",
      description: "Build selected images before testing (changed)",
    },
    json: { type: "boolean", description: "Print the plan as JSON (plan)" },
  },
  async run({ cmd, rawArgs }) {
    const [target, ...options] = rawArgs;
    if (!target || HELP_FLAGS.includes(target) || HELP_FLAGS.includes(options[0])) {
      console.log(await renderUsage(cmd));
      return;
    }

    if (!Object.hasOwn(smokeCommands, target)) {
      throw new Error(`Unknown smoke target "${target}". Run kpdev smoke --help.`);
    }
    const [executable, ...args] = smokeCommands[target as keyof typeof smokeCommands];
    const taskArgs = options[0] === "--" ? options.slice(1) : options;
    execute(executable, [...args, ...taskArgs]);
  },
});
