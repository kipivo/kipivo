import { defineCommand, renderUsage } from "citty";
import { scripts } from "../../../package.json";
import { execute } from "../tasks";

const helpFlags = ["-h", "--help"];

export default defineCommand({
  meta: { name: "kpdev smoke", description: "Plan and run smoke tests" },
  args: {
    target: {
      type: "positional",
      description: "Suffix of a smoke:* script in package.json",
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
  },
  async run({ cmd, args: { target }, rawArgs }) {
    const options = rawArgs.slice(2);
    if (!target || helpFlags.includes(target) || helpFlags.includes(options[0])) {
      console.log(await renderUsage(cmd));
      return;
    }

    const script = `smoke:${target}`;
    if (!Object.hasOwn(scripts, script)) {
      throw new Error(`Unknown smoke target "${target}". Run kpdev smoke --help.`);
    }
    const taskArgs = options[0] === "--" ? options.slice(1) : options;
    execute(process.execPath, ["run", script, ...taskArgs]);
  },
});
