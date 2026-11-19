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

const imageJobs = ["web-image", "api-image", "gateway-image"];
export const jobs = ["ui", "cli", "mobile", "auth", "e2e", ...imageJobs];
// Entry points are the only mapping from the workspace graph to CI jobs.
const consumers = {
  storybook: ["ui"],
  web: ["ui", "auth", "e2e", "web-image"],
  api: ["auth", "e2e", "api-image"],
  kipivo: ["cli", "e2e"],
  "@kipivo/e2e": ["auth", "e2e", "api-image"],
  "@kipivo/account": [],
  "@kipivo/admin": [],
  "@kipivo/api": [],
  "@kipivo/auth": [],
  "@kipivo/cache": [],
  "@kipivo/contracts": [],
  "@kipivo/core": [],
  "@kipivo/db": [],
  "@kipivo/email": [],
  "@kipivo/env": [],
  "@kipivo/icons": [],
  "@kipivo/logger": [],
  "@kipivo/rbac": [],
  "@kipivo/runtime": [],
  "@kipivo/storage": [],
  "@kipivo/tsconfig": [],
  "@kipivo/ui": [],
  mobile: ["mobile"],
};
const sharedRootInputs = new Set([
  ".gitignore",
  ".oxfmtrc.json",
  ".oxlintrc.json",
  "bun.lock",
  "bunfig.toml",
  "knip.json",
  "package.json",
  "turbo.json",
]);
const imageInputs = new Map([
  ["apps/web/Dockerfile", ["web-image"]],
  ["scripts/smoke-web-image.sh", ["web-image"]],
  ["scripts/smoke-web.mjs", ["web-image"]],
  ["scripts/smoke-api-image.sh", ["api-image"]],
  ["scripts/smoke-gateway-image.sh", ["gateway-image"]],
  [".dockerignore", imageJobs],
]);
const specialInputs = new Map([
  ...imageInputs,
  ["scripts/smoke-cli.sh", ["cli"]],
  ["scripts/workspace-lint.mjs", []],
  ["scripts/workspace-lint.test.mjs", []],
  ["assets/logo.svg", [...new Set([...consumers.web, ...consumers.storybook])]],
]);
const rootTurbo = fileURLToPath(new URL("../node_modules/.bin/turbo", import.meta.url));
const graphQuery = "query { packages { items { name path allDependents { items { name } } } } }";

export function fullPlan(reason) {
  return makePlan(Object.fromEntries(jobs.map((job) => [job, [reason]])));
}

export function imageMatrix(plan) {
  return [
    ...(plan["web-image"] ? [{ app: "web", dockerfile: "apps/web/Dockerfile" }] : []),
    ...(plan["api-image"] ? [{ app: "api", dockerfile: "apps/api/Dockerfile" }] : []),
    ...(plan["gateway-image"]
      ? [{ app: "gateway", dockerfile: ".railway/gateway/Dockerfile" }]
      : []),
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

function deferImageChecks(plan) {
  const results = { ...plan, images: [], reasons: { ...plan.reasons } };
  for (const job of imageJobs) {
    if (!plan[job]) continue;
    results[job] = false;
    results.reasons[job] = ["Railway builds deployment images from next"];
  }
  return results;
}

function isRootDocumentation(path) {
  return /^README\.md$/i.test(path) || /^docs\/.*\.md$/i.test(path);
}

function specialInputJobs(path) {
  return (
    specialInputs.get(path) ??
    (path.startsWith(".railway/gateway/") ? ["gateway-image"] : undefined)
  );
}

function sharedInputReason(path) {
  if (specialInputJobs(path)) return;
  if (path.startsWith(".github/") || /^scripts\/ci-[^/]+\.(?:mjs|sh)$/.test(path)) {
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
    const special = specialInputJobs(path);
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
  const graph = JSON.parse(run(process.execPath, [turbo, "query", graphQuery], directory));
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
      spawnSync(process.execPath, [rootTurbo, "--version"], {
        cwd: temp,
        encoding: "utf8",
      }).stdout?.trim() !== version
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

export function planFromArgs(args, { useRailwayBuilds = false } = {}) {
  if (args.length === 1 && args[0] === "--full") return fullPlan("Full run requested");
  if (args.length !== 4 || args[0] !== "--base" || args[2] !== "--head") {
    throw new Error("Usage: bun run ci:plan --base <sha> --head <sha> | --next | --full");
  }
  try {
    const head = run("git", [
      "rev-parse",
      "--verify",
      "--end-of-options",
      `${args[3]}^{commit}`,
    ]).trim();
    const paths = changedPaths(args[1], head);
    let plan;
    for (const path of paths) {
      const reason = sharedInputReason(path);
      if (!reason) continue;
      const manifest = /^(?:apps|packages|tests)\/[^/]+\/package\.json$/;
      const added = paths.some((changed) => manifest.test(changed))
        ? changedPaths(args[1], head, ["--diff-filter=A"]).find((changed) => manifest.test(changed))
        : undefined;
      plan = fullPlan(
        added ? `${reason}. New workspace manifest ${added}. Update the CI mapping.` : reason,
      );
      break;
    }
    if (!plan) {
      const needsGraph = paths.some(
        (path) => !isRootDocumentation(path) && !specialInputJobs(path),
      );
      plan = selectJobs(paths, needsGraph ? workspaceGraph(head) : []);
    }
    const deferImages =
      useRailwayBuilds &&
      !paths.some(
        (path) =>
          imageInputs.has(path) || path === "apps/api/Dockerfile" || path.startsWith(".railway/"),
      );
    return deferImages ? deferImageChecks(plan) : plan;
  } catch (error) {
    if (error.code === "ENOBUFS")
      return fullPlan("Changed path list or workspace graph exceeded the planner size limit");
    return fullPlan(
      `Cannot reliably select jobs: ${error.message.replace(/\s+/g, " ").slice(0, 500)}`,
    );
  }
}

async function findNextBaseline(env) {
  const {
    GITHUB_API_URL: api,
    GITHUB_REPOSITORY: repository,
    GITHUB_SHA: head,
    GITHUB_TOKEN: token,
  } = env;
  const commitSha = /^[0-9a-f]{40}$/;
  if (!api || !repository || !token || !commitSha.test(head ?? "")) return;

  try {
    const url = new URL(`${api}/repos/${repository}/actions/workflows/ci.yml/runs`);
    url.search = new URLSearchParams({
      branch: "next",
      event: "push",
      status: "success",
      per_page: "100",
    }).toString();
    const headers = { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" };
    const signal = AbortSignal.timeout(10_000);

    for (let page = 1; ; page++) {
      url.searchParams.set("page", String(page));
      const response = await fetch(url, { headers, signal });
      if (!response.ok) return;
      const { workflow_runs: runs } = await response.json();
      if (!Array.isArray(runs)) return;

      for (const entry of runs) {
        const sha = entry?.head_sha;
        if (
          entry?.conclusion !== "success" ||
          entry.event !== "push" ||
          entry.head_branch !== "next" ||
          typeof sha !== "string" ||
          !commitSha.test(sha) ||
          sha === head
        ) {
          continue;
        }
        if (
          spawnSync("git", ["merge-base", "--is-ancestor", sha, head], { stdio: "ignore" })
            .status === 0
        ) {
          return sha;
        }
      }
      if (!response.headers.get("link")?.includes('rel="next"')) return;
    }
  } catch {
    // CI history must be verifiable before it can narrow the plan.
  }
}

export async function planForNextPush(env = process.env) {
  const baseline = await findNextBaseline(env);
  if (!baseline) return fullPlan("No successful next CI ancestor available");
  const plan = planFromArgs(["--base", baseline, "--head", env.GITHUB_SHA], {
    useRailwayBuilds: true,
  });
  return { ...plan, baseline };
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
    const baseline = plan.baseline ? `Baseline commit \`${plan.baseline}\`.\n\n` : "";
    appendFileSync(
      process.env.GITHUB_STEP_SUMMARY,
      `## CI plan\n\n${baseline}| Task | Selected | Reason |\n| --- | --- | --- |\n${[
        "check",
        ...jobs,
      ]
        .map(
          (job) =>
            `| ${job} | ${plan[job] ? "yes" : "no"} | ${(plan.reasons[job] ?? ["No affected consumer"]).join("; ").replaceAll("|", "\\|").replaceAll("\n", " ")} |`,
        )
        .join("\n")}\n`,
    );
  }
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  writePlan(
    args.length === 1 && args[0] === "--next" ? await planForNextPush() : planFromArgs(args),
  );
}
