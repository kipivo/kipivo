import type { RunDetail } from "@kipivo/contracts/runs";
import { TerminalIcon } from "@kipivo/icons";
import { sectionHeader, workspacePanel } from "@/layout/workspace-styles";
import { RunPath } from "./run-path";
import { RunStatus } from "./status";

export function RunDetails({ detail }: { detail?: RunDetail }) {
  const inFlight = detail?.status === "queued" || detail?.status === "running";
  return (
    <section aria-label="Run details" className={workspacePanel}>
      <div className={sectionHeader}>
        <h2 className="text-section-title">Run output</h2>
        {detail && <RunStatus status={detail.status} announce />}
      </div>
      {detail ? (
        <>
          <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4.5 gap-y-2.5 text-xs/normal [&>dd]:font-mono [&>dd]:wrap-anywhere [&>dt]:text-muted-foreground">
            <dt>Run ID</dt>
            <dd>{detail.id}</dd>
            <dt>Exit code</dt>
            <dd>{detail.exitCode ?? (inFlight ? "Pending" : "Unavailable")}</dd>
          </dl>
          {detail.error && <p className="mt-2 text-sm text-destructive">{detail.error}</p>}
          <div className="mt-4 overflow-hidden rounded-lg bg-plate text-on-plate">
            <div className="flex items-center gap-2 border-b border-plate-border px-4 py-3 font-mono text-xs/4.5">
              <TerminalIcon size={16} aria-hidden="true" /> Local runner
            </div>
            <pre
              role="log"
              aria-label="Run log"
              className="max-h-96 overflow-auto p-4 font-mono text-[13px]/[21px] wrap-anywhere whitespace-pre-wrap"
            >
              {detail.logs || (inFlight ? "Waiting for output…" : "This run produced no output.")}
            </pre>
            <RunPath key={detail.id} status={detail.status} exitCode={detail.exitCode} />
          </div>
          {detail.logTruncated && (
            <p className="mt-2 text-sm text-muted-foreground">Log limit reached.</p>
          )}
        </>
      ) : (
        <p className="text-sm text-muted-foreground">Choose a run to see its logs.</p>
      )}
    </section>
  );
}
