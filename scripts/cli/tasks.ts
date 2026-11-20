import { renderUsage, type CommandContext } from "citty";
import { spawnSync } from "node:child_process";

type TaskCommand = {
  meta: { name: string; description: string };
  subCommands: Record<string, TaskCommand>;
  run: (context: CommandContext) => void | Promise<void>;
};

export function execute(executable: string, args: string[]) {
  // Replace the launcher so Ctrl-C and the exit status reach the task directly.
  if (process.platform !== "win32")
    process.execve?.(executable, [executable, ...args], process.env);
  const child = spawnSync(executable, args, { stdio: "inherit" });
  if (child.error) throw child.error;
  process.exitCode = child.status ?? 1;
}

export function createTaskCommands(taskNames: string[], options: string[], helpCommand: boolean) {
  const taskArgs = options[0] === "--" ? options.slice(1) : options;
  const help = helpCommand || ["-h", "--help"].includes(options[0]);

  function action(task?: string): TaskCommand["run"] {
    return async ({ cmd, rawArgs }) => {
      // Citty also calls ancestor actions when their subcommand finishes.
      if (rawArgs.length) {
        if (!Object.hasOwn(cmd.subCommands ?? {}, rawArgs[0])) {
          throw new Error(`Unknown command "${rawArgs[0]}". Run kpdev --help.`);
        }
        return;
      }
      if (help || (!task && !options.length)) {
        console.log(await renderUsage(cmd));
        return;
      }
      if (!task) throw new Error("Select a task. Run kpdev --help to list tasks.");
      execute(process.execPath, ["run", task, ...taskArgs]);
    };
  }

  function createCommand(name: string, description: string): TaskCommand {
    return {
      meta: { name, description },
      subCommands: Object.create(null),
      run: action(),
    };
  }

  const program = createCommand("kpdev", "Run Kipivo development tasks");
  for (const name of taskNames.sort()) {
    let command = program;
    for (const word of name.split(":")) {
      command.subCommands[word] ??= createCommand(
        `${command.meta.name} ${word}`,
        `${word} commands`,
      );
      command = command.subCommands[word];
    }
    command.meta.description = `Run the ${name} task`;
    command.run = action(name);
  }

  return program;
}
