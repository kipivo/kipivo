import {
  runDetail,
  runList,
  runnerError,
  submittedRun,
  type RunDetail,
  type RunSummary,
} from "@kipivo/contracts/runs";
import { useEffect, useState } from "react";

const url = "/api/local/runs";

async function readRunResponse(path: string, init?: RequestInit) {
  const response = await fetch(path, init);
  const data = await response.json();
  if (!response.ok) {
    const result = runnerError.safeParse(data);
    throw new Error(result.success ? result.data.error : "Could not reach the local runner.");
  }
  return data;
}

function message(error: unknown) {
  return error instanceof Error ? error.message : "Could not reach the local runner.";
}

export function RunPage() {
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [selected, setSelected] = useState<string>();
  const [detail, setDetail] = useState<RunDetail>();
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
          setConnectionError("");
        }
      } catch (error) {
        if (!abort.signal.aborted) setConnectionError(message(error));
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
    setSubmitting(true);
    setSubmitError("");
    try {
      const result = submittedRun.parse(
        await readRunResponse(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kind: "check" }),
        }),
      );
      setSelected(result.id);
    } catch (error) {
      setSubmitError(message(error));
    } finally {
      setSubmitting(false);
    }
  }

  const active = runs.some((run) => run.status === "queued" || run.status === "running");
  return (
    <main className="w-full max-w-5xl self-start px-6 py-12">
      <a href="/" className="text-kipivo-muted underline">
        Kipivo
      </a>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-4xl font-bold tracking-tight">Local runs</h1>
        <button
          type="button"
          className="rounded-md bg-amber-300 px-4 py-2 font-semibold text-stone-950 disabled:opacity-50"
          disabled={connectionError !== "" || submitting || active}
          onClick={() => void submit()}
        >
          Run checks
        </button>
      </div>
      {connectionError && (
        <p role="alert" className="mt-4 text-amber-200">
          {connectionError}
        </p>
      )}
      {submitError && (
        <p role="alert" className="mt-4 text-amber-200">
          {submitError}
        </p>
      )}
      <div className="mt-8 grid gap-6 md:grid-cols-[15rem_minmax(0,1fr)]">
        <section aria-label="Run history">
          <h2 className="text-lg font-semibold">History</h2>
          {runs.length === 0 && <p className="mt-2 text-kipivo-muted">No runs yet.</p>}
          <ul className="mt-3 space-y-2">
            {runs.map((run) => (
              <li key={run.id}>
                <button
                  type="button"
                  aria-pressed={detail?.id === run.id}
                  className="w-full rounded-md border border-stone-700 p-3 text-left aria-pressed:border-amber-300"
                  onClick={() => setSelected(run.id)}
                >
                  <span className="block font-medium">{run.status}</span>
                  <code className="block break-all text-xs text-kipivo-muted">{run.id}</code>
                </button>
              </li>
            ))}
          </ul>
        </section>
        <section
          aria-label="Run details"
          className="min-w-0 rounded-md border border-stone-700 p-4"
        >
          <h2 className="text-lg font-semibold">Run details</h2>
          {detail ? (
            <>
              <p className="mt-2 break-all font-mono text-sm text-kipivo-muted">{detail.id}</p>
              <p className="mt-2" role="status">
                Status: {detail.status}
              </p>
              {detail.exitCode !== null && <p>Exit code: {detail.exitCode}</p>}
              {detail.error && <p>{detail.error}</p>}
              <pre
                role="log"
                className="mt-4 max-h-96 overflow-auto whitespace-pre-wrap break-words rounded bg-black/35 p-3 text-sm"
              >
                {detail.logs}
              </pre>
              {detail.logTruncated && <p className="mt-2 text-kipivo-muted">Log limit reached.</p>}
            </>
          ) : (
            <p className="mt-2 text-kipivo-muted">Choose a run to see its logs.</p>
          )}
        </section>
      </div>
    </main>
  );
}
