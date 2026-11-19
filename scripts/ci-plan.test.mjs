import { describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, renameSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  changedPaths,
  fullPlan,
  jobs,
  planForNextPush,
  planFromArgs,
  selectJobs,
} from "./ci-plan.mjs";
import { validateResults } from "./ci-result.mjs";

const pkg = (name, path, dependents = []) => ({
  name,
  path,
  allDependents: { items: dependents.map((name) => ({ name })) },
});
const graph = [
  pkg("@kipivo/icons", "packages/icons", ["@kipivo/ui", "storybook", "web"]),
  pkg("@kipivo/ui", "packages/ui", ["storybook", "web"]),
  pkg("@kipivo/admin", "packages/admin", ["api", "web"]),
  pkg("@kipivo/cache", "packages/cache", ["api", "@kipivo/e2e"]),
  pkg("@kipivo/storage", "packages/storage", ["api", "@kipivo/e2e"]),
  pkg("@kipivo/runtime", "packages/runtime", ["web", "kipivo"]),
  pkg("storybook", "apps/storybook"),
  pkg("web", "apps/web"),
  pkg("api", "apps/api"),
  pkg("kipivo", "apps/cli"),
  pkg("@kipivo/e2e", "tests/e2e"),
  pkg("mobile", "apps/mobile"),
];
const selected = (plan) => ["check", ...jobs.filter((job) => plan[job])];

describe("CI selection", () => {
  test("documentation is check only, including mixed workspace README changes", () => {
    expect(
      selected(
        selectJobs(
          ["README.md", "docs/testing.md", "apps/web/README.md", "apps/mobile/README.md"],
          graph,
        ),
      ),
    ).toEqual(["check"]);
    expect(
      selected(
        selectJobs(["docs/testing.md", "apps/web/README.md", "apps/storybook/src/test.ts"], graph),
      ),
    ).toEqual(["check", "ui"]);
  });
  test("admin directory changes select the API and Web consumers", () => {
    expect(selected(selectJobs(["packages/admin/src/directory.ts"], graph))).toEqual([
      "check",
      "ui",
      "auth",
      "e2e",
      "web-image",
      "api-image",
    ]);
  });
  test.each(["packages/ui/src/button.tsx", "packages/icons/src/index.tsx"])(
    "%s follows its UI and Web consumers",
    (path) => {
      expect(selected(selectJobs([path], graph))).toEqual([
        "check",
        "ui",
        "auth",
        "e2e",
        "web-image",
      ]);
    },
  );
  test.each(["cache", "storage"])("%s only selects the API resource consumers", (resource) => {
    const plan = selectJobs([`packages/${resource}/src/factory.ts`], graph);
    expect(selected(plan)).toEqual(["check", "auth", "e2e", "api-image"]);
    expect(plan.reasons.e2e).toEqual([
      `@kipivo/${resource} → api`,
      `@kipivo/${resource} → @kipivo/e2e`,
    ]);
  });
  test("special inputs union with ordinary workspace paths without global expansion", () => {
    expect(
      selected(
        selectJobs(["scripts/workspace-lint.mjs", "scripts/workspace-lint.test.mjs"], graph),
      ),
    ).toEqual(["check"]);
    const plan = selectJobs(["apps/web/Dockerfile", "apps/storybook/package.json"], graph);
    expect(selected(plan)).toEqual(["check", "ui", "web-image"]);
    expect(plan.images).toEqual([{ app: "web", dockerfile: "apps/web/Dockerfile" }]);
    expect(selected(selectJobs(["assets/logo.svg", "apps/cli/src/index.ts"], graph))).toEqual([
      "check",
      "ui",
      "cli",
      "auth",
      "e2e",
      "web-image",
    ]);
    expect(selectJobs([".dockerignore"], graph).images.map(({ app }) => app)).toEqual([
      "web",
      "api",
      "gateway",
    ]);
  });
  test.each([
    ["scripts/smoke-web.mjs", "web-image"],
    ["scripts/smoke-web-image.sh", "web-image"],
    ["scripts/smoke-cli.sh", "cli"],
  ])("%s selects only %s alongside check", (path, job) => {
    expect(selected(selectJobs([path], graph))).toEqual(["check", job]);
  });
  test("the API image smoke script selects only the API image", () => {
    const plan = selectJobs(["scripts/smoke-api-image.sh"], graph);
    expect(selected(plan)).toEqual(["check", "api-image"]);
    expect(plan.images.map(({ app }) => app)).toEqual(["api"]);
  });
  test.each([
    ".railway/gateway/Dockerfile",
    ".railway/gateway/Caddyfile",
    ".railway/gateway/future-config.json",
    "scripts/smoke-gateway-image.sh",
  ])("gateway input %s selects only the gateway image", (path) => {
    const plan = selectJobs([path], graph);
    expect(selected(plan)).toEqual(["check", "gateway-image"]);
    expect(plan.images).toEqual([{ app: "gateway", dockerfile: ".railway/gateway/Dockerfile" }]);
  });
  test("gateway inputs union with workspace selections and Railway IaC remains shared", () => {
    expect(
      selected(selectJobs([".railway/gateway/Caddyfile", "apps/cli/src/index.ts"], graph)),
    ).toEqual(["check", "cli", "e2e", "gateway-image"]);
    expect(selected(selectJobs([".railway/railway.ts"], graph))).toEqual(["check", ...jobs]);
  });
  test("runtime selects its Web and CLI consumers", () => {
    const plan = selectJobs(["packages/runtime/src/local/connection.ts"], graph);
    expect(selected(plan)).toEqual(["check", "ui", "cli", "auth", "e2e", "web-image"]);
    expect(plan.reasons.e2e).toEqual(["@kipivo/runtime → web", "@kipivo/runtime → kipivo"]);
  });
  test("entry points select their declared consumers", () => {
    expect(selected(selectJobs(["apps/web/src/routes/index.tsx"], graph))).toEqual([
      "check",
      "ui",
      "auth",
      "e2e",
      "web-image",
    ]);
    expect(selected(selectJobs(["apps/api/src/index.ts"], graph))).toEqual([
      "check",
      "auth",
      "e2e",
      "api-image",
    ]);
    expect(selected(selectJobs(["tests/e2e/playwright.config.ts"], graph))).toEqual([
      "check",
      "auth",
      "e2e",
      "api-image",
    ]);
    expect(selected(selectJobs(["apps/cli/src/index.ts"], graph))).toEqual(["check", "cli", "e2e"]);
  });
  test("mobile changes export both native bundles without selecting server jobs", () => {
    expect(selected(selectJobs(["apps/mobile/src/app/index.tsx"], graph))).toEqual([
      "check",
      "mobile",
    ]);
  });
  test("unknown paths, unknown workspaces, and unmapped apps run everything", () => {
    for (const path of [
      ".github/workflows/ci.yml",
      "scripts/ci-install-turbo.sh",
      "bun.lock",
      "package.json",
      "apps/unknown/a.ts",
      "packages/deleted/a.ts",
    ]) {
      expect(selected(selectJobs([path], graph))).toEqual(["check", ...jobs]);
    }
    for (const path of ["apps/new/a.ts", "apps/new/README.md"]) {
      expect(selected(selectJobs([path], [...graph, pkg("new", "apps/new")]))).toEqual([
        "check",
        ...jobs,
      ]);
    }
    expect(selectJobs([".github/workflows/ci.yml"], graph).reasons.ui).toEqual([
      "CI configuration changed: .github/workflows/ci.yml",
    ]);
    expect(selectJobs(["bun.lock"], graph).reasons.ui).toEqual([
      "Shared repository input changed: bun.lock",
    ]);
  });
  test("new consumers and transitive dependencies are handled safely", () => {
    expect(
      selected(
        selectJobs(
          ["packages/ui/src/button.tsx"],
          [
            pkg("@kipivo/ui", "packages/ui", ["storybook", "web", "new"]),
            ...graph.slice(1),
            pkg("new", "apps/new"),
          ],
        ),
      ),
    ).toEqual(["check", ...jobs]);
    const transitive = [
      pkg("@kipivo/ui", "packages/ui", ["storybook", "web", "@kipivo/contracts", "kipivo"]),
      ...graph.slice(1),
      pkg("@kipivo/contracts", "packages/contracts", ["kipivo"]),
    ];
    expect(selected(selectJobs(["packages/ui/src/button.tsx"], transitive))).toEqual([
      "check",
      "ui",
      "cli",
      "auth",
      "e2e",
      "web-image",
    ]);
  });
  test("selection reasons are aggregated by changed workspace", () => {
    const paths = Array.from({ length: 10000 }, (_, index) => `packages/ui/src/file-${index}.ts`);
    const { reasons } = selectJobs(paths, graph);
    expect(reasons.ui).toEqual(["@kipivo/ui → storybook", "@kipivo/ui → web"]);
    expect(reasons.auth).toEqual(["@kipivo/ui → web"]);
  });
  test("full mode skips git and dependency graph discovery", () => {
    expect(selected(planFromArgs(["--full"]))).toEqual(["check", ...jobs]);
    expect(selected(planFromArgs(["--base", "nonexistent", "--head", "HEAD"]))).toEqual([
      "check",
      ...jobs,
    ]);
  });
  test("replay uses the committed head graph even when the checkout and its manifests differ", () => {
    const previous = process.cwd();
    const dir = mkdtempSync(join(tmpdir(), "kipivo ci replay-"));
    const git = (...args) => execFileSync("git", args, { cwd: dir, encoding: "utf8" }).trim();
    const writeJson = (path, content) => writeFileSync(join(dir, path), JSON.stringify(content));
    const web = (usesUI) =>
      writeJson("apps/web/package.json", {
        name: "web",
        dependencies: usesUI ? { "@kipivo/ui": "workspace:*" } : {},
      });
    const commit = (message) => {
      git("add", ".");
      git("commit", "--quiet", "-m", message);
      return git("rev-parse", "HEAD");
    };
    try {
      git("init", "--quiet");
      git("config", "user.name", "CI test");
      git("config", "user.email", "ci@example.test");
      mkdirSync(join(dir, "apps/web"), { recursive: true });
      mkdirSync(join(dir, "packages/ui"), { recursive: true });
      const { devDependencies, packageManager } = JSON.parse(
        readFileSync(new URL("../package.json", import.meta.url), "utf8"),
      );
      writeJson("package.json", {
        name: "fixture",
        workspaces: ["apps/*", "packages/*"],
        packageManager,
        devDependencies: { turbo: devDependencies.turbo },
      });
      writeJson("turbo.json", { tasks: {} });
      writeJson("packages/ui/package.json", { name: "@kipivo/ui" });
      writeJson("bun.lock", {
        lockfileVersion: 2,
        workspaces: {
          "": { name: "fixture" },
          "apps/web": { name: "web" },
          "packages/ui": { name: "@kipivo/ui" },
        },
        packages: {
          web: ["web@workspace:apps/web"],
          "@kipivo/ui": ["@kipivo/ui@workspace:packages/ui"],
        },
      });
      web(true);
      const base = commit("Add web dependency on UI");
      mkdirSync(join(dir, ".railway/gateway"), { recursive: true });
      writeFileSync(join(dir, ".railway/gateway/Caddyfile"), ":8080 { respond ok }\n");
      const gatewayHead = commit("Add gateway config");
      process.chdir(dir);
      expect(selected(planFromArgs(["--base", base, "--head", gatewayHead]))).toEqual([
        "check",
        "gateway-image",
      ]);
      process.chdir(previous);

      writeFileSync(join(dir, "packages/ui/button.ts"), "export const button = 1;\n");
      const head = commit("Change a shared UI component");
      web(false);
      commit("Remove web dependency on UI");
      process.chdir(dir);
      const args = ["--base", gatewayHead, "--head", head];
      const expected = ["check", "ui", "auth", "e2e", "web-image"];
      expect(selected(planFromArgs(args))).toEqual(expected);
      const nextPlan = planFromArgs(args, { useRailwayBuilds: true });
      expect(selected(nextPlan)).toEqual(["check", "ui", "auth", "e2e"]);
      expect(nextPlan.images).toEqual([]);

      git("checkout", "--quiet", "--detach", head);
      web(false);
      expect(selected(planFromArgs(args))).toEqual(expected);

      mkdirSync(join(dir, "apps/new"));
      writeJson("apps/new/package.json", { name: "new" });
      writeFileSync(join(dir, "bun.lock"), "{}\n");
      const newHead = commit("Add a workspace and update the lockfile");
      const plan = planFromArgs(["--base", head, "--head", newHead]);
      expect(selected(plan)).toEqual(["check", ...jobs]);
      expect(plan.reasons.ui[0]).toContain("New workspace manifest apps/new/package.json");
    } finally {
      process.chdir(previous);
      rmSync(dir, { recursive: true, force: true });
    }
  });
  test("diff uses the merge base and preserves deletion and both rename paths", () => {
    const previous = process.cwd();
    const dir = mkdtempSync(join(tmpdir(), "kipivo-ci-plan-"));
    const git = (...args) => execFileSync("git", args, { cwd: dir, encoding: "utf8" }).trim();
    try {
      git("init", "--quiet");
      git("config", "user.name", "CI test");
      git("config", "user.email", "ci@example.test");
      mkdirSync(join(dir, "apps/web"), { recursive: true });
      mkdirSync(join(dir, "apps/storybook"), { recursive: true });
      writeFileSync(join(dir, "apps/web/old.ts"), "export const a = 1;\n");
      writeFileSync(join(dir, "apps/web/deleted.ts"), "delete\n");
      git("add", ".");
      git("commit", "--quiet", "-m", "base");
      const base = git("rev-parse", "HEAD");
      git("checkout", "--quiet", "-b", "feature");
      renameSync(join(dir, "apps/web/old.ts"), join(dir, "apps/storybook/new.ts"));
      rmSync(join(dir, "apps/web/deleted.ts"));
      git("add", ".");
      git("commit", "--quiet", "-m", "move and delete");
      const head = git("rev-parse", "HEAD");
      git("checkout", "--quiet", "--detach", base);
      writeFileSync(join(dir, "unrelated"), "base moved\n");
      git("add", ".");
      git("commit", "--quiet", "-m", "target branch moved");
      process.chdir(dir);
      const paths = changedPaths(git("rev-parse", "HEAD"), head);
      expect(paths.sort()).toEqual([
        "apps/storybook/new.ts",
        "apps/web/deleted.ts",
        "apps/web/old.ts",
      ]);
      expect(selected(selectJobs(paths, graph))).toEqual([
        "check",
        "ui",
        "auth",
        "e2e",
        "web-image",
      ]);
    } finally {
      process.chdir(previous);
      rmSync(dir, { recursive: true, force: true });
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
      expect(selected(ciPlan)).toEqual(["check", "ui", "cli", "mobile", "auth", "e2e"]);
      expect(ciPlan.images).toEqual([]);
      expect(ciPlan.reasons["api-image"]).toEqual(["Railway builds deployment images from next"]);
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
    const plan = selectJobs(["README.md"], graph);
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
    expect(web.if).toBe(workflow.jobs.e2e.if);
    expect(workflow.jobs.result.needs).toContain("ui");
    expect(workflow.jobs.result.needs).toContain("e2e");
    expect(workflow.jobs.result.needs).not.toContain("web-e2e");
  });
  test("invalid plan and unexpected unselected executions fail", () => {
    const plan = selectJobs([], graph);
    expect(() => validateResults(null, results(plan))).toThrow();
    expect(() =>
      validateResults({ ...plan, images: fullPlan("test").images }, results(plan)),
    ).toThrow();
    expect(() => validateResults(plan, { ...results(plan), ui: { result: "success" } })).toThrow();
  });
});
