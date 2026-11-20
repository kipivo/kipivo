#!/usr/bin/env bun
import { defineCommand, runCommand } from "citty";
import { scripts } from "../package.json";
import { createTaskCommands, listRunnableScripts } from "./internal/repository-scripts";
import { ROOT } from "./internal/root";

async function main(argv: string[]) {
  const commands = {
    check: () => import("./cmds/check").then((module) => module.default),
    ci: () => import("./cmds/ci").then((module) => module.default),
    commit: () => import("./cmds/commit").then((module) => module.default),
    run: () => import("./cmds/run").then((module) => module.default(runnableScripts)),
    runner: () => import("./cmds/runner").then((module) => module.default),
    smoke: () => import("./cmds/smoke").then((module) => module.default),
    turbo: () => import("./cmds/turbo").then((module) => module.default),
  };
  const runnableScripts = listRunnableScripts(scripts, commands);
  const firstOption = argv.findIndex((arg) => arg.startsWith("-"));
  const words = firstOption === -1 ? argv : argv.slice(0, firstOption);
  const options = firstOption === -1 ? [] : argv.slice(firstOption);
  const program = createTaskCommands(runnableScripts, options);
  const root = defineCommand({
    ...program,
    subCommands: Object.assign(Object.create(null), program.subCommands, commands),
  });

  const rawArgs = Object.hasOwn(commands, argv[0]) ? argv : words;
  await runCommand(root, { rawArgs });
}

try {
  process.chdir(ROOT);
  await main(process.argv.slice(2));
} catch (error) {
  console.error(`kpdev: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
