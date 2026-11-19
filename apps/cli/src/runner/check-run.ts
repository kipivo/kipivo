import { startCheck } from "./check-process";
import type { RunStore } from "./store";

export function startCheckRun(store: RunStore, id: string, repo: string, timeoutMs: number) {
  store.start(id);
  return startCheck(repo, timeoutMs, {
    onLog: (text) => store.appendLog(id, text),
    onFinish: (exitCode, error) => store.finish(id, exitCode, error),
  });
}
