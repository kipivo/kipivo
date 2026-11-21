import type { RunSummary } from "@kipivo/contracts/runs";
import { useLocale } from "@/features/i18n/locale";
import { sectionHeader, workspacePanel } from "@/layout/workspace-styles";
import { formatRunTime } from "./format";
import { RunStatus } from "./status";

export function RunHistory({
  runs,
  selectedId,
  onSelect,
}: {
  runs: RunSummary[];
  selectedId?: string;
  onSelect(id: string): void;
}) {
  const locale = useLocale();
  return (
    <section aria-label="Run history" className={workspacePanel}>
      <div className={sectionHeader}>
        <h2 className="text-section-title">History</h2>
      </div>
      <ul className="@container/history grid gap-2">
        {runs.map((run) => (
          <li key={run.id}>
            <button
              type="button"
              className="control-focus grid w-full cursor-pointer grid-cols-[max-content_minmax(0,1fr)_max-content] items-center
                gap-x-2 gap-y-1 rounded-lg border p-3 text-left hover:border-input aria-pressed:border-primary
                aria-pressed:bg-workspace-selected
                @md/history:grid-cols-[minmax(max-content,1fr)_minmax(max-content,0.65fr)_max-content_max-content]
                @md/history:gap-x-4"
              aria-pressed={selectedId === run.id}
              onClick={() => onSelect(run.id)}
            >
              <strong className="col-span-2 text-sm/[21px] font-semibold @md/history:col-span-1">
                Project check
              </strong>
              <RunStatus
                status={run.status}
                className="justify-self-end @md/history:justify-self-start"
              />
              <code
                className="block min-w-0 max-w-[9ch] truncate text-xs/normal text-muted-foreground"
                title={run.id}
              >
                {run.id}
              </code>
              <time
                dateTime={run.createdAt}
                title={run.createdAt}
                className="col-span-2 justify-self-end text-end font-mono text-xs text-muted-foreground @md/history:col-span-1"
              >
                {formatRunTime(run.createdAt, locale)}
              </time>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
