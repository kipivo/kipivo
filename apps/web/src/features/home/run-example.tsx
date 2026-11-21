import { m } from "@kipivo/i18n/messages";
import { Button } from "@kipivo/ui/components/button";
import { useHydrated } from "@tanstack/react-router";
import { useState } from "react";
import { CommandLine } from "./command-line";

const examples = {
  passing: {
    state: m.homeSucceeded,
    exitCode: 0,
    lines: [
      "Checking formatting…",
      "All files are correctly formatted.",
      "Lint, types and tests passed.",
    ],
    note: m.homePassNote,
  },
  failing: {
    state: m.homeFailed,
    exitCode: 1,
    lines: [
      "Checking formatting…",
      "src/example.ts needs formatting.",
      "Check stopped before the tests ran.",
    ],
    note: m.homeFailNote,
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
          {m.homeReadRun()}
        </h2>
        <p className="mt-4 max-w-[38ch] leading-relaxed text-muted-foreground">
          {m.homeReadIntro()}
        </p>
        <div
          role="group"
          aria-label={m.homeOutcome()}
          className="mt-6 inline-flex flex-wrap gap-1 rounded-xl border border-border bg-muted p-1"
        >
          {(
            [
              ["passing", m.homePassingCheck()],
              ["failing", m.homeFailingCheck()],
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
          <span className="font-medium">{m.homeReport()}</span>
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
              {example.state()}
            </strong>
            <span className="font-mono text-sm text-muted-foreground">
              {m.homeExitCode({ code: example.exitCode })}
            </span>
          </p>
          <div className="mt-4 overflow-hidden rounded-lg border border-plate-border bg-plate text-on-plate">
            <div className="border-b border-plate-border bg-white/4 px-4 py-2.5">
              <CommandLine line="bun run kpdev check" />
            </div>
            <ol
              aria-label={m.homeSampleLogs()}
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
            {example.note()}
          </p>
        </div>
      </figure>
    </section>
  );
}
