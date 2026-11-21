import { afterAll, beforeAll, expect, test } from "bun:test";
import {
  chmodSync,
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { stripVTControlCharacters } from "node:util";

let root: string;

beforeAll(() => {
  root = realpathSync(mkdtempSync(join(tmpdir(), "kipivo-kpdev-")));
  mkdirSync(join(root, "node_modules/.bin"), { recursive: true });
  for (const name of ["citty", "@commitlint/lint"]) {
    const destination = join(root, "node_modules", name);
    mkdirSync(dirname(destination), { recursive: true });
    symlinkSync(fileURLToPath(new URL("../", import.meta.resolve(name))), destination, "junction");
  }
  for (const file of [
    "kpdev.ts",
    "check/run.ts",
    "cmds/check.ts",
    "cmds/ci.ts",
    "cmds/commit.ts",
    "cmds/commit/lint.ts",
    "cmds/i18n.ts",
    "cmds/prepare.ts",
    "cmds/run.ts",
    "cmds/runner.ts",
    "cmds/smoke.ts",
    "cmds/turbo.ts",
    "internal/execute.ts",
    "internal/repository-scripts.ts",
    "internal/root.ts",
    "internal/smoke-process.ts",
    "ci/plan.ts",
    "smoke/targets.ts",
    "smoke/turbo.ts",
  ]) {
    const destination = join(root, "scripts", file);
    mkdirSync(dirname(destination), { recursive: true });
    copyFileSync(new URL(`./${file}`, import.meta.url), destination);
  }
  chmodSync(join(root, "scripts/kpdev.ts"), 0o755);
  symlinkSync("../../scripts/kpdev.ts", join(root, "node_modules/.bin/kpdev"), "file");
  writeFileSync(
    join(root, "returning-task.mjs"),
    'process.execve = () => {}; await import("./scripts/kpdev.ts");\n',
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
    `#!/bin/sh
if [ "$3" = "--wait-for-signal" ]; then
  trap 'exit 0' INT TERM
  printf 'ready\n'
  while :; do sleep 1; done
fi
printf '%s\\0' "$(pwd -P)" "$@"
exit 23
`,
    {
      mode: 0o755,
    },
  );
  for (const file of ["api-image.ts", "changed.ts", "compose.ts", "http-image.ts"]) {
    writeFileSync(join(root, "scripts/smoke", file), 'import "../../probe.mjs";\n');
  }
  writeFileSync(join(root, "scripts/smoke/unregistered.sh"), "exit 99\n");
});
afterAll(() => rmSync(root, { recursive: true, force: true }));

function invoke(command: string[]) {
  const result = Bun.spawnSync(command, {
    cwd: tmpdir(),
    stdout: "pipe",
    stderr: "pipe",
    env: { ...process.env, PATH: [dirname(process.execPath), process.env.PATH].join(delimiter) },
  });
  return { code: result.exitCode, out: result.stdout.toString(), err: result.stderr.toString() };
}

function runEntry(entry: string, args: string[]) {
  return invoke([process.execPath, join(root, entry), ...args]);
}

function run(...args: string[]) {
  return runEntry("scripts/kpdev.ts", args);
}

test("discovers root scripts and offers scoped help without running a task", () => {
  const result = run("test", "--help");
  expect(result.code).toBe(0);
  expect(result.out).toContain("Run the test:sample task");
  expect(run("test", "sample", "--help").out).toMatch(/USAGE.+kpdev test sample/);
  expect(stripVTControlCharacters(result.out).match(/^USAGE /gm)).toHaveLength(1);
  const rootHelp = run("--help");
  expect(rootHelp.code).toBe(0);
  expect(rootHelp.out).toBe(run().out);
  expect(rootHelp.out).toContain("Compile installed catalogs and set up local Git hooks");
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

test("shows built-in check help without running the check suite", () => {
  const help = run("check", "--help");
  expect(help.code).toBe(0);
  expect(help.out).toContain("Run repository validation");
  expect(run("check", "-h").out).toBe(help.out);
});

test("shows i18n help for the command and its subcommands without running them", () => {
  const help = run("i18n", "--help");
  expect(help.code).toBe(0);
  expect(help.out).toContain("compile");
  expect(help.out).toContain("check");
  expect(run("i18n").out).toBe(help.out);
  for (const name of ["compile", "check"]) {
    const sub = run("i18n", name, "--help");
    expect(sub.code).toBe(0);
    expect(sub.out).toContain(`kpdev i18n ${name}`);
  }
});

test("skips an unavailable i18n workspace only when requested", () => {
  expect(run("i18n", "compile", "--if-installed").code).toBe(0);
  expect(run("i18n", "compile").code).not.toBe(0);
});

test("prepare is available in a checkout without optional install tools", () => {
  expect(run("prepare", "--help").out).toContain("kpdev prepare");
  expect(run("prepare").code).toBe(0);
});

test("runs the built-in CI planner and shows its nested help", () => {
  const help = run("ci", "plan", "--help");
  expect(help.code).toBe(0);
  expect(help.out).toContain("kpdev ci plan");
  expect(help.out).toContain("--full");

  const plan = run("ci", "plan", "--full");
  expect(plan.code).toBe(0);
  expect(JSON.parse(plan.out)).toMatchObject({ check: true, topology: true });
});

test("commit lint handles nested help and message paths relative to the repository", () => {
  const help = run("commit", "lint", "--help");
  expect(help.code).toBe(0);
  expect(help.out).toContain("kpdev commit lint");
  expect(help.out).toContain("--edit");

  const file = "commit message.txt";
  writeFileSync(join(root, file), "fix(e2e): preserve commit checks\n");
  expect(run("commit", "lint", "--edit", file)).toMatchObject({ code: 0, err: "" });
  writeFileSync(join(root, file), "invalid commit message\n");
  expect(run("commit", "lint", "--edit", file)).toMatchObject({
    code: 1,
    err: expect.stringContaining("invalid commit message"),
  });
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
  expect(help.out).toContain("--list");
  expect(run("run")).toMatchObject({ code: 0, out: help.out });
  const result = run("run", "test:sample", "two words", "--grep", "$HOME", "--help", "--list");
  expect(result.code).toBe(23);
  expect(JSON.parse(result.out)).toEqual({
    cwd: root,
    args: ["two words", "--grep", "$HOME", "--help", "--list"],
  });
  expect(JSON.parse(run("run", "test:sample", "--", "--help").out).args).toEqual(["--help"]);
  for (const script of ["build", "prepare", "turbo", "missing", "smoke:plan"]) {
    expect(run("run", script)).toMatchObject({ code: 1, err: expect.stringContaining(script) });
  }
});

test("lists runnable script names and suggests a nearby match for a typo", () => {
  expect(run("run", "--list")).toMatchObject({
    code: 0,
    out: "test\ntest:sample\n",
  });
  expect(run("run", "--list", "test").code).toBe(1);
  expect(run("run", "test:sampel")).toMatchObject({
    code: 1,
    err: expect.stringContaining('Did you mean "test:sample"?'),
  });
  expect(run("run", "unrelated").err).toContain("Run kpdev run --list.");
});

test("the installed entry resolves its checkout when invoked from elsewhere", () => {
  const child = invoke([
    join(root, "node_modules/.bin/kpdev"),
    "test",
    "sample",
    "--",
    "two words",
  ]);
  expect(child.code).toBe(23);
  expect(JSON.parse(child.out)).toEqual({ cwd: root, args: ["two words"] });
});

test.each([
  ["SIGINT", 130],
  ["SIGTERM", 143],
] as const)(
  "CLI smoke reports %s even when Turbo handles it and exits successfully",
  async (signal, status) => {
    const child = Bun.spawn(
      [
        process.execPath,
        join(root, "scripts/smoke/turbo.ts"),
        "kipivo#ci:cli",
        "--wait-for-signal",
      ],
      { cwd: tmpdir(), stdout: "pipe", stderr: "inherit" },
    );
    const reader = child.stdout.getReader();
    try {
      const { value } = await reader.read();
      expect(new TextDecoder().decode(value)).toBe("ready\n");
      child.kill(signal);
      expect(await child.exited).toBe(status);
    } finally {
      reader.releaseLock();
      if (child.exitCode === null) child.kill("SIGTERM");
      await child.exited;
    }
  },
);

test("forwards runner subcommands to the product CLI", () => {
  const runner = run("runner", "serve", "--port", "0");
  expect(runner.code).toBe(23);
  expect(JSON.parse(runner.out).args).toEqual(["serve", "--port", "0"]);
  expect(JSON.parse(run("runner", "run", "check", "--help").out).args).toEqual([
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
  expect(run("turbo", "query", "--help").out.split("\0")).toEqual([root, "query", "--help", ""]);
  const help = run().out;
  expect(help).toContain("Run Turborepo commands");
  expect(help).not.toContain("`build`");
  for (const buildArgs of [["build"], ["build", "storybook"], ["build:storybook"]]) {
    const result = run(...buildArgs);
    expect(result.code).toBe(1);
    expect(result.err).toContain("Unknown command");
  }
});

test("runs smoke targets directly and passes through the supplied tag", () => {
  const help = run("smoke", "--help");
  expect(help.out).toContain("Smoke target to run");
  const api = run("smoke", "api", "example:local");
  expect(api.code).toBe(23);
  expect(JSON.parse(api.out)).toEqual({ cwd: root, args: ["example:local"] });
  expect(JSON.parse(run("smoke", "gateway", "example:local").out).args).toEqual([
    "gateway",
    "example:local",
  ]);
  expect(JSON.parse(run("smoke", "topology").out).args).toEqual(["topology"]);
  const web = run("smoke", "web", "--", "example:local");
  expect(web.code).toBe(23);
  expect(JSON.parse(web.out)).toEqual({ cwd: root, args: ["web", "example:local"] });
  const cli = run("smoke", "cli", "--affected");
  expect(cli.code).toBe(23);
  expect(cli.out.split("\0")).toEqual([root, "run", "kipivo#ci:cli", "--affected", ""]);
  expect(run("smoke", "unregistered")).toMatchObject({
    code: 1,
    err: expect.stringContaining('Unknown smoke target "unregistered"'),
  });
});

test("shows shared smoke help and forwards options for the selected target", () => {
  const help = run("smoke", "plan", "--help");
  expect(help.code).toBe(0);
  expect(help.out).toMatch(/USAGE.+kpdev smoke.+TARGET/);
  expect(help.out).toContain("--base");
  expect(help.out).toContain("--build");
  expect(help.out).toContain("--json");
  expect(run("smoke", "changed", "--help").out).toBe(help.out);

  const plan = run("smoke", "plan", "--base", "HEAD");
  expect(plan.code).toBe(23);
  expect(JSON.parse(plan.out)).toEqual({ cwd: root, args: ["plan", "--base", "HEAD"] });
  expect(JSON.parse(run("smoke", "plan", "--json").out).args).toEqual(["plan", "--json"]);
  const changed = run("smoke", "changed", "--build", "--base=origin/next");
  expect(changed.code).toBe(23);
  expect(JSON.parse(changed.out).args).toEqual(["changed", "--build", "--base=origin/next"]);
});

test("rejects unknown tasks, including typos below a known task", () => {
  const result = run("test", "sample", "typo");
  expect(result.code).toBe(1);
  expect(result.err).toContain("Unknown command");
  expect(run("test", "missing", "--help").code).toBe(1);
  for (const command of ["help", "smoke:plan", "turbo:build"]) {
    expect(run(command)).toMatchObject({
      code: 1,
      err: expect.stringContaining("Unknown command"),
    });
  }
});
