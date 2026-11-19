import { Button } from "@kipivo/ui/components/button";
import { copyText } from "@kipivo/ui/lib/clipboard";
import { useState } from "react";

interface CommandProps {
  title: string;
  commands: string;
}

export function CopyCommands({
  title,
  commands,
  className,
}: CommandProps & { className?: string }) {
  const [result, setResult] = useState<"copied" | "failed">();

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        aria-label={`Copy commands: ${title}`}
        className={className}
        onClick={async () => setResult(await copyText(commands))}
      >
        {result === "copied" ? "Copied" : "Copy"}
      </Button>
      <span role="status" className={result === "failed" ? "basis-full text-xs" : "sr-only"}>
        {result === "copied" && "Commands copied to clipboard."}
        {result === "failed" && "Select the command to copy it manually."}
      </span>
    </>
  );
}

export function RunCommand({ title, commands }: CommandProps) {
  return (
    <div className="mt-3 rounded-lg bg-muted px-3 py-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <pre className="min-w-0 whitespace-pre-wrap break-all py-1 font-mono text-sm leading-relaxed">
          <code>{commands}</code>
        </pre>
        <CopyCommands title={title} commands={commands} />
      </div>
    </div>
  );
}
