import { defineCommand, renderUsage, runCommand } from "citty";
import { createTaskCommands, execute } from "./tasks";

const internalScripts = new Set(["kpdev", "kipivo", "kpvo", "prepare"]);

export async function runCommands(argv: string[], scripts: Record<string, string>) {
  const helpCommand = argv[0] === "help";
  const input = helpCommand ? argv.slice(1) : argv;

  const commands = {
    run: defineCommand({
      meta: { name: "kpdev run", description: "Run a repository script by name" },
      args: {
        script: {
          type: "positional",
          description: "Script name in package.json",
          required: false,
        },
      },
      async run({ cmd, args: { script }, rawArgs }) {
        if (!script || script.startsWith("-")) {
          console.log(await renderUsage(cmd));
          return;
        }
        const isSmokeScript = script.startsWith("smoke:") && Object.hasOwn(scripts, script);
        if (!taskNames.includes(script) && !isSmokeScript) {
          throw new Error(`Unknown repository script "${script}".`);
        }
        execute(process.execPath, ["run", script, ...rawArgs.slice(2)]);
      },
    }),
    runner: () => import("./commands/runner").then((module) => module.default),
    smoke: () => import("./commands/smoke").then((module) => module.default),
    turbo: () => import("./commands/turbo").then((module) => module.default),
  };
  const taskNames = Object.keys(scripts).filter((name) => {
    const [command] = name.split(":", 1);
    return command !== "build" && !internalScripts.has(name) && !Object.hasOwn(commands, command);
  });

  const firstOption = input.findIndex((arg) => arg.startsWith("-"));
  const words = firstOption === -1 ? input : input.slice(0, firstOption);
  const options = firstOption === -1 ? [] : input.slice(firstOption);
  const program = createTaskCommands(taskNames, options, helpCommand);
  const main = defineCommand({
    ...program,
    subCommands: Object.assign(Object.create(null), program.subCommands, commands),
  });

  const [name, ...args] = input;
  if (helpCommand) {
    if (name === "runner" || name === "turbo") args.push("--help");
    else args.unshift("--help");
  }
  // The separator keeps forwarded arguments intact in Citty's rawArgs.
  const rawArgs = Object.hasOwn(commands, name) ? [name, "--", ...args] : words;
  await runCommand(main, { rawArgs });
}
