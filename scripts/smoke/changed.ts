import { randomUUID } from "node:crypto";
import { parseArgs } from "node:util";
import { imageDefinitions, planWorkingTree } from "../ci/plan";
import { runSmoke, type RunCommand } from "../internal/smoke-process";
import { smokeCommands } from "./targets";

async function main(run: RunCommand) {
  const mode = process.argv[2];
  if (mode !== "plan" && mode !== "changed") throw new Error("Expected plan or changed.");
  const { values } = parseArgs({
    args: process.argv.slice(3),
    options:
      mode === "changed"
        ? { base: { type: "string" }, build: { type: "boolean" } }
        : { base: { type: "string" }, json: { type: "boolean" } },
  });
  const plan = planWorkingTree(typeof values.base === "string" ? values.base : undefined);
  const cliReasons = plan.reasons.cli;
  const images = plan.topology ? Object.values(imageDefinitions) : plan.images;
  const targets = [
    ...(cliReasons?.length ? [{ name: "cli", reasons: cliReasons }] : []),
    ...plan.images.map(({ app }) => ({ name: app, reasons: plan.reasons[`${app}-image`] ?? [] })),
    ...(plan.topology ? [{ name: "topology", reasons: plan.reasons.topology ?? [] }] : []),
  ];
  if (mode === "plan" && values.json) {
    console.log(JSON.stringify({ base: plan.base, targets, images }, null, 2));
    return;
  }

  console.log(`Smoke plan from ${plan.base.slice(0, 12)}`);
  console.log(
    targets.length
      ? targets
          .map(({ name, reasons }) => {
            const builds =
              name === "topology" ? ` (builds ${images.map(({ app }) => app).join(", ")})` : "";
            return `  ${name}: ${reasons.join(", ")}${builds}`;
          })
          .join("\n")
      : "  No affected smoke targets.",
  );
  if (mode === "plan" || !targets.length) return;
  if (images.length && !values.build)
    throw new Error("Image checks require --build to test the current checkout.");

  const suffix = randomUUID();
  const builtTags: string[] = [];
  const topologyEnv = { ...process.env };
  const selected = new Set(plan.images.map(({ app }) => app));

  let failed = false;
  let pendingTag: string | undefined;
  try {
    if (cliReasons?.length) await run(smokeCommands.cli, { stdin: "inherit" });
    for (const { app, dockerfile } of images) {
      const tag = `kipivo-${app}:smoke-${suffix}`;
      pendingTag = tag;
      await run(["docker", "build", "--file", dockerfile, "--tag", tag, "."], { stdin: "inherit" });
      builtTags.push(tag);
      pendingTag = undefined;
      topologyEnv[`KIPIVO_TOPOLOGY_${app.toUpperCase()}_IMAGE`] = tag;
      if (selected.has(app)) {
        await run([...smokeCommands[app], tag], { stdin: "inherit" });
      }
    }
    if (plan.topology) await run(smokeCommands.topology, { env: topologyEnv, stdin: "inherit" });
  } catch (error) {
    failed = true;
    throw error;
  } finally {
    if (pendingTag) {
      // Docker can tag an image just before the interrupted build reports back.
      const image = await run(
        ["docker", "image", "ls", "--quiet", "--filter", `reference=${pendingTag}`],
        {
          stdout: "pipe",
          cleanup: true,
        },
      ).catch((error: unknown) => {
        console.warn(error);
        return undefined;
      });
      if (image?.stdout.trim()) builtTags.push(pendingTag);
    }
    if (builtTags.length) {
      await run(["docker", "image", "rm", "--no-prune", ...builtTags], { cleanup: true }).catch(
        (error: unknown) => {
          if (!failed) throw error;
          console.warn(error);
        },
      );
    }
  }
}

process.exitCode = await runSmoke(main, process.cwd());
