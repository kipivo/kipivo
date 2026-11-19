import { PlusIcon } from "@kipivo/icons";
import { Button } from "@kipivo/ui/components/button";
import { useRef, useState } from "react";
import { pageHeader, sectionHeader } from "@/layout/workspace-styles";
import { QuickAdd } from "./quick-add";
import { TaskEditor, type Draft } from "./task-editor";
import { lanes, type Stage, type Task } from "./tasks";
import { useBoard } from "./use-board";
import assembly from "./assembly.webp";

const focusPanel =
  "relative isolate flex items-stretch overflow-hidden rounded-panel bg-plate text-on-plate dark:inset-ring dark:inset-ring-border before:absolute before:inset-0 before:-z-1 before:bg-[radial-gradient(circle,#ffffff21_0.7px,transparent_1px)] before:bg-size-[12px_12px] before:mask-[linear-gradient(90deg,transparent_24%,black_72%,transparent)]";
const focusContent =
  "flex flex-col items-start justify-center p-panel workspace-compact:px-4.5 workspace-compact:py-3.5";
const focusTitle =
  "line-clamp-2 text-[clamp(1.375rem,2vw,1.875rem)] leading-[1.08] font-[555] tracking-[-0.045em] text-balance wrap-anywhere";

export function Board({ scope, description }: { scope: string; description: string }) {
  const { tasks, ready, warning, change } = useBoard(scope);
  const [draft, setDraft] = useState<Draft | null>(null);
  const opener = useRef<HTMLElement>(null);
  const addButton = useRef<HTMLButtonElement>(null);
  const active = tasks.find((task) => task.stage === "active");
  const focus = active ?? tasks.find((task) => task.stage === "todo");
  const done = tasks.filter((task) => task.stage === "done").length;
  const percent = tasks.length ? Math.round((100 * done) / tasks.length) : 0;

  function openDraft(stage: Stage, trigger: HTMLElement, task?: Task) {
    opener.current = trigger;
    setDraft({ stage, task });
  }

  if (!ready && tasks.length === 0) {
    return (
      <header className={pageHeader}>
        <div>
          <h1 className="text-workspace-title">Workbench</h1>
          <p
            className="mt-2 text-sm/normal text-muted-foreground"
            role={warning ? "alert" : "status"}
          >
            {warning || "Opening your board…"}
          </p>
        </div>
      </header>
    );
  }

  return (
    <>
      <header className="mb-4 grid grid-cols-[minmax(0,1fr)_auto] items-center justify-between gap-2 md:mb-6 md:gap-x-3 md:gap-y-1.5">
        <h1 className="text-workspace-title">Workbench</h1>
        <Button
          ref={addButton}
          disabled={!ready}
          size="lg"
          className="px-3 pointer-coarse:px-4"
          onClick={(event) => openDraft("todo", event.currentTarget)}
        >
          <PlusIcon aria-hidden="true" />
          New task
        </Button>
        <p className="col-span-full text-sm/normal text-muted-foreground">{description}</p>
      </header>
      {tasks.length === 0 ? (
        <section
          className={`${focusPanel} min-h-[clamp(8.75rem,15vw,11rem)]`}
          aria-labelledby="first-task-title"
        >
          <img
            src={assembly}
            alt=""
            width="900"
            height="600"
            className="absolute top-0 right-0 -z-1 h-full w-[38%] object-contain object-[50%_52%] mask-[radial-gradient(ellipse_65%_76%_at_center,black_52%,transparent_93%)]"
          />
          <div className={`${focusContent} w-[65%] gap-2`}>
            <h2 id="first-task-title" className={focusTitle}>
              Add your first task
            </h2>
            <p className="max-w-[38ch] text-sm/normal text-[#e5d9cf]">
              Choose New task to include notes, or use + in a column to add just a title.
            </p>
          </div>
        </section>
      ) : (
        <section
          className="grid grid-cols-[minmax(0,1.95fr)_minmax(0,1fr)] gap-4 workspace-stacked:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)] workspace-stacked:gap-3 workspace-compact:grid-cols-1 workspace-compact:gap-0"
          aria-label="Board summary"
        >
          <section
            className={`${focusPanel} min-h-[222px] workspace-stacked:min-h-[210px] workspace-compact:min-h-[164px]`}
            aria-labelledby="focus-title"
          >
            <img
              src={assembly}
              alt=""
              width="900"
              height="600"
              className="absolute top-0 right-0 -z-1 h-full w-[49%] object-cover object-[50%_52%] mask-[linear-gradient(to_right,transparent,black_20%)]"
            />
            <div
              className={`${focusContent} w-[61%] gap-4 workspace-stacked:w-[64%] workspace-compact:gap-2`}
            >
              <span className="flex items-center gap-2 font-mono text-[10px]/normal font-semibold tracking-[0.12em] text-[#e5d9cf] uppercase">
                <i aria-hidden="true" className="size-[7px] rounded-full bg-brand-amber" />
                {active ? "Current focus" : focus ? "Up next" : "Board complete"}
              </span>
              <h2 id="focus-title" className={`${focusTitle} max-w-[13ch]`}>
                {focus?.title ?? "All caught up."}
              </h2>
              <button
                type="button"
                disabled={!ready}
                className="inline-flex min-h-9 cursor-pointer items-center rounded-control border border-[#707071] bg-plate px-3
                  font-sans text-[13px]/4.5 font-medium text-on-plate hover:border-[#aaa4a0] hover:bg-[#29292b]
                  focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-on-plate
                  pointer-coarse:min-h-11"
                onClick={(event) => openDraft(focus?.stage ?? "todo", event.currentTarget, focus)}
              >
                {focus ? "Edit task" : "Add a task"}
              </button>
            </div>
          </section>
          <section
            className="flex min-w-0 flex-col justify-center rounded-panel border bg-card p-panel workspace-compact:flex-row
              workspace-compact:items-center workspace-compact:justify-between workspace-compact:gap-3
              workspace-compact:rounded-none workspace-compact:border-0 workspace-compact:border-b
              workspace-compact:bg-transparent workspace-compact:px-0 workspace-compact:py-3"
            aria-labelledby="progress-title"
          >
            <h2
              id="progress-title"
              className="text-sm/[1.4] font-semibold workspace-compact:sr-only"
            >
              Board progress
            </h2>
            <p className="mt-[9px] mb-[13px] text-[40px]/none font-[540] tracking-[-0.065em] tabular-nums workspace-compact:hidden">
              {percent}
              <span className="ml-[3px] text-[0.5em] font-[450] tracking-[-0.04em] text-muted-foreground">
                %
              </span>
            </p>
            <progress
              className="mb-3 block h-4 w-full appearance-none border-0 bg-[color-mix(in_oklab,var(--border),var(--input)_18%)]
                mask-[repeating-linear-gradient(to_right,black_0,black_calc(2.5%-2px),transparent_calc(2.5%-2px),transparent_2.5%)]
                workspace-compact:order-1 workspace-compact:m-0 workspace-compact:h-2 workspace-compact:flex-[0_0_28%]
                workspace-compact:overflow-hidden workspace-compact:rounded-[3px] workspace-compact:mask-none
                [&::-webkit-progress-bar]:bg-transparent [&::-webkit-progress-value]:block
                [&::-webkit-progress-value]:h-full [&::-webkit-progress-value]:bg-primary [&::-moz-progress-bar]:bg-primary"
              aria-label="Task completion"
              value={done}
              max={tasks.length || 1}
            />
            <p className="text-sm text-muted-foreground workspace-compact:text-[12px]">
              <strong className="font-semibold text-foreground">
                {done} of {tasks.length}
              </strong>{" "}
              {tasks.length === 1 ? "task" : "tasks"} complete
            </p>
          </section>
        </section>
      )}
      <section className="mt-8 workspace-compact:mt-5" aria-labelledby="board-title">
        <div className={sectionHeader}>
          <h2 id="board-title" className="text-section-title">
            Task board
          </h2>
          {tasks.length > 0 && (
            <span className="font-mono text-xs/normal text-muted-foreground">
              {tasks.length} {tasks.length === 1 ? "task" : "tasks"}
            </span>
          )}
        </div>
        {warning && (
          <p role="alert" className="mb-3 text-sm text-destructive">
            {warning}
          </p>
        )}
        <div className="grid grid-cols-3 gap-4 workspace-stacked:grid-cols-1 workspace-compact:gap-3">
          {lanes.map((lane) => {
            const items = tasks.filter((task) => task.stage === lane.id);
            return (
              <section
                className={`flex min-w-0 flex-col rounded-panel border bg-workspace-lane px-2.5 pb-2.5 ${tasks.length === 0 ? "not-has-[form]:pb-0" : ""}`}
                key={lane.id}
                aria-labelledby={"console-" + lane.id}
              >
                <QuickAdd
                  laneLabel={lane.label}
                  disabled={!ready}
                  add={(title) =>
                    change((current) => [
                      ...current,
                      { id: crypto.randomUUID(), stage: lane.id, title, note: "" },
                    ])
                  }
                >
                  <i
                    className={`relative size-[13px] shrink-0 rounded-full ${lane.marker}`}
                    aria-hidden="true"
                  />
                  <h3
                    className="text-sm/4.5 font-[620] tracking-[-0.016em]"
                    id={"console-" + lane.id}
                  >
                    {lane.label}
                  </h3>
                  <span className="rounded-[5px] border px-[5px] py-px font-mono text-[11px]/[15px] text-muted-foreground">
                    {items.length}
                  </span>
                </QuickAdd>
                {items.length ? (
                  <ul className="grid gap-2 workspace-stacked:grid-cols-2 [@container_workspace_(max-width:29rem)]:grid-cols-1">
                    {items.map((task) => (
                      <li key={task.id}>
                        <button
                          type="button"
                          disabled={!ready}
                          className="control-focus block w-full cursor-pointer rounded-lg border bg-card p-4 text-left wrap-anywhere hover:border-input"
                          onClick={(event) => openDraft(lane.id, event.currentTarget, task)}
                        >
                          <strong className="line-clamp-2 text-sm/[21px] font-semibold tracking-[-0.012em]">
                            {task.title}
                          </strong>
                          {task.note && (
                            <span className="mt-1.5 line-clamp-2 text-[13px]/5 text-muted-foreground">
                              {task.note}
                            </span>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  tasks.length > 0 && (
                    <p className="grid flex-1 place-items-center rounded-lg border border-dashed border-input px-3 py-6 text-center text-[13px] text-muted-foreground">
                      {lane.empty}
                    </p>
                  )
                )}
              </section>
            );
          })}
        </div>
      </section>
      {draft && (
        <TaskEditor
          draft={draft}
          close={() => setDraft(null)}
          returnFocus={opener}
          save={(task) => {
            const saved = change((current) =>
              draft.task
                ? current.map((existing) => (existing.id === task.id ? task : existing))
                : [...current, task],
            );
            if (saved && draft.task && draft.task.stage !== task.stage)
              opener.current = addButton.current;
            return saved;
          }}
          remove={(id) => {
            opener.current = addButton.current;
            return change((current) => current.filter((t) => t.id !== id));
          }}
        />
      )}
    </>
  );
}
