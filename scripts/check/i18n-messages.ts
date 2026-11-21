import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { ROOT } from "../internal/root.ts";
import { analyzeMessageUsage } from "./i18n-usage.ts";

/**
 * Paraglide compiles a function per message, so a message nobody calls is dead
 * weight in the catalog and in review. TypeScript already rejects unknown ids at
 * call sites; this check covers both directions, including ids that no source
 * references and properties the catalog does not define.
 */
const MESSAGES = join(ROOT, "packages/i18n/messages/en.json");
const SCAN_ROOTS = [join(ROOT, "apps"), join(ROOT, "packages")];
const SKIPPED = new Set(["node_modules", "dist", ".turbo", ".output", "paraglide", "generated"]);
const MESSAGES_ENTRY = "@kipivo/i18n/messages";

async function* sourceFiles(directory: string): AsyncGenerator<string> {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (SKIPPED.has(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) yield* sourceFiles(path);
    else if (/\.tsx?$/.test(entry.name)) yield path;
  }
}

async function callers(): Promise<string[]> {
  const files: string[] = [];
  for (const root of SCAN_ROOTS) {
    for (const workspace of await readdir(root, { withFileTypes: true })) {
      if (!workspace.isDirectory()) continue;
      for await (const file of sourceFiles(join(root, workspace.name, "src"))) files.push(file);
    }
  }
  const sources = await Promise.all(
    files.map(async (file) => ({ file, text: await readFile(file, "utf8") })),
  );
  return sources.filter(({ text }) => text.includes(MESSAGES_ENTRY)).map(({ text }) => text);
}

const messages = JSON.parse(await readFile(MESSAGES, "utf8")) as Record<string, unknown>;
const ids = Object.keys(messages).filter((id) => id !== "$schema");
const usage = analyzeMessageUsage(ids, await callers());

if (usage.unused.length || usage.unknown.length) {
  if (usage.unused.length)
    console.error(`Unused messages in messages/en.json:\n  ${usage.unused.join("\n  ")}`);
  if (usage.unknown.length)
    console.error(`Messages missing from messages/en.json:\n  ${usage.unknown.join("\n  ")}`);
  process.exit(1);
}

console.log(
  usage.dynamic
    ? `i18n: ${ids.length} messages; unused check skipped (dynamic usage).`
    : `i18n: ${ids.length} messages, all referenced.`,
);
