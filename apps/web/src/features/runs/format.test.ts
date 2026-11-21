import { expect, test } from "vitest";
import { formatRunTime } from "./format";

test("formats run times in the active locale", () => {
  const timestamp = "2026-01-02T03:04:00Z";
  expect(formatRunTime(timestamp, "en-GB")).toContain("2 Jan");
  expect(formatRunTime(timestamp, "zh-CN")).toContain("1月2日");
  expect(formatRunTime(timestamp, "zh-CN")).toContain("UTC");
});

test("falls back for an invalid timestamp", () => {
  expect(formatRunTime("not-a-date", "zh-CN")).toBe("Unknown date");
});
