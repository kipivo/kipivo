import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import { RunDetails } from "./details";

test("run details prompt for a selection without showing a stale log", () => {
  const html = renderToStaticMarkup(<RunDetails />);
  expect(html).toContain("Choose a run to see its logs.");
  expect(html).not.toContain('role="log"');
});

test("a finished run shows its log, exit code, and truncation notice", () => {
  const html = renderToStaticMarkup(
    <RunDetails
      detail={{
        id: "d561a227-7580-4bb0-994e-8b852810df9b",
        kind: "check",
        status: "succeeded",
        createdAt: "2026-01-01T00:00:00Z",
        startedAt: "2026-01-01T00:00:00Z",
        finishedAt: "2026-01-01T00:00:01Z",
        exitCode: 0,
        error: null,
        logs: "build finished",
        logTruncated: true,
      }}
    />,
  );
  expect(html).toContain("<dt>Exit code</dt><dd>0</dd>");
  expect(html).toContain("build finished");
  expect(html).toContain("Log limit reached.");
});
