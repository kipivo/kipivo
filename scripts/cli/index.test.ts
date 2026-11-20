import { afterAll, beforeAll, expect, test } from "bun:test";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

let root: string;

beforeAll(() => {
  root = realpathSync(mkdtempSync(join(tmpdir(), "kipivo-kpdev-")));
  mkdirSync(join(root, "scripts/cli/commands"), { recursive: true });
  mkdirSync(join(root, "node_modules/.bin"), { recursive: true });
  symlinkSync(
    fileURLToPath(new URL("../", import.meta.resolve("citty"))),
    join(root, "node_modules/citty"),
    "junction",
  );
  for (const file of [
    "kpdev.mjs",
    "index.ts",
    "commands.ts",
    "tasks.ts",
    "commands/runner.ts",
    "commands/smoke.ts",
    "commands/turbo.ts",
  ]) {
    copyFileSync(new URL(`./${file}`, import.meta.url), join(root, "scripts/cli", file));
  }
  writeFileSync(
    join(root, "returning-task.mjs"),
    'process.execve = () => {}; await import("./scripts/cli/index.ts");\n',
  );
  writeFileSync(
    join(root, "returning-launcher.mjs"),
    'process.execve = () => {}; await import("./scripts/cli/kpdev.mjs");\n',
  );
  writeFileSync(
    join(root, "package.json"),
    JSON.stringify({
      scripts: {
        kipivo: "bun probe.mjs",
        turbo: "echo the Turbo executable should take precedence",
        build: "echo build should not run through kpdev",
        "build:storybook": "echo build should not run through kpdev",
        test: "echo parent",
        "test:sample": "bun probe.mjs",
        "smoke:plan": "bun probe.mjs plan",
        "smoke:changed": "bun probe.mjs changed",
        "smoke:example": "bash scripts/smoke-example.sh",
        prepare: "exit 1",
        kpdev: "exit 1",
      },
    }),
  );
  writeFileSync(
    join(root, "probe.mjs"),
    `
    console.log(JSON.stringify({ cwd: process.cwd(), args: process.argv.slice(2) }));
    process.exitCode = 23;
  `,
  );
  writeFileSync(
    join(root, "node_modules/.bin/turbo"),
    '#!/bin/sh\nprintf "%s\\0" "$(pwd -P)" "$@"\nexit 23\n',
    {
      mode: 0o755,
    },
  );
  writeFileSync(join(root, "scripts/smoke-example.sh"), 'printf "%s" "$1"\n');
  writeFileSync(join(root, "scripts/smoke-example-image.sh"), "exit 99\n");
  writeFileSync(join(root, "scripts/smoke-unregistered-image.sh"), "exit 99\n");
});
afterAll(() => rmSync(root, { recursive: true, force: true }));

function runEntry(entry: string, args: string[]) {
  const result = Bun.spawnSync([process.execPath, join(root, entry), ...args], {
    cwd: tmpdir(),
    stdout: "pipe",
    stderr: "pipe",
  });
  return { code: result.exitCode, out: result.stdout.toString(), err: result.stderr.toString() };
}

function run(...args: string[]) {
  return runEntry("scripts/cli/kpdev.mjs", args);
}

test("discovers root scripts and offers scoped help without running a task", () => {
  const result = run("test", "--help");
  expect(result.code).toBe(0);
  expect(result.out).toContain("Run the test:sample task");
  expect(result.out).not.toContain("smoke:example");
  expect(run("help", "test", "sample").out).toMatch(/USAGE.+kpdev test sample/);
  expect(result.out.match(/\bUSAGE\b/g)).toHaveLength(1);
  expect(run().out).not.toContain("  prepare");
});

test("runs from the repo root and preserves flags, positional arguments and exit status", () => {
  const result = run("test", "sample", "--", "--grep", "two words", "$HOME");
  expect(result.code).toBe(23);
  expect(JSON.parse(result.out)).toEqual({ cwd: root, args: ["--grep", "two words", "$HOME"] });
  const withFlags = run("test", "sample", "--list", "--help");
  expect(withFlags.code).toBe(23);
  expect(JSON.parse(withFlags.out).args).toEqual(["--list", "--help"]);
  const helpArgument = run("test", "sample", "--", "--help");
  expect(helpArgument.code).toBe(23);
  expect(JSON.parse(helpArgument.out).args).toEqual(["--help"]);
});

test("only runs the selected task when the subprocess returns", () => {
  const child = runEntry("returning-task.mjs", ["test", "sample"]);
  expect(child.code).toBe(23);
  expect(JSON.parse(child.out)).toEqual({ cwd: root, args: [] });
  expect(run("test")).toMatchObject({ code: 0, out: "parent\n" });
});

test("runs a public script by its exact name and hands off the remaining arguments", () => {
  const help = run("run", "--help");
  expect(help.code).toBe(0);
  expect(help.out).toMatch(/USAGE.+kpdev run.+SCRIPT/);
  expect(run("help", "run", "test:sample")).toMatchObject({ code: 0, out: help.out });
  const result = run("run", "test:sample", "two words", "--grep", "$HOME", "--help");
  expect(result.code).toBe(23);
  expect(JSON.parse(result.out)).toEqual({
    cwd: root,
    args: ["two words", "--grep", "$HOME", "--help"],
  });
  expect(JSON.parse(run("run", "test:sample", "--", "--help").out).args).toEqual(["--help"]);
  for (const script of ["build", "prepare", "turbo", "missing"]) {
    expect(run("run", script)).toMatchObject({ code: 1, err: expect.stringContaining(script) });
  }
});

test("the launcher forwards arguments and exit status when it cannot replace itself", () => {
  const child = runEntry("returning-launcher.mjs", ["test", "sample", "--", "two words"]);
  expect(child.code).toBe(23);
  expect(JSON.parse(child.out)).toEqual({ cwd: root, args: ["two words"] });
});

test("forwards runner subcommands to the product CLI", () => {
  const runner = run("runner", "serve", "--port", "0");
  expect(runner.code).toBe(23);
  expect(JSON.parse(runner.out).args).toEqual(["serve", "--port", "0"]);
  expect(JSON.parse(run("help", "runner", "run", "check").out).args).toEqual([
    "run",
    "check",
    "--help",
  ]);
});

test("forwards Turbo commands and keeps builds under the turbo subcommand", () => {
  const args = ["run", "build", "--filter=web", "--", "--mode", "local test"];
  const turbo = run("turbo", ...args);
  expect(turbo.code).toBe(23);
  expect(turbo.out.split("\0")).toEqual([root, ...args, ""]);
  expect(runEntry("returning-task.mjs", ["turbo", ...args])).toMatchObject({
    code: 23,
    out: turbo.out,
  });
  expect(run("turbo", "--", "--help").out.split("\0")).toEqual([root, "--", "--help", ""]);
  expect(run("help", "turbo", "query").out.split("\0")).toEqual([root, "query", "--help", ""]);
  const help = run().out;
  expect(help).toContain("Run Turborepo commands");
  expect(help).not.toContain("`build`");
  for (const buildArgs of [["build"], ["build", "storybook"], ["build:storybook"]]) {
    const result = run(...buildArgs);
    expect(result.code).toBe(1);
    expect(result.err).toContain("Unknown command");
  }
});

test("resolves registered smoke scripts and passes through the supplied tag", () => {
  const help = run("help", "smoke");
  expect(help.out).toContain("Suffix of a smoke:* script in package.json");
  expect(run("smoke", "example", "example:local")).toMatchObject({
    code: 0,
    out: "example:local",
  });
  expect(run("smoke", "example", "--", "example:local")).toMatchObject({
    code: 0,
    out: "example:local",
  });
  expect(run("smoke", "unregistered")).toMatchObject({
    code: 1,
    err: expect.stringContaining('Unknown smoke target "unregistered"'),
  });
});

test("shows shared smoke help and forwards options for the selected target", () => {
  const help = run("help", "smoke", "plan", "--base", "HEAD");
  expect(help.code).toBe(0);
  expect(help.out).toMatch(/USAGE.+kpdev smoke.+TARGET/);
  expect(help.out).toContain("--base");
  expect(help.out).toContain("--build");
  expect(run("smoke", "changed", "--help").out).toBe(help.out);

  const plan = run("smoke", "plan", "--base", "HEAD");
  expect(plan.code).toBe(23);
  expect(JSON.parse(plan.out)).toEqual({ cwd: root, args: ["plan", "--base", "HEAD"] });
  expect(run("run", "smoke:plan", "--base", "HEAD")).toMatchObject({ code: 23, out: plan.out });
  const changed = run("smoke", "changed", "--build", "--base=origin/next");
  expect(changed.code).toBe(23);
  expect(JSON.parse(changed.out).args).toEqual(["changed", "--build", "--base=origin/next"]);
});

test("rejects unknown tasks, including typos below a known task", () => {
  const result = run("test", "sample", "typo");
  expect(result.code).toBe(1);
  expect(result.err).toContain("Unknown command");
  expect(run("help", "test", "missing").code).toBe(1);
  expect(run("prepare").code).toBe(1);
  for (const command of ["smoke:plan", "run:smoke:plan", "turbo:build"]) {
    expect(run(command)).toMatchObject({
      code: 1,
      err: expect.stringContaining("Unknown command"),
    });
  }
});
