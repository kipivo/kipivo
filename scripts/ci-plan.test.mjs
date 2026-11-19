import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  renameSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { ciTasks, fullPlan, jobs, planForNextPush, planFromArgs } from "./ci-plan.mjs";
import { validateResults } from "./ci-result.mjs";

const selected = (plan) => ["check", ...jobs.filter((job) => plan[job])];

describe("CI selection", () => {
  const workspaces = [
    ["packages/icons", "@kipivo/icons", []],
    ["packages/ui", "@kipivo/ui", ["@kipivo/icons", "@kipivo/shared"]],
    ["packages/shared", "@kipivo/shared", []],
    ["packages/admin", "@kipivo/admin", []],
    ["packages/cache", "@kipivo/cache", []],
    ["packages/storage", "@kipivo/storage", []],
    ["packages/runtime", "@kipivo/runtime", []],
    ["apps/storybook", "storybook", ["@kipivo/ui"]],
    ["apps/web", "web", ["@kipivo/ui", "@kipivo/admin", "@kipivo/runtime"]],
    ["apps/api", "api", ["@kipivo/admin", "@kipivo/cache", "@kipivo/storage"]],
    ["apps/cli", "kipivo", ["@kipivo/runtime"]],
    ["apps/mobile", "mobile", []],
    ["tests/e2e", "@kipivo/e2e", ["@kipivo/cache", "@kipivo/storage"]],
  ];
  let directory;
  let base;
  const git = (...args) => execFileSync("git", args, { cwd: directory, encoding: "utf8" }).trim();

  beforeAll(() => {
    directory = mkdtempSync(join(tmpdir(), "kipivo-ci-selection-"));
    git("init", "--quiet");
    git("config", "user.name", "CI test");
    git("config", "user.email", "ci@example.test");
    const { devDependencies, packageManager } = JSON.parse(
      readFileSync(new URL("../package.json", import.meta.url), "utf8"),
    );
    const writeJson = (path, value) => writeFileSync(join(directory, path), JSON.stringify(value));
    writeJson("package.json", {
      name: "fixture",
      workspaces: ["apps/*", "packages/*", "tests/*"],
      packageManager,
      devDependencies: { turbo: devDependencies.turbo },
    });
    copyFileSync(new URL("../turbo.json", import.meta.url), join(directory, "turbo.json"));
    const lockWorkspaces = workspaces.map(([path, name, dependencies]) => {
      mkdirSync(join(directory, path), { recursive: true });
      const source = new URL(`../${path}/package.json`, import.meta.url);
      const manifest = {
        name,
        scripts: existsSync(source) ? JSON.parse(readFileSync(source, "utf8")).scripts : {},
        dependencies: Object.fromEntries(dependencies.map((dep) => [dep, "workspace:*"])),
      };
      writeJson(`${path}/package.json`, manifest);
      const config = new URL(`../${path}/turbo.json`, import.meta.url);
      if (existsSync(config)) copyFileSync(config, join(directory, path, "turbo.json"));
      return [path, { name, dependencies: manifest.dependencies }];
    });
    writeJson("bun.lock", {
      lockfileVersion: 2,
      workspaces: { "": { name: "fixture" }, ...Object.fromEntries(lockWorkspaces) },
      packages: Object.fromEntries(
        workspaces.map(([path, name]) => [name, [`${name}@workspace:${path}`]]),
      ),
    });
    writeFileSync(join(directory, "apps/web/old.ts"), "export const a = 1;\n");
    writeFileSync(join(directory, "apps/cli/deleted.ts"), "delete\n");
    git("add", ".");
    git("commit", "--quiet", "-m", "Base workspace graph");
    base = git("rev-parse", "HEAD");
  });
  afterAll(() => rmSync(directory, { recursive: true, force: true }));

  function planFor(paths) {
    git("checkout", "--quiet", "--detach", base);
    for (const path of paths) {
      mkdirSync(dirname(join(directory, path)), { recursive: true });
      writeFileSync(join(directory, path), "\n", { flag: "a" });
    }
    git("add", ".");
    git("commit", "--quiet", "-m", "Change plan inputs");
    const previous = process.cwd();
    try {
      process.chdir(directory);
      return planFromArgs(["--base", base, "--head", "HEAD"]);
    } finally {
      process.chdir(previous);
    }
  }

  test("documentation is check only, including mixed workspace README changes", () => {
    expect(selected(planFor(["README.md", "docs/testing.md", "apps/web/README.md"]))).toEqual([
      "check",
    ]);
    expect(
      selected(planFor(["docs/testing.md", "apps/mobile/README.md", "apps/storybook/src/test.ts"])),
    ).toEqual(["check", "ui"]);
    expect(selected(planFor(["apps/mobile/README.md", "packages/shared/input.ts"]))).toEqual([
      "check",
      "ui",
      "auth",
      "e2e",
      "web-e2e",
      "web-image",
    ]);
  });
  test("Turbo selects the affected admin directory consumers", () => {
    expect(selected(planFor(["packages/admin/src/directory.ts"]))).toEqual([
      "check",
      "ui",
      "auth",
      "e2e",
      "web-e2e",
      "web-image",
      "api-image",
    ]);
  });
  test.each([
    "packages/ui/src/button.tsx",
    "packages/icons/src/index.tsx",
    "packages/shared/input.ts",
  ])("Turbo follows %s to its transitive UI and Web consumers", (path) => {
    expect(selected(planFor([path]))).toEqual([
      "check",
      "ui",
      "auth",
      "e2e",
      "web-e2e",
      "web-image",
    ]);
  });
  test.each(["cache", "storage"])("Turbo selects the %s resource consumers", (resource) => {
    const plan = planFor([`packages/${resource}/src/factory.ts`]);
    expect(selected(plan)).toEqual(["check", "auth", "e2e", "web-e2e", "api-image"]);
    expect(plan.reasons.e2e).toEqual([ciTasks.e2e]);
  });
  test("special inputs union with Turbo's scopes without expanding unrelated jobs", () => {
    expect(
      selected(planFor(["scripts/workspace-lint.mjs", "scripts/workspace-lint.test.mjs"])),
    ).toEqual(["check"]);
    const plan = planFor(["apps/web/Dockerfile", "apps/storybook/package.json"]);
    expect(selected(plan)).toEqual(["check", "ui", "web-image"]);
    expect(plan.images).toEqual([{ app: "web", dockerfile: "apps/web/Dockerfile" }]);
    expect(selected(planFor(["assets/logo.svg", "apps/cli/src/index.ts"]))).toEqual([
      "check",
      "ui",
      "cli",
      "auth",
      "e2e",
      "web-e2e",
      "web-image",
    ]);
    for (const path of [".dockerignore", "scripts/check-image.sh"]) {
      expect(selected(planFor([path]))).toEqual([
        "check",
        "web-image",
        "api-image",
        "gateway-image",
      ]);
    }
  });
  test.each([
    ["apps/web/Dockerfile", "web-image"],
    ["scripts/smoke-web-image.sh", "web-image"],
    ["scripts/smoke-web.mjs", "web-image"],
    ["scripts/smoke-api-image.sh", "api-image"],
    [".railway/gateway/Dockerfile", "gateway-image"],
    [".railway/gateway/Caddyfile", "gateway-image"],
    [".railway/gateway/future-config.json", "gateway-image"],
    ["scripts/smoke-gateway-image.sh", "gateway-image"],
    ["scripts/smoke-cli.sh", "cli"],
  ])("%s selects only %s alongside check", (path, job) => {
    expect(selected(planFor([path]))).toEqual(["check", job]);
  });
  test("gateway inputs union with workspace selections and Railway IaC remains shared", () => {
    expect(selected(planFor([".railway/gateway/Caddyfile", "apps/cli/src/index.ts"]))).toEqual([
      "check",
      "cli",
      "e2e",
      "web-e2e",
      "gateway-image",
    ]);
    expect(selected(planFor([".railway/railway.ts"]))).toEqual(["check", ...jobs]);
  });
  test("Turbo selects the Web and CLI consumers of runtime", () => {
    const plan = planFor(["packages/runtime/src/local/connection.ts"]);
    expect(selected(plan)).toEqual(["check", "ui", "cli", "auth", "e2e", "web-e2e", "web-image"]);
    expect(plan.reasons.e2e).toEqual([ciTasks.e2e]);
  });
  test("entry points select their declared jobs", () => {
    expect(selected(planFor(["apps/web/src/routes/index.tsx"]))).toEqual([
      "check",
      "ui",
      "auth",
      "e2e",
      "web-e2e",
      "web-image",
    ]);
    expect(selected(planFor(["apps/api/src/index.ts"]))).toEqual([
      "check",
      "auth",
      "e2e",
      "web-e2e",
      "api-image",
    ]);
    expect(selected(planFor(["tests/e2e/playwright.config.ts"]))).toEqual([
      "check",
      "auth",
      "e2e",
      "web-e2e",
      "api-image",
    ]);
    expect(selected(planFor(["apps/cli/src/index.ts"]))).toEqual([
      "check",
      "cli",
      "e2e",
      "web-e2e",
    ]);
    expect(selected(planFor(["apps/mobile/src/app/index.tsx"]))).toEqual(["check", "mobile"]);
  });
  test("shared and unmapped inputs conservatively select the full suite", () => {
    for (const path of [
      ".github/workflows/ci.yml",
      "scripts/ci-install-turbo.sh",
      "bun.lock",
      "package.json",
      "apps/unknown/a.ts",
      "packages/deleted/a.ts",
      "apps/new/a.ts",
      "apps/new/README.md",
    ]) {
      expect(selected(planFor([path]))).toEqual(["check", ...jobs]);
    }
    expect(planFor([".github/workflows/ci.yml"]).reasons.ui).toEqual([
      "Repository input changed: .github/workflows/ci.yml",
    ]);
    expect(planFor(["bun.lock"]).reasons.ui).toEqual(["Repository input changed: bun.lock"]);
  });
  test("full mode skips Git and Turbo, and a missing ref falls back to all jobs", () => {
    expect(selected(planFromArgs(["--full"]))).toEqual(["check", ...jobs]);
    expect(selected(planFromArgs(["--base", "nonexistent", "--head", "HEAD"]))).toEqual([
      "check",
      ...jobs,
    ]);
  });
  test("replay uses the committed head graph even when the checkout and its manifests differ", () => {
    git("checkout", "--quiet", "--detach", base);
    writeFileSync(join(directory, "packages/ui/button.ts"), "export const button = 1;\n");
    git("add", ".");
    git("commit", "--quiet", "-m", "Change a shared UI component");
    const head = git("rev-parse", "HEAD");
    const manifestPath = join(directory, "apps/web/package.json");
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    const removeUIDependency = () => {
      delete manifest.dependencies["@kipivo/ui"];
      writeFileSync(manifestPath, JSON.stringify(manifest));
    };
    removeUIDependency();
    git("add", ".");
    git("commit", "--quiet", "-m", "Remove Web dependency on UI");
    const previous = process.cwd();
    try {
      process.chdir(directory);
      const args = ["--base", base, "--head", head];
      const expected = ["check", "ui", "auth", "e2e", "web-e2e", "web-image"];
      expect(selected(planFromArgs(args))).toEqual(expected);
      const nextPlan = planFromArgs(args, { useRailwayBuilds: true });
      expect(selected(nextPlan)).toEqual(["check", "ui", "auth", "e2e", "web-e2e"]);
      expect(nextPlan.base).toBe(base);
      expect(nextPlan.images).toEqual([]);

      git("checkout", "--quiet", "--detach", head);
      removeUIDependency();
      expect(selected(planFromArgs(args))).toEqual(expected);
    } finally {
      git("restore", "apps/web/package.json");
      process.chdir(previous);
    }
  });
  test("Turbo scopes renames across workspaces and deletions against the merge base", () => {
    git("checkout", "--quiet", "--detach", base);
    renameSync(join(directory, "apps/web/old.ts"), join(directory, "apps/storybook/new.ts"));
    rmSync(join(directory, "apps/cli/deleted.ts"));
    git("add", ".");
    git("commit", "--quiet", "-m", "Move and delete");
    const head = git("rev-parse", "HEAD");
    git("checkout", "--quiet", "--detach", base);
    writeFileSync(join(directory, "unrelated"), "base moved\n");
    git("add", ".");
    git("commit", "--quiet", "-m", "Target branch moved");
    const previous = process.cwd();
    try {
      process.chdir(directory);
      const plan = planFromArgs(["--base", git("rev-parse", "HEAD"), "--head", head]);
      expect(selected(plan)).toEqual(["check", "ui", "cli", "auth", "e2e", "web-e2e", "web-image"]);
      expect(plan.reasons.ui).toEqual([ciTasks.ui]);
      expect(plan.reasons.e2e).toEqual([ciTasks.e2e]);
    } finally {
      process.chdir(previous);
    }
  });
});

describe("next push baseline", () => {
  test("uses the latest successful ancestor and includes changes from failed pushes", async () => {
    const previous = process.cwd();
    const dir = mkdtempSync(join(tmpdir(), "kipivo-ci-baseline-"));
    const git = (...args) => execFileSync("git", args, { cwd: dir, encoding: "utf8" }).trim();
    const commit = (file, message) => {
      writeFileSync(join(dir, file), `${message}\n`);
      git("add", file);
      git("commit", "--quiet", "-m", message);
      return git("rev-parse", "HEAD");
    };
    let server;
    try {
      git("init", "--quiet");
      git("config", "user.name", "CI test");
      git("config", "user.email", "ci@example.test");
      mkdirSync(join(dir, "scripts"));
      const older = commit("README.md", "Repository baseline");
      const unrelated = commit("README.md", "Push on previous next history");
      git("checkout", "--quiet", "--detach", older);
      const baseline = commit("scripts/smoke-api-image.sh", "Latest verified next push");
      mkdirSync(join(dir, "apps/web"), { recursive: true });
      const failed = commit("apps/web/Dockerfile", "Failed Web image check");
      const head = commit("README.md", "Documentation follow-up");
      const run = (head_sha, options = {}) => ({
        head_sha,
        conclusion: "success",
        event: "push",
        head_branch: "next",
        ...options,
      });
      const requests = [];
      server = Bun.serve({
        hostname: "127.0.0.1",
        port: 0,
        fetch(request) {
          const url = new URL(request.url);
          requests.push([url.pathname, Object.fromEntries(url.searchParams)]);
          if (url.searchParams.get("page") === "1") {
            return Response.json(
              {
                workflow_runs: [
                  run(head),
                  run(unrelated),
                  run(failed, { conclusion: "failure" }),
                  run(failed, { event: "workflow_dispatch" }),
                  run(failed, { head_branch: "main" }),
                ],
              },
              { headers: { link: `<${url.origin}${url.pathname}?page=2>; rel="next"` } },
            );
          }
          return Response.json({ workflow_runs: [run(baseline), run(older)] });
        },
      });

      process.chdir(dir);
      const env = {
        GITHUB_API_URL: server.url.origin,
        GITHUB_REPOSITORY: "fixture/project",
        GITHUB_SHA: head,
        GITHUB_TOKEN: "test-token",
      };
      const plan = await planForNextPush(env);
      expect(plan.baseline).toBe(baseline);
      expect(selected(plan)).toEqual(["check", "web-image"]);
      expect(requests).toEqual(
        ["1", "2"].map((page) => [
          "/repos/fixture/project/actions/workflows/ci.yml/runs",
          { branch: "next", event: "push", status: "success", per_page: "100", page },
        ]),
      );

      git("checkout", "--quiet", "--detach", baseline);
      mkdirSync(join(dir, ".github/workflows"), { recursive: true });
      const ciHead = commit(".github/workflows/ci.yml", "Change CI configuration");
      const ciPlan = await planForNextPush({ ...env, GITHUB_SHA: ciHead });
      expect(ciPlan.baseline).toBe(baseline);
      expect(selected(ciPlan)).toEqual(["check", "ui", "cli", "mobile", "auth", "e2e", "web-e2e"]);
      expect(ciPlan.images).toEqual([]);
      expect(ciPlan.base).toBe("");
    } finally {
      server?.stop(true);
      process.chdir(previous);
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test.each([200, 403])(
    "runs all jobs when Actions cannot provide a baseline (HTTP %i)",
    async (status) => {
      const server = Bun.serve({
        hostname: "127.0.0.1",
        port: 0,
        fetch: () => Response.json({ workflow_runs: [] }, { status }),
      });
      try {
        const plan = await planForNextPush({
          GITHUB_API_URL: server.url.origin,
          GITHUB_REPOSITORY: "fixture/project",
          GITHUB_SHA: "1".repeat(40),
          GITHUB_TOKEN: "test-token",
        });
        expect(selected(plan)).toEqual(["check", ...jobs]);
        expect(plan.reasons.ui).toEqual(["No successful next CI ancestor available"]);
      } finally {
        server.stop(true);
      }
    },
  );
});

describe("CI result", () => {
  const results = (plan) =>
    Object.fromEntries(
      ["changes", "check", "ui", "cli", "mobile", "auth", "e2e", "images"].map((job) => [
        job,
        {
          result:
            job === "changes" ||
            job === "check" ||
            (job === "images" ? plan.images.length : plan[job])
              ? "success"
              : "skipped",
        },
      ]),
    );
  test("empty image matrix and only planned skips pass", () => {
    const plan = planFromArgs(["--base", "HEAD", "--head", "HEAD"]);
    expect(plan.images).toEqual([]);
    expect(() => validateResults(plan, results(plan))).not.toThrow();
  });
  test("selected jobs cannot skip, fail, or cancel", () => {
    const plan = fullPlan("test");
    for (const job of ["changes", "check", "ui", "cli", "mobile", "auth", "e2e", "images"]) {
      for (const result of ["skipped", "failure", "cancelled"]) {
        expect(() => validateResults(plan, { ...results(plan), [job]: { result } })).toThrow();
      }
    }
  });
  test("the Web browser job is advisory while Storybook and integrations gate CI", () => {
    const workflow = Bun.YAML.parse(
      readFileSync(new URL("../.github/workflows/ci.yml", import.meta.url), "utf8"),
    );
    const web = workflow.jobs["web-e2e"];
    expect(web["continue-on-error"]).toBe(true);
    expect(web.if).toBe("needs.changes.outputs.web-e2e == 'true'");
    expect(workflow.jobs.ui["continue-on-error"]).toBeUndefined();
    for (const [job, task] of Object.entries(ciTasks)) {
      expect(workflow.jobs[job].env.TURBO_SCM_BASE).toBe("${{ needs.changes.outputs.base }}");
      const run = workflow.jobs[job].steps.find((step) =>
        step.run?.includes(`turbo run '${task}'`),
      );
      expect(run?.run).toContain("--affected");
    }
    expect(workflow.jobs.result.needs).toContain("ui");
    expect(workflow.jobs.result.needs).toContain("e2e");
    expect(workflow.jobs.result.needs).not.toContain("web-e2e");
  });
  test("invalid plan and unexpected unselected executions fail", () => {
    const plan = planFromArgs(["--base", "HEAD", "--head", "HEAD"]);
    expect(() => validateResults(null, results(plan))).toThrow();
    expect(() =>
      validateResults({ ...plan, images: fullPlan("test").images }, results(plan)),
    ).toThrow();
    expect(() => validateResults(plan, { ...results(plan), ui: { result: "success" } })).toThrow();
  });
});
