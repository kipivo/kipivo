import { spawnSync } from "node:child_process";

export function execute(executable: string, args: string[]) {
  // Replace the launcher so Ctrl-C and the exit status reach the task directly.
  if (process.platform !== "win32")
    process.execve?.(executable, [executable, ...args], process.env);
  const child = spawnSync(executable, args, { stdio: "inherit" });
  if (child.error) throw child.error;
  process.exitCode = child.status ?? 1;
}
