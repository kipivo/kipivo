import { randomUUID } from "node:crypto";
import { runSmoke, type RunCommand } from "../internal/smoke-process";

async function checkCompose(run: RunCommand, target: "gateway" | "topology", tag?: string) {
  const gateway = target === "gateway";
  const env = { ...process.env };
  if (gateway) {
    const image = await run(
      ["docker", "image", "inspect", "--format", "{{.Id}}", "--", tag || "kipivo-gateway:ci"],
      { stdout: "pipe" },
    );
    env.KIPIVO_GATEWAY_SMOKE_IMAGE = image.stdout.trim();
  }

  const compose = [
    "docker",
    "compose",
    "--file",
    gateway ? ".railway/gateway/smoke/compose.yml" : ".railway/topology/compose.yml",
    "--project-name",
    `kipivo-${target}-smoke-${randomUUID()}`,
  ];
  await run(["docker", "compose", "version"], { stdout: "ignore" });
  if (!gateway)
    await run([...compose, "pull", "--policy", "missing", "postgres", "redis", "smoke"], { env });

  let failed = false;
  try {
    const up = gateway
      ? ["--wait", "--wait-timeout", "60"]
      : ["--no-build", "--wait", "--wait-timeout", "90", "gateway"];
    const test = gateway
      ? ["exec", "-T", "upstream", "bun", "/smoke/test.mjs"]
      : ["run", "--rm", "-T", "smoke"];
    await run([...compose, "up", ...up], { env });
    await run([...compose, ...test], { env });
  } catch (error) {
    failed = true;
    await run([...compose, "logs", "--no-color"], { env, cleanup: true }).catch(() => {});
    throw error;
  } finally {
    const down = gateway ? ["down", "--volumes"] : ["down", "--volumes", "--remove-orphans"];
    await run([...compose, ...down], { env, cleanup: true }).catch((error: unknown) => {
      if (!failed) throw error;
      console.error(error);
    });
  }
}

export async function runComposeSmoke([target, tag, ...extra]: string[]) {
  if (
    (target !== "gateway" && target !== "topology") ||
    extra.length ||
    (target === "topology" && tag !== undefined)
  ) {
    console.error("Usage: kpdev smoke gateway [image] | kpdev smoke topology");
    return 2;
  }
  return runSmoke((run) => checkCompose(run, target, tag));
}

if (import.meta.main) process.exitCode = await runComposeSmoke(process.argv.slice(2));
