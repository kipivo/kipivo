import { Button } from "@kipivo/ui/components/button";
import { useHydrated } from "@tanstack/react-router";
import { useState } from "react";
import { CommandLine } from "./command-line";

const examples = {
  passing: {
    state: "Succeeded",
    exitCode: 0,
    lines: [
      "Checking formatting…",
      "All files are correctly formatted.",
      "Lint, types and tests passed.",
    ],
    note: "The check finished with exit code 0. Its output stays in the run history so you can review it later.",
  },
  failing: {
    state: "Failed",
    exitCode: 1,
    lines: [
      "Checking formatting…",
      "src/example.ts needs formatting.",
      "Check stopped before the tests ran.",
    ],
    note: "Formatting stopped this check before the tests ran. Fix the file named in the output, then submit a new check.",
  },
} as const;

export function RunExample() {
  const hydrated = useHydrated();
  const [choice, setChoice] = useState<keyof typeof examples>("passing");
  const example = examples[choice];
  return (
    <section
      id="example"
      aria-labelledby="example-title"
      tabIndex={-1}
      className="grid scroll-mt-6 items-center gap-7 border-t border-border py-12 md:grid-cols-[0.85fr_1.15fr] md:gap-12 lg:py-16"
    >
      <div>
        <h2
          id="example-title"
          className="max-w-[14ch] text-balance text-4xl leading-tight font-semibold tracking-tight lg:text-5xl"
        >
          Read a run, line by line.
        </h2>
        <p className="mt-4 max-w-[38ch] leading-relaxed text-muted-foreground">
          The exit code tells you whether a check passed. The logs tell you why. Switch between two
          sample runs to see what to look for.
        </p>
        <div
          role="group"
          aria-label="Example outcome"
          className="mt-6 inline-flex flex-wrap gap-1 rounded-xl border border-border bg-muted p-1"
        >
          {(
            [
              ["passing", "Passing check"],
              ["failing", "Failing check"],
            ] as const
          ).map(([key, label]) => (
            <Button
              key={key}
              type="button"
              variant="ghost"
              disabled={!hydrated}
              aria-pressed={choice === key}
              aria-controls="example-report"
              className="h-9 px-3 text-muted-foreground aria-pressed:bg-card aria-pressed:text-foreground aria-pressed:shadow-xs"
              onClick={() => setChoice(key)}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>
      <figure
        id="example-report"
        className="min-w-0 overflow-hidden rounded-xl border border-border bg-card"
      >
        <figcaption className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-3 sm:px-6">
          <span className="font-medium">Example run report</span>
          <span className="font-mono text-xs text-muted-foreground">local / check</span>
        </figcaption>
        <div className="p-5 sm:p-6">
          <p role="status" className="flex flex-wrap items-baseline justify-between gap-2">
            <strong
              className={
                choice === "passing"
                  ? "text-2xl tracking-tight"
                  : "text-2xl tracking-tight text-destructive"
              }
            >
              {example.state}
            </strong>
            <span className="font-mono text-sm text-muted-foreground">
              Exit code {example.exitCode}
            </span>
          </p>
          <div className="mt-4 overflow-hidden rounded-lg border border-plate-border bg-plate text-on-plate">
            <div className="border-b border-plate-border bg-white/4 px-4 py-2.5">
              <CommandLine line="bun run kpdev check" />
            </div>
            <ol
              aria-label="Sample log lines"
              className="space-y-1 px-4 py-3 font-mono text-[13px]/6"
            >
              {example.lines.map((line, i) => (
                <li
                  key={line}
                  className={`grid grid-cols-[2ch_minmax(0,1fr)] gap-3 text-on-plate/85 ${choice === "passing" ? "last:text-emerald-300" : "last:text-brand-coral"}`}
                >
                  <span aria-hidden="true" className="text-on-plate/55 select-none">
                    0{i + 1}
                  </span>
                  <code className="wrap-anywhere">{line}</code>
                </li>
              ))}
            </ol>
          </div>
          <p className="mt-4 min-h-[3lh] text-sm leading-relaxed text-muted-foreground">
            {example.note}
          </p>
        </div>
      </figure>
    </section>
  );
}
