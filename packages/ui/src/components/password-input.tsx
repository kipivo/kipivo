import { EyeIcon, EyeOffIcon } from "@kipivo/icons";
import { useId, useState, type ComponentProps } from "react";
import { cn } from "../lib/utils";
import { Button } from "./button";
import { Input } from "./input";

export function PasswordInput({
  id,
  disabled,
  className,
  visibilityLabels,
  ...props
}: Omit<ComponentProps<typeof Input>, "type"> & {
  visibilityLabels?: { show: string; hide: string };
}) {
  const defaultId = useId();
  const inputId = id ?? defaultId;
  const [revealed, setRevealed] = useState(false);
  const VisibilityIcon = revealed ? EyeOffIcon : EyeIcon;
  const actionLabel = revealed
    ? (visibilityLabels?.hide ?? "Hide password")
    : (visibilityLabels?.show ?? "Show password");

  return (
    <div className="relative">
      <Input
        {...props}
        id={inputId}
        type={revealed ? "text" : "password"}
        disabled={disabled}
        className={cn("pe-10 pointer-coarse:pe-12", className)}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        disabled={disabled}
        className="absolute inset-y-0 end-1 my-auto text-muted-foreground"
        aria-controls={inputId}
        aria-label={actionLabel}
        title={actionLabel}
        onClick={() => setRevealed((current) => !current)}
      >
        <VisibilityIcon aria-hidden="true" strokeWidth={2} className="size-4.5" />
      </Button>
    </div>
  );
}
