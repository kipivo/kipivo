import { describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, renameSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { changedPaths, fullPlan, jobs, planFromArgs, selectJobs } from "./ci-plan.mjs";
import { validateResults } from "./ci-result.mjs";

const pkg = (name, path, dependents = []) => ({
  name,
  path,
  allDependents: { items: dependents.map((name) => ({ name })) },
});
const graph = [
  pkg("@kipivo/ui", "packages/ui", ["storybook", "web"]),
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
  test("shared UI follows its consuming workspaces", () => {
    expect(selected(selectJobs(["packages/ui/src/button.tsx"], graph))).toEqual([
      "check",
      "ui",
      "auth",
      "e2e",
      "web-image",
    ]);
  });
  test("special inputs union with ordinary workspace paths without global expansion", () => {
    expect(selected(selectJobs(["Dockerfile", "apps/storybook/package.json"], graph))).toEqual([
      "check",
      "ui",
      "web-image",
    ]);
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
    ]);
    expect(selected(selectJobs(["scripts/smoke-web.mjs"], graph))).toEqual(["check", "web-image"]);
  });
  test("entry points select their declared consumers", () => {
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
  test("unknown paths, unknown workspaces, and unmapped apps run everything", () => {
    for (const path of [
      ".github/workflows/ci.yml",
      "bun.lock",
      "package.json",
      "apps/unknown/a.ts",
      "apps/mobile/a.ts",
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
    expect(reasons.ui).toEqual(["@kipivo/ui → storybook"]);
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
      writeFileSync(join(dir, "packages/ui/button.ts"), "export const button = 1;\n");
      const head = commit("Change a shared UI component");
      web(false);
      commit("Remove web dependency on UI");
      process.chdir(dir);
      const args = ["--base", base, "--head", head];
      const expected = ["check", "auth", "e2e", "web-image"];
      expect(selected(planFromArgs(args))).toEqual(expected);

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

describe("CI result", () => {
  const results = (plan) =>
    Object.fromEntries(
      ["changes", "check", "ui", "cli", "auth", "e2e", "images"].map((job) => [
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
    for (const job of ["changes", "check", "ui", "cli", "auth", "e2e", "images"]) {
      for (const result of ["skipped", "failure", "cancelled"]) {
        expect(() => validateResults(plan, { ...results(plan), [job]: { result } })).toThrow();
      }
    }
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
