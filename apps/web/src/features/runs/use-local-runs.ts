import {
  runDetail,
  runList,
  runnerError,
  submittedRun,
  type RunDetail,
  type RunSummary,
} from "@kipivo/contracts/runs";
import { useEffect, useRef, useState } from "react";

const url = "/api/local/runs";

class RunnerUnavailable extends Error {}

async function readRunResponse(path: string, init?: RequestInit) {
  const response = await fetch(path, init);
  if (response.status === 503) throw new RunnerUnavailable("The local runner is unavailable.");
  if (!response.ok) {
    const data: unknown = await response.json().catch(() => null);
    const result = runnerError.safeParse(data);
    throw new Error(result.success ? result.data.error : "Could not reach the local runner.");
  }
  return response.json();
}

function message(error: unknown) {
  return error instanceof Error ? error.message : "Could not reach the local runner.";
}

export function useLocalRuns() {
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [selected, setSelected] = useState<string>();
  const [detail, setDetail] = useState<RunDetail>();
  const [connection, setConnection] = useState<"connecting" | "connected" | "offline" | "error">(
    "connecting",
  );
  const [connectionError, setConnectionError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submission = useRef<AbortController | null>(null);

  useEffect(() => () => submission.current?.abort(), []);

  useEffect(() => {
    const abort = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    async function poll() {
      try {
        const next = runList.parse(await readRunResponse(url, { signal: abort.signal }));
        const id = selected ?? next[0]?.id;
        const run = id
          ? runDetail.parse(await readRunResponse(`${url}/${id}`, { signal: abort.signal }))
          : undefined;
        if (!abort.signal.aborted) {
          setRuns(next);
          setDetail(run);
          setConnection("connected");
          setConnectionError("");
        }
      } catch (error) {
        if (!abort.signal.aborted) {
          setConnection(error instanceof RunnerUnavailable ? "offline" : "error");
          setConnectionError(message(error));
        }
      } finally {
        if (!abort.signal.aborted) timer = setTimeout(() => void poll(), 1000);
      }
    }
    void poll();
    return () => {
      abort.abort();
      clearTimeout(timer);
    };
  }, [selected]);

  async function submit() {
    if (submission.current) return;
    const abort = new AbortController();
    submission.current = abort;
    setSubmitting(true);
    setSubmitError("");
    try {
      const result = submittedRun.parse(
        await readRunResponse(url, {
          method: "POST",
          signal: abort.signal,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kind: "check" }),
        }),
      );
      if (!abort.signal.aborted) setSelected(result.id);
    } catch (error) {
      if (!abort.signal.aborted) setSubmitError(message(error));
    } finally {
      submission.current = null;
      if (!abort.signal.aborted) setSubmitting(false);
    }
  }

  const active = runs.some((run) => run.status === "queued" || run.status === "running");
  const canSubmit = connection === "connected" && !submitting && !active;
  return {
    runs,
    detail,
    selectRun: setSelected,
    connection,
    connectionError,
    submitError,
    submitting,
    canSubmit,
    submit,
  };
}
