import { spawn } from "bun";

const args = process.argv.slice(2);
const child = spawn(["turbo", "run", ...args], {
  stdout: "inherit",
  stderr: "inherit",
  detached: true,
});

// Turbo can exit with status 0 after cancellation.
let interrupted: number | undefined;
for (const [signal, status] of [
  ["SIGINT", 130],
  ["SIGTERM", 143],
] as const) {
  process.on(signal, () => {
    if (interrupted) return;
    interrupted = status;
    try {
      if (process.platform === "win32") child.kill(signal);
      else process.kill(-child.pid, signal);
    } catch (error) {
      if (!(error instanceof Error && "code" in error && error.code === "ESRCH")) throw error;
    }
  });
}

const exitCode = await child.exited;
process.exitCode = interrupted ?? exitCode;
