import type { RunSummary } from "@kipivo/contracts/runs";

const labels = { queued: "Queued", running: "Running", succeeded: "Passed", failed: "Failed" };

const markers = {
  queued:
    "before:rounded-full before:border-[1.5px] before:border-dashed before:border-muted-foreground",
  running:
    "before:rounded-full before:border before:border-primary before:bg-[linear-gradient(90deg,var(--primary)_50%,transparent_50%)]",
  succeeded: "before:rounded-full before:bg-workspace-success",
  failed: "before:rotate-45 before:rounded-[1px] before:bg-destructive",
};

export function RunStatus({
  status,
  announce,
  className = "",
}: {
  status: RunSummary["status"];
  announce?: boolean;
  className?: string;
}) {
  return (
    <span
      role={announce ? "status" : undefined}
      className={`inline-flex w-fit items-center gap-1.5 text-xs/normal font-semibold text-foreground before:size-2 ${markers[status]} ${className}`}
    >
      {labels[status]}
    </span>
  );
}
