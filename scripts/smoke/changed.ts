import { randomUUID } from "node:crypto";
import { parseArgs } from "node:util";
import { imageDefinitions, planWorkingTree } from "../ci/plan.mjs";

const interruption = new AbortController();

class CommandError extends Error {
  constructor(
    command: string[],
    readonly status: number,
  ) {
    super(`${command.slice(0, 3).join(" ")} exited with status ${status}`);
  }
}

async function run(command: string[], env = process.env, signal?: AbortSignal) {
  signal?.throwIfAborted();
  const child = Bun.spawn(command, {
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
    detached: true,
    env,
  });
  function interrupt() {
    const name = signal?.reason === 130 ? "SIGINT" : "SIGTERM";
    try {
      if (process.platform === "win32") child.kill(name);
      else process.kill(-child.pid, name);
    } catch (error) {
      if (!(error instanceof Error && "code" in error && error.code === "ESRCH")) throw error;
    }
  }
  signal?.addEventListener("abort", interrupt, { once: true });
  const status = await child.exited;
  signal?.removeEventListener("abort", interrupt);
  if (status !== 0) throw new CommandError(command, status);
}

async function main() {
  const mode = process.argv[2];
  if (mode !== "plan" && mode !== "changed") throw new Error("Expected plan or changed.");
  const { values } = parseArgs({
    args: process.argv.slice(3),
    options:
      mode === "changed"
        ? { base: { type: "string" }, build: { type: "boolean" } }
        : { base: { type: "string" } },
  });
  const plan = planWorkingTree(values.base);
  const cliReasons = plan.reasons.cli;
  const images = plan.topology ? Object.values(imageDefinitions) : plan.images;
  const topologyReason = plan.reasons.topology?.join(", ");
  const targets = [
    ...(cliReasons?.length ? [`cli: ${cliReasons.join(", ")}`] : []),
    ...plan.images.map(({ app }) => `${app}: ${plan.reasons[`${app}-image`].join(", ")}`),
    ...(plan.topology
      ? [`topology: ${topologyReason} (builds ${images.map(({ app }) => app).join(", ")})`]
      : []),
  ];
  console.log(`Smoke plan from ${plan.base.slice(0, 12)}`);
  console.log(
    targets.length
      ? targets.map((target) => `  ${target}`).join("\n")
      : "  No affected smoke targets.",
  );
  if (mode === "plan" || !targets.length) return;
  if (images.length && !values.build)
    throw new Error("Image checks require --build to test the current checkout.");

  process.on("SIGINT", () => interruption.abort(130));
  process.on("SIGTERM", () => interruption.abort(143));
  const signal = interruption.signal;
  const suffix = randomUUID();
  const builtTags: string[] = [];
  const topologyEnv = { ...process.env };
  const selected = new Set(plan.images.map(({ app }) => app));

  try {
    if (cliReasons?.length) await run([process.execPath, "run", "smoke:cli"], process.env, signal);
    for (const { app, dockerfile } of images) {
      const tag = `kipivo-${app}:smoke-${suffix}`;
      await run(["docker", "build", "--file", dockerfile, "--tag", tag, "."], process.env, signal);
      builtTags.push(tag);
      topologyEnv[`KIPIVO_TOPOLOGY_${app.toUpperCase()}_IMAGE`] = tag;
      if (selected.has(app)) {
        await run([process.execPath, "run", `smoke:${app}`, tag], process.env, signal);
      }
    }
    if (plan.topology) await run([process.execPath, "run", "smoke:topology"], topologyEnv, signal);
  } finally {
    if (builtTags.length) {
      await run(["docker", "image", "rm", "--no-prune", ...builtTags]).catch((error: unknown) => {
        console.warn(error);
        process.exitCode = 1;
      });
    }
  }
}

try {
  await main();
} catch (error) {
  if (!interruption.signal.aborted) {
    console.error(`Smoke: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = error instanceof CommandError ? error.status : 1;
  }
}
const interrupted: unknown = interruption.signal.reason;
if (typeof interrupted === "number") process.exitCode = interrupted;
