import { useState, type RefObject } from "react";
import { Button } from "@kipivo/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@kipivo/ui/components/dialog";
import { Input } from "@kipivo/ui/components/input";
import { Label } from "@kipivo/ui/components/label";
import { Textarea } from "@kipivo/ui/components/textarea";
import { NativeSelect, NativeSelectOption } from "@kipivo/ui/components/native-select";
import { lanes, type Stage, type Task } from "./tasks";

export type Draft = { stage: Stage; task?: Task };
export function TaskEditor({
  draft,
  close,
  save,
  remove,
  returnFocus,
}: {
  draft: Draft;
  close: () => void;
  save: (task: Task) => boolean;
  remove: (id: string) => boolean;
  returnFocus: RefObject<HTMLElement | null>;
}) {
  const [title, setTitle] = useState(draft.task?.title ?? "");
  const [note, setNote] = useState(draft.task?.note ?? "");
  const [stage, setStage] = useState(draft.stage);
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState("");
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <DialogContent
        finalFocus={returnFocus}
        presentation="detail"
        className="sm:max-w-md md:grid-rows-[auto_minmax(0,1fr)] md:content-stretch md:gap-0 md:overflow-hidden md:p-0"
      >
        <DialogHeader className="md:border-b md:border-border md:p-6">
          <DialogTitle>{draft.task ? "Edit task" : "New task"}</DialogTitle>
          <DialogDescription>
            {draft.task
              ? "Update the title, notes, or status."
              : "Give the task a title and choose where it belongs."}
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4 md:min-h-0 md:grid-rows-[minmax(0,1fr)_auto] md:gap-0"
          onSubmit={(event) => {
            event.preventDefault();
            if (!title.trim()) {
              setError("Enter a task title.");
              return;
            }
            if (
              save({
                id: draft.task?.id ?? crypto.randomUUID(),
                title: title.trim(),
                note: note.trim(),
                stage,
              })
            )
              close();
            else setError("Could not save the task. Check browser storage and try again.");
          }}
        >
          <div className="grid content-start gap-4 md:overflow-y-auto md:p-6">
            <div className="grid gap-2">
              <Label htmlFor="task-title">Title</Label>
              <Input
                id="task-title"
                required
                maxLength={140}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What needs to happen?"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="task-notes">
                Notes <span className="font-normal text-muted-foreground">(optional)</span>
              </Label>
              <Textarea
                id="task-notes"
                maxLength={2000}
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="task-stage">Status</Label>
              <NativeSelect
                id="task-stage"
                className="w-full"
                value={stage}
                onChange={(e) => setStage(e.target.value as Stage)}
              >
                {lanes.map((lane) => (
                  <NativeSelectOption key={lane.id} value={lane.id}>
                    {lane.label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            {confirm && (
              <p role="status" className="text-sm text-destructive">
                Delete this task and its notes? This cannot be undone.
              </p>
            )}
          </div>
          <DialogFooter className="[&_button]:min-h-9 pointer-coarse:[&_button]:min-h-11 md:m-0 md:rounded-none md:px-6">
            {draft.task && (
              <Button
                type="button"
                variant="destructive"
                className="sm:mr-auto"
                onClick={() => {
                  if (!confirm) {
                    setConfirm(true);
                    return;
                  }
                  if (draft.task && remove(draft.task.id)) close();
                  else setError("Could not delete the task. Try again.");
                }}
              >
                {confirm ? "Confirm delete" : "Delete task"}
              </Button>
            )}
            <Button type="button" variant="outline" onClick={close}>
              Cancel
            </Button>
            <Button type="submit">{draft.task ? "Save changes" : "Create task"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
