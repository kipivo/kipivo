import { Badge } from "@kipivo/ui/components/badge";
import { Button } from "@kipivo/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader } from "@kipivo/ui/components/card";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useId, useState } from "react";
import { expect } from "storybook/test";

const runStatuses = {
  running: { label: "Running", variant: "default" },
  succeeded: { label: "Passed", variant: "secondary" },
  failed: { label: "Failed", variant: "destructive" },
} as const;

const sampleRuns = [
  {
    id: "103",
    status: "running",
    startedAt: "2026-11-17T10:42:00Z",
    timeLabel: "10:42 UTC",
    logs: "Starting workspace checks…\nChecking TypeScript projects…",
  },
  {
    id: "102",
    status: "succeeded",
    startedAt: "2026-11-17T10:34:00Z",
    timeLabel: "10:34 UTC",
    logs: "TypeScript checks passed.\nAll 24 tests passed.",
  },
  {
    id: "101",
    status: "failed",
    startedAt: "2026-11-17T10:26:00Z",
    timeLabel: "10:26 UTC",
    logs: "TypeScript checks passed.\n1 of 24 tests failed.\ncache tests: rejects an expired session",
  },
] as const;

function RunHistory({ empty }: { empty: boolean }) {
  const id = useId();
  const [expanded, setExpanded] = useState<string>();

  return (
    <section className="mx-auto w-full max-w-2xl" aria-labelledby={`${id}-title`}>
      <Card className="[--card-spacing:--spacing(5)] sm:[--card-spacing:--spacing(6)]">
        <CardHeader>
          <h1 id={`${id}-title`} className="text-xl font-semibold tracking-tight">
            Run history
          </h1>
          <CardDescription>Recent checks from your local runner.</CardDescription>
        </CardHeader>
        <CardContent>
          {empty ? (
            <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center">
              <h2 className="font-medium">No runs yet</h2>
              <p className="mt-1 text-muted-foreground">
                Run your first check to see its status and logs here.
              </p>
            </div>
          ) : (
            <ul className="overflow-hidden rounded-lg border border-border">
              {sampleRuns.map((run) => {
                const status = runStatuses[run.status];
                const logsId = `${id}-logs-${run.id}`;
                const isExpanded = expanded === run.id;

                return (
                  <li key={run.id} className="border-border not-last:border-b">
                    <div className="flex flex-wrap items-center justify-between gap-3 p-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="font-medium">Check run #{run.id}</h2>
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </div>
                        <time
                          className="mt-1 block text-xs text-muted-foreground"
                          dateTime={run.startedAt}
                        >
                          {run.timeLabel}
                        </time>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        aria-label={`${isExpanded ? "Hide" : "View"} logs for check run #${run.id}`}
                        aria-controls={logsId}
                        aria-expanded={isExpanded}
                        onClick={() => setExpanded(isExpanded ? undefined : run.id)}
                      >
                        {isExpanded ? "Hide logs" : "View logs"}
                      </Button>
                    </div>
                    <pre
                      id={logsId}
                      hidden={!isExpanded}
                      aria-label={`Logs for check run #${run.id}`}
                      className="mx-4 mb-4 rounded-md bg-muted px-3 py-2 font-mono text-xs leading-relaxed wrap-anywhere whitespace-pre-wrap text-foreground"
                    >
                      {run.logs}
                    </pre>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

const meta = {
  title: "Patterns/Run History",
  component: RunHistory,
  tags: ["autodocs"],
  args: { empty: false },
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "A responsive list of local check runs composed from Card, Badge, and Button. Status badges have text labels, and each run has a keyboard-operable disclosure for its logs.",
      },
    },
  },
} satisfies Meta<typeof RunHistory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = { args: { empty: true } };

export const InspectLogs: Story = {
  play: async ({ canvas, userEvent }) => {
    const running = canvas.getByRole("button", { name: "View logs for check run #103" });
    const passed = canvas.getByRole("button", { name: "View logs for check run #102" });
    const failed = canvas.getByRole("button", { name: "View logs for check run #101" });

    await userEvent.tab();
    await expect(running).toHaveFocus();
    await userEvent.tab();
    await expect(passed).toHaveFocus();
    await userEvent.tab();
    await expect(failed).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await expect(failed).toHaveAttribute("aria-expanded", "true");
    await expect(canvas.getByText(/1 of 24 tests failed/)).toBeVisible();

    await userEvent.keyboard(" ");
    await expect(failed).toHaveAttribute("aria-expanded", "false");
    await expect(canvas.getByText(/1 of 24 tests failed/)).not.toBeVisible();
  },
};
