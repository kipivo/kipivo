import { expect, test } from "bun:test";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readGuidePaths } from "../smoke/docs";

test("every Docs guide has an English and Simplified Chinese source", () => {
  expect(readGuidePaths().get("/docs/zh-CN")).toBe("zh-CN");
});

test("reports missing source files in both languages even for nested guides", async () => {
  const directory = await mkdtemp(join(tmpdir(), "kipivo-docs-"));
  try {
    await mkdir(join(directory, "nested"));
    await writeFile(join(directory, "nested/index.mdx"), "English only");
    await writeFile(join(directory, "orphan.zh-CN.mdx"), "Chinese only");

    expect(() => readGuidePaths(directory)).toThrow(/nested\/index\.zh-CN\.mdx\n  orphan\.mdx/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
