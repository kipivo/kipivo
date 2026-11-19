import { spawn } from "node:child_process";

type CheckEvents = {
  onLog(text: string): void;
  onFinish(exitCode: number | null, error: string | null): void;
};

export function startCheck(repo: string, timeoutMs: number, events: CheckEvents) {
  const onLog = events.onLog.bind(events);
  const onFinish = events.onFinish.bind(events);
  const child = spawn(process.execPath, ["run", "check"], {
    cwd: repo,
    detached: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  let error: string | null = null;
  let forceTimer: ReturnType<typeof setTimeout> | undefined;

  function signalGroup(signal: NodeJS.Signals) {
    if (child.pid === undefined) return;
    try {
      process.kill(-child.pid, signal);
    } catch (cause) {
      if (!(cause instanceof Error) || !("code" in cause) || cause.code !== "ESRCH") throw cause;
    }
  }

  function stop(reason: "timeout" | "interrupted") {
    if (error) return;
    error = reason;
    signalGroup("SIGTERM");
    forceTimer = setTimeout(() => signalGroup("SIGKILL"), 5000);
  }

  const timer = setTimeout(() => stop("timeout"), timeoutMs);
  const done = new Promise<void>((resolve) => {
    child.stdout.setEncoding("utf8").on("data", onLog);
    child.stderr.setEncoding("utf8").on("data", onLog);
    child.once("error", () => {
      error ??= "could not start bun run check";
    });
    child.once("close", (code, signal) => {
      clearTimeout(timer);
      clearTimeout(forceTimer);
      if (error === "timeout" || error === "interrupted") signalGroup("SIGKILL");
      onFinish(code, error ?? (signal ? `terminated by ${signal}` : null));
      resolve();
    });
  });

  return { done, stop: () => stop("interrupted") };
}
