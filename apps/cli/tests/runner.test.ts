import { test, expect } from "bun:test";
import { runDetail, submittedRun } from "@kipivo/contracts/runs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openRunStore } from "../src/run-store";
import { startRunner } from "../src/runner";

async function isolatedRepo() {
  const dir = await mkdtemp(join(tmpdir(), "kipivo-runner-"));
  const home = join(dir, "state");
  await mkdir(join(dir, "apps/web"), { recursive: true });
  await writeFile(join(dir, "apps/web/package.json"), "{}");
  await writeFile(
    join(dir, "package.json"),
    JSON.stringify({
      name: "kipivo",
      workspaces: ["apps/*"],
      scripts: { check: "bun check.mjs" },
    }),
  );
  await writeFile(join(dir, "check.mjs"), 'console.log("waiting"); await Bun.sleep(60_000);');
  return { dir, home };
}

async function client(home: string) {
  const { port, token } = JSON.parse(await readFile(join(home, "runner.json"), "utf8"));
  return (path: string, init?: RequestInit) =>
    fetch(`http://127.0.0.1:${port}${path}`, {
      ...init,
      headers: { authorization: `Bearer ${token}`, ...init?.headers },
    });
}

test("times out a running check and holds an exclusive state lock", async () => {
  const { dir, home } = await isolatedRepo();
  const runner = startRunner({ repo: dir, home, port: 0, timeoutMs: 800 });
  try {
    expect(() => startRunner({ repo: dir, home, port: 0 })).toThrow("already using");
    const request = await client(home);
    const submission = await request("/v1/runs", { method: "POST", body: '{"kind":"check"}' });
    expect(submission.status).toBe(202);
    const { id } = submittedRun.parse(await submission.json());
    const getResult = async () => runDetail.parse(await (await request(`/v1/runs/${id}`)).json());
    let result = await getResult();
    const deadline = Date.now() + 7000;
    while ((result.status === "queued" || result.status === "running") && Date.now() < deadline) {
      await Bun.sleep(30);
      result = await getResult();
    }
    expect(result.status).toBe("failed");
    expect(result.error).toBe("timeout");
    expect(result.finishedAt).not.toBeNull();
  } finally {
    await runner.close();
    await rm(dir, { recursive: true, force: true });
  }
}, 12_000);

test("recovers interrupted records and retains a UTF-8 bounded log", async () => {
  const { dir, home } = await isolatedRepo();
  await mkdir(home, { mode: 0o700 });
  const store = openRunStore(join(home, "runs.sqlite"));
  const id = store.submit();
  store.start(id);
  store.appendLog(id, "x" + "🙂".repeat(70_000));
  store.close();
  const runner = startRunner({ repo: dir, home, port: 0 });
  try {
    const request = await client(home);
    const result = runDetail.parse(await (await request(`/v1/runs/${id}`)).json());
    expect(result.status).toBe("failed");
    expect(result.error).toBe("interrupted");
    expect(result.logTruncated).toBe(true);
    expect(result.logs).toBe("x" + "🙂".repeat(65_535));
  } finally {
    await runner.close();
    await rm(dir, { recursive: true, force: true });
  }
});
