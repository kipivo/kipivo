export const lanes = [
  {
    id: "todo",
    label: "To do",
    empty: "Ideas and next steps start here.",
    marker: "border-[1.5px] border-dashed border-muted-foreground",
  },
  {
    id: "active",
    label: "In progress",
    empty: "Move a task here when you start it.",
    marker:
      "border-[1.5px] border-primary bg-[linear-gradient(90deg,var(--primary)_50%,transparent_50%)]",
  },
  {
    id: "done",
    label: "Done",
    empty: "Completed work collects here.",
    marker:
      "bg-workspace-success after:absolute after:top-[3px] after:left-[3px] after:h-1 after:w-[7px] after:-rotate-45 after:border-b-[1.5px] after:border-l-[1.5px] after:border-card",
  },
] as const;
export type Stage = (typeof lanes)[number]["id"];
export type Task = { id: string; title: string; note: string; stage: Stage };
export function readTasks(value: string | null): Task[] {
  if (!value) return [];
  const data: unknown = JSON.parse(value);
  if (
    !Array.isArray(data) ||
    !data.every(
      (t) =>
        t &&
        typeof t.id === "string" &&
        typeof t.title === "string" &&
        typeof t.note === "string" &&
        lanes.some((lane) => lane.id === t.stage),
    )
  )
    throw new Error("Invalid board");
  return data;
}
