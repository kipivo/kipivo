import {
  appendFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

export const jobs = ["ui", "cli", "auth", "e2e", "web-image", "api-image"];
// Entry points are the only mapping from the workspace graph to CI jobs.
const consumers = {
  storybook: ["ui"],
  web: ["auth", "e2e", "web-image"],
  api: ["auth", "e2e", "api-image"],
  kipivo: ["cli", "e2e"],
  "@kipivo/e2e": ["auth", "e2e", "api-image"],
  "@kipivo/api": [],
  "@kipivo/auth": [],
  "@kipivo/contracts": [],
  "@kipivo/db": [],
  "@kipivo/tsconfig": [],
  "@kipivo/ui": [],
  mobile: [],
};
const sharedRootInputs = new Set([
  ".gitignore",
  ".node-version",
  ".oxfmtrc.json",
  ".oxlintrc.json",
  "bun.lock",
  "knip.json",
  "package.json",
  "turbo.json",
]);
const specialInputs = new Map([
  ["Dockerfile", ["web-image"]],
  ["scripts/smoke-web.mjs", ["web-image"]],
  [".dockerignore", ["web-image", "api-image"]],
  ["assets/logo.svg", [...consumers.web, ...consumers.storybook]],
]);
const rootTurbo = fileURLToPath(new URL("../node_modules/.bin/turbo", import.meta.url));
const graphQuery = "query { packages { items { name path allDependents { items { name } } } } }";

export function fullPlan(reason) {
  return makePlan(Object.fromEntries(jobs.map((job) => [job, [reason]])));
}

export function imageMatrix(plan) {
  return [
    ...(plan["web-image"] ? [{ app: "web", dockerfile: "Dockerfile" }] : []),
    ...(plan["api-image"] ? [{ app: "api", dockerfile: "apps/api/Dockerfile" }] : []),
  ];
}

function makePlan(reasons) {
  const selection = Object.fromEntries(jobs.map((job) => [job, Boolean(reasons[job]?.length)]));
  return {
    check: true,
    ...selection,
    images: imageMatrix(selection),
    reasons: { check: ["Every change runs the repository checks"], ...reasons },
  };
}

function isRootDocumentation(path) {
  return /^README\.md$/i.test(path) || /^docs\/.*\.md$/i.test(path);
}

function sharedInputReason(path) {
  if (path.startsWith(".github/") || /^scripts\/ci-[^/]+\.mjs$/.test(path)) {
    return `CI configuration changed: ${path}`;
  }
  if (sharedRootInputs.has(path) || path.startsWith(".railway/")) {
    return `Shared repository input changed: ${path}`;
  }
}

export function selectJobs(paths, packages) {
  const reasons = {};
  const add = (job, reason) => (reasons[job] ??= []).push(reason);
  const workspaces = packages
    .filter((pkg) => pkg.name !== "//")
    .sort((a, b) => b.path.length - a.path.length);
  const changedWorkspaces = new Set();
  for (const path of paths) {
    // CI selection uses dependency edges independently of Turbo's cache inputs.
    if (isRootDocumentation(path)) continue;
    const shared = sharedInputReason(path);
    if (shared) return fullPlan(shared);
    const special = specialInputs.get(path);
    if (special) {
      for (const job of special) add(job, path);
      continue;
    }
    const owner = workspaces.find((pkg) => path.startsWith(`${pkg.path}/`));
    if (!owner) return fullPlan(`Unmapped path ${path}; update the CI mapping`);
    if (!Object.hasOwn(consumers, owner.name)) {
      return fullPlan(`Unmapped workspace ${owner.name}; update the CI mapping`);
    }
    if (/^readme\.md$/i.test(path.slice(owner.path.length + 1))) continue;
    changedWorkspaces.add(owner);
  }
  for (const owner of changedWorkspaces) {
    const affected = new Set([owner.name, ...owner.allDependents.items.map((dep) => dep.name)]);
    affected.delete("//");
    let mapped = false;
    for (const name of affected) {
      if (!Object.hasOwn(consumers, name)) {
        return fullPlan(`Unknown workspace ${name}; update the CI mapping`);
      }
      for (const job of consumers[name]) {
        add(job, name === owner.name ? name : `${owner.name} → ${name}`);
        mapped = true;
      }
    }
    if (!mapped)
      return fullPlan(`No CI consumer mapped for workspace ${owner.name}; update the CI mapping`);
  }
  return makePlan(reasons);
}

function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, encoding: "utf8", maxBuffer: 8 * 1024 * 1024 });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} failed: ${result.stderr.trim()}`);
  return result.stdout;
}

export function changedPaths(base, head, filters = []) {
  const ancestor = run("git", ["merge-base", "--", base, head]).trim();
  // No rename detection means both old and new names are always included,
  // including a rename crossing workspace boundaries and deleted files.
  return run("git", [
    "diff",
    "--name-only",
    "--no-renames",
    "--no-relative",
    "-z",
    ...filters,
    ancestor,
    head,
    "--",
  ])
    .split("\0")
    .filter(Boolean);
}

function readGraph(directory, turbo, version) {
  const graph = JSON.parse(run(turbo, ["query", graphQuery], directory));
  if (graph.version !== version || graph.errors?.length) {
    throw new Error("The workspace graph must come from the pinned root Turbo version");
  }
  const packages = graph.data.packages.items;
  if (!packages.length || packages.some((pkg) => !Array.isArray(pkg.allDependents?.items))) {
    throw new Error("Incomplete workspace graph");
  }
  return packages;
}

function turboVersion(directory) {
  const version = JSON.parse(readFileSync(join(directory, "package.json"), "utf8")).devDependencies
    ?.turbo;
  if (typeof version !== "string" || !/^\d+\.\d+\.\d+(?:-[\w.-]+)?$/.test(version)) {
    throw new Error("Expected an exact Turbo version in the root package.json");
  }
  return version;
}

function workspaceGraph(head) {
  const root = run("git", ["rev-parse", "--show-toplevel"]).trim();
  const current = run("git", ["rev-parse", "HEAD"]).trim();
  if (
    head === current &&
    !run("git", ["status", "--porcelain", "--untracked-files=normal"], root)
  ) {
    return readGraph(root, rootTurbo, turboVersion(root));
  }

  const temp = mkdtempSync(join(tmpdir(), "kipivo-ci-graph-"));
  try {
    const archive = join(temp, "head.tar");
    const checkout = join(temp, "checkout");
    mkdirSync(checkout);
    run("git", ["archive", "--format=tar", "--output", archive, head], root);
    run("tar", ["-xf", archive, "-C", checkout]);
    const version = turboVersion(checkout);
    let turbo = rootTurbo;
    if (
      spawnSync(rootTurbo, ["--version"], { cwd: temp, encoding: "utf8" }).stdout?.trim() !==
      version
    ) {
      const install = join(temp, "turbo");
      mkdirSync(install);
      writeFileSync(join(install, "package.json"), "{}");
      run(process.execPath, ["install", "--cwd", install, "--no-save", `turbo@${version}`]);
      turbo = join(install, "node_modules", ".bin", "turbo");
    }
    return readGraph(checkout, turbo, version);
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
}

export function planFromArgs(args) {
  if (args.length === 1 && args[0] === "--full") return fullPlan("Full run requested");
  if (args.length !== 4 || args[0] !== "--base" || args[2] !== "--head") {
    throw new Error("Usage: bun run ci:plan --base <sha> --head <sha> | --full");
  }
  try {
    const head = run("git", [
      "rev-parse",
      "--verify",
      "--end-of-options",
      `${args[3]}^{commit}`,
    ]).trim();
    const paths = changedPaths(args[1], head);
    for (const path of paths) {
      const reason = sharedInputReason(path);
      if (!reason) continue;
      const manifest = /^(?:apps|packages|tests)\/[^/]+\/package\.json$/;
      const added = paths.some((changed) => manifest.test(changed))
        ? changedPaths(args[1], head, ["--diff-filter=A"]).find((changed) => manifest.test(changed))
        : undefined;
      return fullPlan(
        added ? `${reason}. New workspace manifest ${added}. Update the CI mapping.` : reason,
      );
    }
    if (paths.every((path) => isRootDocumentation(path) || specialInputs.has(path))) {
      return selectJobs(paths, []);
    }
    return selectJobs(paths, workspaceGraph(head));
  } catch (error) {
    if (error.code === "ENOBUFS")
      return fullPlan("Changed path list or workspace graph exceeded the planner size limit");
    return fullPlan(
      `Cannot reliably select jobs: ${error.message.replace(/\s+/g, " ").slice(0, 500)}`,
    );
  }
}

export function writePlan(plan) {
  console.log(JSON.stringify(plan, null, 2));
  if (process.env.GITHUB_OUTPUT) {
    const selection = Object.fromEntries(jobs.map((job) => [job, plan[job]]));
    const outputs = [
      ...jobs.map((job) => `${job}=${plan[job]}`),
      `has-images=${plan.images.length > 0}`,
      `images=${JSON.stringify({ include: plan.images })}`,
      `plan=${JSON.stringify({ ...selection, images: plan.images })}`,
    ];
    appendFileSync(process.env.GITHUB_OUTPUT, `${outputs.join("\n")}\n`);
  }
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(
      process.env.GITHUB_STEP_SUMMARY,
      `## CI plan\n\n| Task | Selected | Reason |\n| --- | --- | --- |\n${["check", ...jobs]
        .map(
          (job) =>
            `| ${job} | ${plan[job] ? "yes" : "no"} | ${(plan.reasons[job] ?? ["No affected consumer"]).join("; ").replaceAll("|", "\\|").replaceAll("\n", " ")} |`,
        )
        .join("\n")}\n`,
    );
  }
}

if (import.meta.main) writePlan(planFromArgs(process.argv.slice(2)));
