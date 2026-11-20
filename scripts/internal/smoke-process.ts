import { ROOT } from "./root";

type RunOptions = {
  stdin?: "inherit";
  stdout?: "inherit" | "pipe" | "ignore";
  stderr?: "inherit" | "pipe";
  env?: NodeJS.ProcessEnv;
  cleanup?: boolean;
};

export type RunCommand = (
  command: string[],
  options?: RunOptions,
) => Promise<{ stdout: string; stderr: string }>;

class CommandError extends Error {
  constructor(
    command: string[],
    readonly exitCode: number,
    stderr: string,
  ) {
    const detail = stderr.trim();
    super(
      `${command.slice(0, 2).join(" ")} exited with status ${exitCode}${detail ? `\n${detail}` : ""}`,
    );
  }
}

export async function runSmoke(
  main: (run: RunCommand, signal: AbortSignal) => Promise<void>,
  cwd = ROOT,
) {
  const interruption = new AbortController();
  const stop = () => interruption.abort(130);
  const terminate = () => interruption.abort(143);
  process.on("SIGINT", stop);
  process.on("SIGTERM", terminate);

  const run: RunCommand = async (
    command,
    { stdin, stdout = "inherit", stderr = "inherit", env = process.env, cleanup = false } = {},
  ) => {
    const signal = cleanup ? undefined : interruption.signal;
    signal?.throwIfAborted();
    const child = Bun.spawn(command, { cwd, detached: true, stdin, stdout, stderr, env });
    const interrupt = () => {
      const name = signal?.reason === 130 ? "SIGINT" : "SIGTERM";
      try {
        if (process.platform === "win32") child.kill(name);
        else process.kill(-child.pid, name);
      } catch (error) {
        if (!(error instanceof Error && "code" in error && error.code === "ESRCH")) throw error;
      }
    };
    signal?.addEventListener("abort", interrupt, { once: true });
    try {
      const [status, output, errors] = await Promise.all([
        child.exited,
        child.stdout?.text() ?? "",
        child.stderr?.text() ?? "",
      ]);
      signal?.throwIfAborted();
      if (status !== 0) throw new CommandError(command, status, errors);
      return { stdout: output, stderr: errors };
    } finally {
      signal?.removeEventListener("abort", interrupt);
    }
  };

  let exitCode = 0;
  try {
    await main(run, interruption.signal);
  } catch (error) {
    if (!interruption.signal.aborted) {
      console.error(error instanceof Error ? error.message : error);
      exitCode = error instanceof CommandError ? error.exitCode : 1;
    }
  } finally {
    process.off("SIGINT", stop);
    process.off("SIGTERM", terminate);
  }
  const reason: unknown = interruption.signal.reason;
  return typeof reason === "number" ? reason : exitCode;
}
