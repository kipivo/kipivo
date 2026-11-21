import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { ROOT } from "../internal/root.ts";

/**
 * Paraglide compiles a function per message, so a message nobody calls is dead
 * weight in the catalog and in review. TypeScript already rejects unknown ids at
 * call sites; this check covers the other direction.
 */
const MESSAGES = join(ROOT, "packages/i18n/messages/en.json");
const SCAN_ROOTS = [join(ROOT, "apps"), join(ROOT, "packages")];
const SKIPPED = new Set(["node_modules", "dist", ".turbo", ".output", "paraglide"]);
const MESSAGE_IMPORT = /from\s+["']@kipivo\/i18n\/messages["']/;

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
  return sources.filter(({ text }) => MESSAGE_IMPORT.test(text)).map(({ text }) => text);
}

const messages = JSON.parse(await readFile(MESSAGES, "utf8")) as Record<string, unknown>;
const ids = Object.keys(messages).filter((id) => id !== "$schema");
const sources = await callers();
const joined = sources.join("\n");

// A message may be called (`m.x()`) or passed as a value (`{ invalid: m.x }`).
const unused = ids.filter((id) => !new RegExp(String.raw`\bm\.${id}\b`).test(joined));
const known = new Set(ids);
const unknown = new Set<string>();
for (const match of joined.matchAll(/\bm\.([A-Za-z_$][\w$]*)\b/g)) {
  if (!known.has(match[1])) unknown.add(match[1]);
}

if (unused.length || unknown.size) {
  if (unused.length)
    console.error(`Unused messages in messages/en.json:\n  ${unused.join("\n  ")}`);
  if (unknown.size)
    console.error(`Messages missing from messages/en.json:\n  ${[...unknown].join("\n  ")}`);
  process.exit(1);
}

console.log(`i18n: ${ids.length} messages, all referenced.`);
