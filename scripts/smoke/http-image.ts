import { runSmoke } from "../internal/smoke-process";

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
process.exitCode = await runSmoke(async (run, signal) => {
  let container: string | undefined;
  let failed = false;
  try {
    const image = await run(
      ["docker", "image", "inspect", "--format", "{{.Id}}", "--", tag || `kipivo-${target}:ci`],
      { stdout: "pipe" },
    );
    signal.throwIfAborted();
    // Let Docker return the ID even if interrupted while creating the container.
    const created = await run(
      ["docker", "create", ...env, "--publish", `127.0.0.1::${port}`, image.stdout.trim()],
      { stdout: "pipe", cleanup: true },
    );
    container = created.stdout.trim();
    await run(["docker", "start", container], { stdout: "ignore" });
    const binding = await run(["docker", "port", container, `${port}/tcp`], { stdout: "pipe" });
    const origin = `http://${binding.stdout.trim()}`;
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
    failed = true;
    throw error;
  } finally {
    if (container) {
      await run(["docker", "logs", container], { cleanup: true }).catch(() => {});
      await run(["docker", "rm", "--force", "--volumes", container], {
        stdout: "ignore",
        cleanup: true,
      }).catch((error: unknown) => {
        if (!failed) throw error;
        console.error(error instanceof Error ? error.message : error);
      });
    }
  }
});
