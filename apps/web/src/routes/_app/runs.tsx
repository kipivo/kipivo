import { TerminalIcon } from "@kipivo/icons";
import { Button } from "@kipivo/ui/components/button";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { guideLink, pageHeader, workspacePanel } from "@/layout/workspace-styles";
import { RunCommand } from "@/features/runs/command";
import { RunDetails } from "@/features/runs/details";
import { RunHistory } from "@/features/runs/history";
import { useLocalRuns } from "@/features/runs/use-local-runs";

export const Route = createFileRoute("/_app/runs")({
  head: () => ({ meta: import.meta.env.DEV ? [{ title: "Local runs | Kipivo" }] : [] }),
  beforeLoad: () => {
    if (!import.meta.env.DEV) throw notFound();
  },
  component: RunsRoute,
});

function RunsRoute() {
  const {
    runs,
    detail,
    selectRun,
    connection,
    connectionError,
    submitError,
    submitting,
    canSubmit,
    submit,
  } = useLocalRuns();
  const runButton = (
    <Button
      type="button"
      aria-busy={submitting}
      disabled={!canSubmit}
      onClick={() => void submit()}
    >
      {submitting ? "Starting check…" : "Run checks"}
    </Button>
  );
  const hasRuns = runs.length > 0;
  return (
    <main>
      <header className={pageHeader}>
        <div>
          <h1 className="text-workspace-title">Local runs</h1>
          <p className="mt-2 text-sm/normal text-muted-foreground">
            Check history and logs from your local checkout.
          </p>
        </div>
        {hasRuns && runButton}
      </header>
      {submitError && (
        <p role="alert" className="mb-4 text-sm text-destructive">
          {submitError}
        </p>
      )}
      {hasRuns ? (
        <>
          {connectionError && (
            <p role="status" className="mb-4 text-sm text-muted-foreground">
              Connection interrupted. Showing the last received results while reconnecting.
            </p>
          )}
          <div className="grid grid-cols-[minmax(17.5rem,1fr)_minmax(0,2.1fr)] items-start gap-4 workspace-stacked:grid-cols-1">
            <RunHistory runs={runs} selectedId={detail?.id} onSelect={selectRun} />
            <RunDetails detail={detail} />
          </div>
        </>
      ) : connection === "connecting" ? (
        <p role="status" className="text-sm text-muted-foreground">
          Connecting to the local runner…
        </p>
      ) : (
        <section
          className={`${workspacePanel} grid grid-cols-[repeat(auto-fit,minmax(min(17rem,100%),1fr))] items-center gap-4 md:gap-6`}
          aria-labelledby="run-start-title"
        >
          <div className="grid justify-items-start gap-2 [&>button]:mt-1 [&>p]:max-w-[48ch] [&>p]:text-sm/normal [&>p]:leading-normal [&>p]:text-muted-foreground">
            <TerminalIcon size={21} aria-hidden="true" className="text-muted-foreground" />
            {connection === "offline" ? (
              <>
                <h2 id="run-start-title" className="text-section-title">
                  Connect your local runner
                </h2>
                <p>
                  Run this command from the project root and leave the terminal open. This page
                  reconnects automatically.
                </p>
                <Link to="/" hash="quickstart" className={guideLink}>
                  Setup instructions
                </Link>
              </>
            ) : connection === "error" ? (
              <>
                <h2 id="run-start-title" className="text-section-title">
                  Couldn’t load run history
                </h2>
                <p role="alert">{connectionError}</p>
                <p>Retrying automatically.</p>
              </>
            ) : (
              <>
                <h2 id="run-start-title" className="text-section-title">
                  Run your first check
                </h2>
                <p>
                  Your runner is connected. Start a project check to see its output and exit code
                  here.
                </p>
                {runButton}
              </>
            )}
          </div>
          {connection === "offline" && (
            <RunCommand title="Start the runner" commands="bun run kpdev runner serve" />
          )}
        </section>
      )}
    </main>
  );
}
