import { Wordmark, type WordmarkProps } from "@kipivo/ui";
import { Badge } from "@kipivo/ui/components/badge";
import { Button } from "@kipivo/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@kipivo/ui/components/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@kipivo/ui/components/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@kipivo/ui/components/dropdown-menu";
import { Input } from "@kipivo/ui/components/input";
import { Label } from "@kipivo/ui/components/label";
import { Textarea } from "@kipivo/ui/components/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@kipivo/ui/components/tooltip";
import { useId, useState } from "react";
import logo from "../../../assets/logo.svg";

export function ButtonExample({
  label = "Run checks",
  variant = "default",
  size = "default",
  disabled = false,
  loading = false,
}: {
  label?: string;
  variant?: "default" | "secondary" | "outline" | "ghost" | "destructive" | "link";
  size?: "xs" | "sm" | "default" | "lg";
  disabled?: boolean;
  loading?: boolean;
}) {
  const [clicks, setClicks] = useState(0);
  return (
    <div className="grid justify-items-center gap-4">
      <Button
        variant={variant}
        size={size}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        onClick={() => setClicks((value) => value + 1)}
      >
        {loading ? "Running checks…" : label}
      </Button>
      <p className="text-xs text-muted-foreground" role="status">
        {clicks === 0
          ? "Click to try the action."
          : `Action ran ${clicks} ${clicks === 1 ? "time" : "times"}.`}
      </p>
    </div>
  );
}

export interface FieldExampleProps {
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  invalid?: boolean;
  description?: string;
  readOnly?: boolean;
  defaultValue?: string;
}

function FieldExample({
  multiline,
  label = "Task name",
  placeholder = "Check the project",
  disabled = false,
  required = false,
  invalid = false,
  description,
  readOnly,
  defaultValue,
}: FieldExampleProps & { multiline: boolean }) {
  const id = useId();
  const Control = multiline ? Textarea : Input;
  const describedBy = [description && `${id}-description`, invalid && `${id}-error`]
    .filter(Boolean)
    .join(" ");
  return (
    <div className="grid w-80 max-w-full gap-2">
      <Label htmlFor={id}>
        {label}
        {required ? " (required)" : ""}
      </Label>
      <Control
        id={id}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        readOnly={readOnly}
        defaultValue={defaultValue}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy || undefined}
      />
      {description && (
        <p id={`${id}-description`} className="text-sm text-muted-foreground">
          {description}
        </p>
      )}
      {invalid && (
        <p id={`${id}-error`} className="text-sm text-destructive">
          Enter a {multiline ? "description" : "task name"} to continue.
        </p>
      )}
    </div>
  );
}

export function InputExample(props: FieldExampleProps) {
  return <FieldExample {...props} multiline={false} />;
}

export function TextareaExample(props: FieldExampleProps) {
  return <FieldExample {...props} multiline />;
}

export function LabelExample({ label = "Project name" }: { label?: string }) {
  const id = useId();
  return (
    <div className="grid w-80 max-w-full gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} placeholder="Kipivo" />
    </div>
  );
}

export function BadgeExample({
  label = "Passed",
  variant = "secondary",
}: {
  label?: string;
  variant?: "default" | "secondary" | "destructive" | "outline" | "ghost" | "link";
}) {
  return <Badge variant={variant}>{label}</Badge>;
}

export function CardExample({
  title = "Project checks",
  description = "Review the latest local verification.",
  compact = false,
}: {
  title?: string;
  description?: string;
  compact?: boolean;
}) {
  return (
    <Card className="w-80 max-w-full" size={compact ? "sm" : "default"}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm">No runs yet. Start a check to see its output here.</p>
      </CardContent>
      <CardFooter>
        <Button>Run checks</Button>
      </CardFooter>
    </Card>
  );
}

export function DialogExample({
  title = "Delete this run?",
  description = "This removes the run and its saved logs. You cannot undo this action.",
}: {
  title?: string;
  description?: string;
}) {
  const [deleted, setDeleted] = useState(false);
  return (
    <div className="grid justify-items-center gap-4">
      <Dialog>
        <DialogTrigger render={<Button variant="outline" />}>Delete run</DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <DialogClose render={<Button variant="destructive" />} onClick={() => setDeleted(true)}>
              Delete run
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <p role="status" className="text-xs text-muted-foreground">
        {deleted ? "Example run deleted." : "Try Escape or Cancel to dismiss."}
      </p>
    </div>
  );
}

export function DropdownMenuExample({
  label = "Run actions",
  retryDisabled = true,
}: {
  label?: string;
  retryDisabled?: boolean;
}) {
  const [action, setAction] = useState("Choose an action.");
  return (
    <div className="grid justify-items-center gap-4">
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="outline" />}>{label}</DropdownMenuTrigger>
        <DropdownMenuContent className="w-44">
          <DropdownMenuItem onClick={() => setAction("Showing example logs.")}>
            View logs
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={retryDisabled}
            onClick={() => setAction("Example retry queued.")}
          >
            Retry run
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={() => setAction("Example run deleted.")}>
            Delete run
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <p role="status" className="text-xs text-muted-foreground">
        {action}
      </p>
    </div>
  );
}

export function TooltipExample({
  label = "Run checks",
  description = "Run the project's configured checks.",
}: {
  label?: string;
  description?: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger render={<Button variant="outline" />}>{label}</TooltipTrigger>
      <TooltipContent>{description}</TooltipContent>
    </Tooltip>
  );
}

export function WordmarkExample({
  name = "Kipivo",
  variant,
}: Partial<Omit<WordmarkProps, "logo">>) {
  return <Wordmark logo={logo} name={name} variant={variant} />;
}
