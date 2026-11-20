import {
  appendFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { spawnSync, type SpawnSyncOptions } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ROOT } from "../internal/root";

export const ciTasks = {
  ui: "storybook#ci:ui",
  cli: "kipivo#ci:cli",
  mobile: "mobile#build",
  auth: "@kipivo/e2e#ci:auth",
  e2e: "@kipivo/e2e#ci:integration",
  "web-e2e": "@kipivo/e2e#ci:web-e2e",
} as const;
export const imageDefinitions = {
  "web-image": { app: "web", dockerfile: "apps/web/Dockerfile" },
  "api-image": { app: "api", dockerfile: "apps/api/Dockerfile" },
  "gateway-image": { app: "gateway", dockerfile: ".railway/gateway/Dockerfile" },
  "docs-image": { app: "docs", dockerfile: "apps/docs/Dockerfile" },
} as const;

type CiJob = keyof typeof ciTasks;
type ImageJob = keyof typeof imageDefinitions;
type Job = CiJob | ImageJob;
type ReasonJob = Job | "check" | "topology";
type Reasons = Partial<Record<ReasonJob, string[]>>;
type Plan = Record<Job, boolean> & {
  base: string;
  check: boolean;
  topology: boolean;
  images: (typeof imageDefinitions)[ImageJob][];
  reasons: Reasons;
  baseline?: string;
};
type RunAffected = (tasks: string[]) => Set<string>;

const CI_JOBS = Object.keys(ciTasks) as CiJob[];
const IMAGE_JOBS = Object.keys(imageDefinitions) as ImageJob[];
export const jobs = [...CI_JOBS, ...IMAGE_JOBS];
const sharedSmokeInputs = new Set([
  "scripts/kpdev.ts",
  "scripts/cmds/smoke.ts",
  "scripts/internal/execute.ts",
  "scripts/internal/repository-scripts.ts",
  "scripts/internal/root.ts",
  "scripts/internal/smoke-process.ts",
  "scripts/smoke/targets.ts",
]);
const imageInputs = new Map<string, ImageJob[]>([
  ["apps/web/Dockerfile", ["web-image"]],
  ["apps/api/Dockerfile", ["api-image"]],
  ["apps/docs/Dockerfile", ["docs-image"]],
  ["scripts/smoke/http-image.ts", ["web-image", "docs-image"]],
  ["scripts/smoke/web.ts", ["web-image"]],
  ["scripts/smoke/api-image.ts", ["api-image"]],
  ["scripts/smoke/compose.ts", ["gateway-image"]],
  ["scripts/smoke/docs.ts", ["web-image", "docs-image"]],
  ["scripts/smoke/image-files.sh", IMAGE_JOBS],
  [".dockerignore", IMAGE_JOBS],
]);
const knownRootInputs = new Set([
  "assets/logo.svg",
  "scripts/kpdev.test.ts",
  "scripts/smoke/cli.sh",
  "scripts/smoke/turbo.ts",
  "scripts/check/workspace-lint.ts",
  "scripts/check/workspace-lint.test.ts",
]);
const TURBO_BIN = join(ROOT, "node_modules", ".bin", "turbo");

export function imageMatrix(plan: Record<ImageJob, boolean>) {
  return IMAGE_JOBS.filter((job) => plan[job]).map((job) => imageDefinitions[job]);
}

function makePlan(reasons: Reasons, base = ""): Plan {
  const selection = Object.fromEntries(
    jobs.map((job) => [job, Boolean(reasons[job]?.length)]),
  ) as Record<Job, boolean>;
  return {
    base,
    check: true,
    topology: Boolean(reasons.topology?.length),
    ...selection,
    images: imageMatrix(selection),
    reasons: { check: ["Every change runs the repository checks"], ...reasons },
  };
}

export function fullPlan(reason: string, includeImages = true, topology = includeImages) {
  const required: ReasonJob[] = includeImages ? [...jobs] : [...CI_JOBS];
  if (topology) required.push("topology");
  return makePlan(Object.fromEntries(required.map((job) => [job, [reason]])));
}

function run(command: string, args: string[], options: Pick<SpawnSyncOptions, "cwd" | "env"> = {}) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
    ...options,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} failed: ${result.stderr.trim()}`);
  return result.stdout;
}

function changedPaths(base: string, head: string | undefined) {
  const tracked = run("git", [
    "diff",
    "--name-only",
    "--no-renames",
    "--no-relative",
    "-z",
    base,
    ...(head ? [head] : []),
    "--",
  ])
    .split("\0")
    .filter(Boolean);
  if (head) return tracked;
  const untracked = run("git", ["ls-files", "--others", "--exclude-standard", "-z"]);
  return [...new Set([...tracked, ...untracked.split("\0").filter(Boolean)])];
}

function imageInputJobs(path: string): ImageJob[] {
  if (sharedSmokeInputs.has(path)) return IMAGE_JOBS;
  return imageInputs.get(path) ?? (path.startsWith(".railway/gateway/") ? ["gateway-image"] : []);
}

function isRootDocumentation(path: string) {
  return /^README\.md$/i.test(path) || /^docs\/.*\.md$/i.test(path);
}

function isTopologyInput(path: string) {
  return (
    path.startsWith(".railway/topology/") ||
    sharedSmokeInputs.has(path) ||
    path === "scripts/smoke/compose.ts" ||
    path === ".github/workflows/topology-smoke.yml"
  );
}

function fullRunReason(paths: string[], head: string | undefined) {
  const workspaces = new Set<string>();
  for (const path of paths) {
    if (isRootDocumentation(path) || isTopologyInput(path)) continue;
    if (
      path.startsWith("scripts/cmds/") ||
      knownRootInputs.has(path) ||
      imageInputJobs(path).length
    )
      continue;
    const workspace = /^(?:apps|packages|tests)\/[^/]+(?=\/)/.exec(path)?.[0];
    if (!workspace) return `Repository input changed: ${path}`;
    workspaces.add(`${workspace}/package.json`);
  }
  if (!workspaces.size) return;
  if (!head) {
    const missing = [...workspaces].find((path) => !existsSync(path));
    return missing && `Unmapped path in ${missing.replace(/\/package\.json$/, "")}`;
  }
  const manifests = new Set(
    run("git", ["ls-tree", "-r", "--name-only", head, "--", ...workspaces])
      .trim()
      .split("\n"),
  );
  const missing = [...workspaces].find((path) => !manifests.has(path));
  if (missing) return `Unmapped path in ${missing.replace(/\/package\.json$/, "")}`;
}

function commitRef(ref: string) {
  return run("git", ["rev-parse", "--verify", "--end-of-options", `${ref}^{commit}`]).trim();
}

function turboVersion(directory: string) {
  const manifest = JSON.parse(readFileSync(join(directory, "package.json"), "utf8")) as {
    devDependencies?: { turbo?: unknown };
  };
  const version = manifest.devDependencies?.turbo;
  if (typeof version !== "string" || !/^\d+\.\d+\.\d+(?:-[\w.-]+)?$/.test(version)) {
    throw new Error("Expected an exact Turbo version in package.json");
  }
  return version;
}

function withCheckout(
  head: string,
  visit: (directory: string, turbo: string, version: string) => void,
) {
  const root = run("git", ["rev-parse", "--show-toplevel"]).trim();
  const current = run("git", ["rev-parse", "HEAD"]).trim();
  if (
    head === current &&
    !run("git", ["status", "--porcelain", "--untracked-files=normal"], { cwd: root })
  ) {
    return visit(root, TURBO_BIN, turboVersion(root));
  }

  const temp = mkdtempSync(join(tmpdir(), "kipivo-ci-plan-"));
  try {
    const checkout = join(temp, "checkout");
    run("git", ["clone", "--quiet", "--shared", "--no-checkout", "--", root, checkout]);
    run("git", ["-c", "core.hooksPath=/dev/null", "checkout", "--quiet", "--detach", head], {
      cwd: checkout,
    });
    const version = turboVersion(checkout);
    let turbo = TURBO_BIN;
    if (
      spawnSync(process.execPath, [TURBO_BIN, "--version"], {
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
    return visit(checkout, turbo, version);
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
}

function affectedTasks(
  directory: string,
  turbo: string,
  version: string,
  base: string,
  head: string,
  tasks: string[],
) {
  const summary = JSON.parse(
    run(process.execPath, [turbo, "run", ...tasks, "--affected", "--dry=json"], {
      cwd: directory,
      env: { ...process.env, TURBO_SCM_BASE: base, TURBO_SCM_HEAD: head },
    }),
  ) as { turboVersion: string; tasks: { command: string; taskId: string }[] };
  if (summary.turboVersion !== version) throw new Error("Expected the pinned Turbo version");
  return new Set(
    summary.tasks.filter(({ command }) => command !== "<NONEXISTENT>").map(({ taskId }) => taskId),
  );
}

function selectPlan(
  base: string,
  head: string | undefined,
  useRailwayBuilds: boolean,
  inspectTasks: (inspect: (runAffected: RunAffected) => void) => void,
) {
  const paths = changedPaths(base, head);
  const topologyInputs = paths.filter(isTopologyInput);
  const includeImages =
    !useRailwayBuilds ||
    paths.some(
      (path) =>
        imageInputJobs(path).length || (!isTopologyInput(path) && path.startsWith(".railway/")),
    );
  const full = fullRunReason(paths, head);
  if (full) return fullPlan(full, includeImages, includeImages || topologyInputs.length > 0);

  const reasons: Reasons = { topology: topologyInputs };
  if (includeImages) {
    for (const path of paths) {
      for (const job of imageInputJobs(path)) (reasons[job] ??= []).push(path);
      if (path.startsWith("tests/e2e/") && !/^tests\/e2e\/readme\.md$/i.test(path)) {
        (reasons["api-image"] ??= []).push(path);
      }
    }
  }
  if (
    paths.some(
      (path) =>
        path === "apps/api/Dockerfile" ||
        sharedSmokeInputs.has(path) ||
        (!isRootDocumentation(path) && !isTopologyInput(path) && !imageInputJobs(path).length),
    )
  ) {
    inspectTasks((runAffected) => {
      const selected = runAffected(Object.values(ciTasks));
      for (const job of CI_JOBS) {
        const task = ciTasks[job];
        if (selected.has(task)) reasons[job] = [task];
      }
      if (includeImages) {
        const builds = runAffected(["build"]);
        for (const job of IMAGE_JOBS) {
          const { app } = imageDefinitions[job];
          const task = `${app}#build`;
          if (!builds.has(task)) continue;
          // Web includes Docs as a prerequisite even when only Web changed.
          if (app === "docs" && !runAffected([task]).has(task)) continue;
          (reasons[job] ??= []).push(task);
        }
      }
    });
  }
  if (useRailwayBuilds && IMAGE_JOBS.some((job) => reasons[job]?.length)) {
    topologyInputs.push("Image checks selected");
  }
  return makePlan(reasons, base);
}

export function planFromArgs(args: string[], { useRailwayBuilds = false } = {}) {
  if (args.length === 1 && args[0] === "--full") return fullPlan("Full run requested");
  if (args.length !== 4 || args[0] !== "--base" || args[2] !== "--head") {
    throw new Error("Usage: kpdev ci plan --base <sha> --head <sha> | --next | --full");
  }
  try {
    const head = commitRef(args[3]);
    const base = run("git", ["merge-base", "--", args[1], head]).trim();
    return selectPlan(base, head, useRailwayBuilds, (inspect) =>
      withCheckout(head, (directory, turbo, version) =>
        inspect((tasks) => affectedTasks(directory, turbo, version, base, head, tasks)),
      ),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return fullPlan(`Cannot reliably select jobs: ${message.replace(/\s+/g, " ").slice(0, 500)}`);
  }
}

export function planWorkingTree(ref?: string) {
  const head = commitRef("HEAD");
  if (ref === undefined) {
    // Use refs already available locally. The planner never fetches or changes the index.
    for (const candidate of ["origin/HEAD", "@{upstream}"]) {
      try {
        ref = commitRef(candidate);
        break;
      } catch {
        // A fresh repository may have neither a remote default nor an upstream.
      }
    }
  } else {
    ref = commitRef(ref);
  }
  const base = run("git", ["merge-base", "--", ref ?? head, head]).trim();
  const directory = process.cwd();
  const plan = selectPlan(base, undefined, false, (inspect) => {
    const version = turboVersion(directory);
    inspect((tasks) => affectedTasks(directory, TURBO_BIN, version, base, head, tasks));
  });
  return { ...plan, base };
}

async function findNextBaseline(env: NodeJS.ProcessEnv) {
  const {
    GITHUB_API_URL: api,
    GITHUB_REPOSITORY: repository,
    GITHUB_SHA: head,
    GITHUB_TOKEN: token,
  } = env;
  const commitSha = /^[0-9a-f]{40}$/;
  if (!api || !repository || !token || !head || !commitSha.test(head)) return;

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
      const { workflow_runs: runs } = (await response.json()) as {
        workflow_runs?: Array<{
          head_sha?: unknown;
          conclusion?: unknown;
          event?: unknown;
          head_branch?: unknown;
        } | null>;
      };
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
          return { baseline: sha, head };
        }
      }
      if (!response.headers.get("link")?.includes('rel="next"')) return;
    }
  } catch {
    // CI history must be verifiable before it can narrow the plan.
  }
}

export async function planForNextPush(env = process.env) {
  const next = await findNextBaseline(env);
  if (!next) return fullPlan("No successful next CI ancestor available");
  const { baseline, head } = next;
  const plan = planFromArgs(["--base", baseline, "--head", head], {
    useRailwayBuilds: true,
  });
  return { ...plan, baseline };
}

export function writePlan(plan: Plan) {
  console.log(JSON.stringify(plan, null, 2));
  if (process.env.GITHUB_OUTPUT) {
    const selection = Object.fromEntries(jobs.map((job) => [job, plan[job]]));
    const outputs = [
      `base=${plan.base}`,
      ...jobs.map((job) => `${job}=${plan[job]}`),
      `has-images=${plan.images.length > 0}`,
      `run-topology=${plan.topology}`,
      `images=${JSON.stringify({ include: plan.images })}`,
      `plan=${JSON.stringify({ ...selection, images: plan.images })}`,
    ];
    appendFileSync(process.env.GITHUB_OUTPUT, `${outputs.join("\n")}\n`);
  }
  if (process.env.GITHUB_STEP_SUMMARY) {
    const commit = plan.baseline ?? plan.base;
    const baseline = commit ? `Baseline commit \`${commit}\`.\n\n` : "";
    const rows = (["check", ...jobs, "topology"] as const).map((job) => {
      const reasons = plan.reasons[job];
      const reason = reasons?.length ? reasons.join("; ") : "No affected consumer";
      return `| ${job} | ${plan[job] ? "yes" : "no"} | ${reason.replaceAll("|", "\\|").replaceAll("\n", " ")} |`;
    });
    appendFileSync(
      process.env.GITHUB_STEP_SUMMARY,
      `## CI plan\n\n${baseline}| Task | Selected | Reason |\n| --- | --- | --- |\n${rows.join("\n")}\n`,
    );
  }
}

export async function runPlan(args: string[]) {
  writePlan(
    args.length === 1 && args[0] === "--next" ? await planForNextPush() : planFromArgs(args),
  );
}

if (import.meta.main) await runPlan(process.argv.slice(2));
