import { test as base } from "@playwright/test";
import { execFile } from "node:child_process";
import { copyFile, mkdir, mkdtemp, readFile, rename, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { healthy, launch, repoRoot } from "./process";

const exec = promisify(execFile);
const cliFile = join(repoRoot, "apps/cli/dist/kipivo.js");
const webOrigin = "http://127.0.0.1:4380";

interface LocalWebFixture {
  origin: string;
  runnerHome: string;
}

interface RunsFixture {
  runnerOrigin(): string;
  cli(...args: string[]): Promise<string>;
  finish(exitCode: number): Promise<void>;
  restart(): Promise<void>;
}

export const test = base.extend<{ runs: RunsFixture }, { localWeb: LocalWebFixture }>({
  localWeb: [
    // eslint-disable-next-line no-empty-pattern -- Playwright parses fixture dependencies from this parameter.
    async ({}, use) => {
      const temporary = await mkdtemp(join(tmpdir(), "kipivo-e2e-web-"));
      const runnerHome = join(temporary, "state");
      const web = launch(
        ["run", "vite", "dev", "--host", "127.0.0.1", "--port", "4380", "--strictPort"],
        join(repoRoot, "apps/web"),
        { KIPIVO_HOME: runnerHome },
      );
      try {
        await web.waitFor(() => healthy(webOrigin));
        await use({ origin: webOrigin, runnerHome });
      } finally {
        await web.stop();
        await rm(temporary, { recursive: true, force: true });
      }
    },
    { scope: "worker" },
  ],
  runs: async ({ localWeb }, use) => {
    const checkout = await mkdtemp(join(tmpdir(), "kipivo-e2e-checkout-"));
    const home = localWeb.runnerHome;
    const env = { KIPIVO_HOME: home };
    let runner: ReturnType<typeof launch> | undefined;
    let port: number;
    async function start() {
      runner = launch([cliFile, "serve", "--port", "0"], checkout, env);
      await runner.waitFor(async () => {
        ({ port } = JSON.parse(await readFile(join(home, "runner.json"), "utf8")));
        const reply = await fetch(`http://127.0.0.1:${port}/v1/runs`, {
          signal: AbortSignal.timeout(1000),
        });
        return reply.status === 401;
      });
    }

    try {
      await mkdir(join(checkout, "apps/web"), { recursive: true });
      await writeFile(join(checkout, "apps/web/package.json"), "{}");
      await writeFile(
        join(checkout, "package.json"),
        JSON.stringify({
          name: "kipivo",
          workspaces: { packages: ["apps/*"] },
          scripts: { check: "bun check.mjs" },
        }),
      );
      await copyFile(new URL("./check.mjs", import.meta.url), join(checkout, "check.mjs"));
      await start();

      await use({
        runnerOrigin: () => `http://127.0.0.1:${port}`,
        async cli(...args) {
          return (
            await exec("bun", [cliFile, ...args], {
              cwd: checkout,
              env: { ...process.env, ...env },
            })
          ).stdout;
        },
        async finish(exitCode) {
          const target = join(checkout, "check-result.json");
          await writeFile(`${target}.tmp`, JSON.stringify({ exitCode }));
          await rename(`${target}.tmp`, target);
        },
        async restart() {
          await runner?.stop();
          await start();
        },
      });
    } finally {
      await runner?.stop();
      // The worker's Web server needs a stable path. Give the next runner a fresh database.
      await Promise.all([
        rm(home, { recursive: true, force: true }),
        rm(checkout, { recursive: true, force: true }),
      ]);
    }
  },
});
