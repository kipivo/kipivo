import { CloseIcon, PlusIcon } from "@kipivo/icons";
import { type ReactNode, useLayoutEffect, useRef, useState } from "react";
import { Button } from "@kipivo/ui/components/button";
import { Input } from "@kipivo/ui/components/input";

export function QuickAdd({
  children,
  laneLabel,
  disabled,
  add,
}: {
  children: ReactNode;
  laneLabel: string;
  disabled: boolean;
  add: (title: string) => boolean;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const trigger = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const restoreFocus = useRef(false);
  const toggleLabel = open ? `Cancel adding task to ${laneLabel}` : `Add task to ${laneLabel}`;
  const ToggleIcon = open ? CloseIcon : PlusIcon;

  useLayoutEffect(() => {
    if (open) input.current?.focus();
    else if (restoreFocus.current) {
      trigger.current?.focus({ preventScroll: true });
      restoreFocus.current = false;
    }
  }, [open]);

  function close() {
    restoreFocus.current = true;
    setOpen(false);
    setTitle("");
  }

  return (
    <>
      <header className="flex min-h-[46px] items-center gap-2 py-[9px] pr-0.5 pl-[5px]">
        {children}
        <Button
          ref={trigger}
          type="button"
          variant="ghost"
          size="icon-sm"
          className="ml-auto text-muted-foreground"
          disabled={disabled}
          aria-label={toggleLabel}
          title={toggleLabel}
          aria-expanded={open}
          onClick={() => (open ? close() : setOpen(true))}
        >
          <ToggleIcon aria-hidden="true" />
        </Button>
      </header>
      {open && (
        <form
          className="mt-auto grid min-w-0 gap-2 pt-1"
          onSubmit={(event) => {
            event.preventDefault();
            if (!disabled && title.trim() && add(title.trim())) close();
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape" && !event.nativeEvent.isComposing) {
              event.preventDefault();
              close();
            }
          }}
        >
          <Input
            ref={input}
            aria-label="Task title"
            placeholder="Task title"
            maxLength={140}
            required
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
          <div className="flex flex-wrap items-center gap-1">
            <Button size="sm" type="submit" disabled={disabled || !title.trim()}>
              Add task
            </Button>
            <Button size="sm" type="button" variant="ghost" onClick={close}>
              Cancel
            </Button>
          </div>
        </form>
      )}
    </>
  );
}
