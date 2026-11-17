import { Button } from "@kipivo/ui/components/button";
import { useEffect, useState } from "react";

export function CopyButton({ text, label }: { text: string; label: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  useEffect(() => {
    if (state !== "copied") return;
    const timeout = setTimeout(() => setState("idle"), 2000);
    return () => clearTimeout(timeout);
  }, [state]);

  return (
    <div className="grid justify-items-end gap-1">
      <Button
        size="sm"
        variant="ghost"
        aria-label={label}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(text);
            setState("copied");
          } catch {
            setState("failed");
          }
        }}
      >
        {state === "copied" ? "Copied" : label === "Copy code" ? label : "Copy"}
      </Button>
      <span
        role="status"
        className={
          state === "failed" ? "max-w-32 text-right text-xs text-muted-foreground" : "sr-only"
        }
      >
        {state === "copied"
          ? `${label} — copied to clipboard.`
          : state === "failed"
            ? "Clipboard unavailable. Select the text and copy it manually."
            : ""}
      </span>
    </div>
  );
}

export function CodeBlock({
  code,
  language = "React / TypeScript",
}: {
  code: string;
  language?: string;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-border bg-card">
      <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-2">
        <span className="py-2 text-xs text-muted-foreground">{language}</span>
        <CopyButton text={code} label="Copy code" />
      </div>
      <pre
        className="overflow-x-auto p-4 text-xs leading-6 outline-ring focus-visible:outline-2"
        tabIndex={0}
      >
        <code>{code}</code>
      </pre>
    </div>
  );
}
