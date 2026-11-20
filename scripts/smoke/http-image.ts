import { fileURLToPath } from "node:url";

const targets = {
  web: { port: 8080, env: ["--env", "PORT=8080"], path: "/healthz", args: ["--production"] },
  docs: { port: 4321, env: [], path: "/docs", args: [] },
};

function isTarget(value: string | undefined): value is keyof typeof targets {
  return value !== undefined && Object.hasOwn(targets, value);
}

const [target, tag, ...extra] = process.argv.slice(2);
if (!isTarget(target) || extra.length) {
  console.error("Usage: bun scripts/smoke/http-image.ts <web|docs> [image]");
  process.exit(2);
}

const { port, env, path, args } = targets[target];
const root = fileURLToPath(new URL("../../", import.meta.url));
const interruption = new AbortController();
process.on("SIGINT", () => interruption.abort(130));
process.on("SIGTERM", () => interruption.abort(143));

class CommandError extends Error {
  constructor(
    command: string[],
    readonly exitCode: number,
  ) {
    super(`${command.slice(0, 2).join(" ")} exited with status ${exitCode}`);
  }
}

type RunOptions = { stdout?: "inherit" | "pipe" | "ignore"; signal?: AbortSignal | null };

async function run(
  command: string[],
  { stdout = "inherit", signal = interruption.signal }: RunOptions = {},
) {
  signal?.throwIfAborted();
  const child = Bun.spawn(command, {
    cwd: root,
    stdout,
    stderr: "inherit",
    detached: true,
    signal: signal ?? undefined,
  });
  const [exitCode, output] = await Promise.all([child.exited, child.stdout?.text() ?? ""]);
  signal?.throwIfAborted();
  if (exitCode !== 0) {
    throw new CommandError(command, exitCode);
  }
  return output.trim();
}

let container: string | undefined;
let exitCode = 0;
try {
  const image = await run(
    ["docker", "image", "inspect", "--format", "{{.Id}}", "--", tag || `kipivo-${target}:ci`],
    { stdout: "pipe" },
  );
  // Let Docker return the ID even if interrupted while creating the container.
  container = await run(["docker", "create", ...env, "--publish", `127.0.0.1::${port}`, image], {
    stdout: "pipe",
    signal: null,
  });
  await run(["docker", "start", container], { stdout: "ignore" });
  const binding = await run(["docker", "port", container, `${port}/tcp`], { stdout: "pipe" });
  const origin = `http://${binding}`;
  await run(
    [
      "curl",
      "--fail",
      "--silent",
      "--show-error",
      "--retry",
      "20",
      "--retry-all-errors",
      "--retry-delay",
      "1",
      "--max-time",
      "2",
      origin + path,
    ],
    { stdout: target === "docs" ? "ignore" : "inherit" },
  );
  await run([process.execPath, `scripts/smoke/${target}.ts`, origin, ...args]);
} catch (error) {
  if (!interruption.signal.aborted) console.error(error instanceof Error ? error.message : error);
  exitCode = error instanceof CommandError ? error.exitCode : 1;
} finally {
  if (container) {
    await run(["docker", "logs", container], { signal: null }).catch(() => {});
    try {
      await run(["docker", "rm", "--force", "--volumes", container], {
        stdout: "ignore",
        signal: null,
      });
    } catch (error) {
      console.error(error instanceof Error ? error.message : error);
      exitCode ||= error instanceof CommandError ? error.exitCode : 1;
    }
  }
}
const reason: unknown = interruption.signal.reason;
process.exitCode = typeof reason === "number" ? reason : exitCode;
