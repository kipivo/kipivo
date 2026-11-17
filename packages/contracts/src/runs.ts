import { z } from "zod";

export const runId = z.uuid();
export const submitCheck = z.strictObject({ kind: z.literal("check") });
export const submittedRun = z.object({ id: runId });
export const runnerError = z.object({ error: z.string() });
export const runSummary = z.object({
  id: runId,
  kind: z.literal("check"),
  status: z.enum(["queued", "running", "succeeded", "failed"]),
  createdAt: z.string(),
  startedAt: z.string().nullable(),
  finishedAt: z.string().nullable(),
  exitCode: z.int().nullable(),
  error: z.string().nullable(),
  logTruncated: z.boolean(),
});
export const runList = z.array(runSummary);
export const runDetail = runSummary.extend({ logs: z.string() });

export type RunSummary = z.infer<typeof runSummary>;
export type RunDetail = z.infer<typeof runDetail>;
