import { TerminalIcon } from "@kipivo/icons";
import { Link } from "@tanstack/react-router";
import { CopyCommands } from "@/features/runs/command";
import { CommandLine } from "./command-line";

const sessions = [
  {
    terminal: "Terminal 1",
    note: "Keep open",
    steps: [{ title: "Start the runner", commands: "bun run kpdev runner serve" }],
  },
  {
    terminal: "Terminal 2",
    note: "Same checkout",
    steps: [
      { title: "Submit a check", commands: "id=$(bun run kpdev runner run check)" },
      {
        title: "Read the result",
        commands: 'bun run kpdev runner status "$id"\nbun run kpdev runner logs "$id"',
      },
    ],
  },
];

export function Quickstart() {
  return (
    <section
      id="quickstart"
      aria-labelledby="quickstart-title"
      tabIndex={-1}
      className="grid scroll-mt-6 items-start gap-7 border-t border-border py-12 md:grid-cols-[0.85fr_1.15fr] md:gap-12 lg:py-16"
    >
      <div>
        <h2
          id="quickstart-title"
          className="text-balance text-4xl font-semibold tracking-tight lg:text-5xl"
        >
          Run it locally.
        </h2>
        <p className="mt-4 max-w-[38ch] leading-relaxed text-muted-foreground">
          On macOS or Linux, install the dependencies and open two terminals at the root of your
          trusted Kipivo checkout. Run the check and read its logs in the same terminal so the run
          ID stays available.
        </p>
        {import.meta.env.DEV && (
          <p className="mt-4 max-w-[38ch] text-sm leading-relaxed text-muted-foreground">
            Prefer the browser? With the runner active, open{" "}
            <Link
              to="/runs"
              className="control-focus rounded-sm text-foreground underline underline-offset-4"
            >
              Local runs
            </Link>{" "}
            to submit a check or follow its output.
          </p>
        )}
      </div>
      <div className="grid min-w-0 gap-4">
        {sessions.map(({ terminal, note, steps }) => (
          <div
            key={terminal}
            className="min-w-0 overflow-hidden rounded-xl border border-plate-border bg-plate text-on-plate"
          >
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-plate-border bg-white/4 px-4 py-2.5 sm:px-5">
              <h3 className="flex items-center gap-2 font-mono text-xs font-medium">
                <TerminalIcon size={15} aria-hidden="true" className="text-brand-coral" />
                {terminal}
              </h3>
              <span className="text-xs text-on-plate/65">{note}</span>
            </div>
            <div className="divide-y divide-plate-border">
              {steps.map(({ title, commands }) => (
                <div key={title} className="px-4 py-3 sm:px-5">
                  <div className="mb-1 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                    <h4 className="text-xs font-medium text-on-plate/70">{title}</h4>
                    <CopyCommands
                      title={title}
                      commands={commands}
                      className="min-w-14 border-white/20 bg-transparent text-on-plate/80 hover:bg-white/10 hover:text-on-plate focus-visible:outline-on-plate dark:border-white/20 dark:bg-transparent dark:hover:bg-white/10"
                    />
                  </div>
                  {commands.split("\n").map((line) => (
                    <CommandLine key={line} line={line} />
                  ))}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
