import { expect, it } from "vitest";
import en from "../messages/en.json" with { type: "json" };
import zh from "../messages/zh-CN.json" with { type: "json" };

// Surfaces that ship in English only; Paraglide falls back to the base locale.
const englishOnly = new Set([
  "credentialCreate",
  "credentialCreating",
  "credentialInvalidName",
  "credentialCannotCreate",
  "credentialPasswordRequirement",
  "signUpDocumentTitle",
  "signUpHeading",
  "signUpSignInPrompt",
  "setupDocumentTitle",
  "setupHeading",
  "setupIntro",
  "setupSubmit",
  "setupBusy",
  "setupFailed",
  "setupUnavailable",
  "setupCheckAgain",
]);

interface MessageFile {
  $schema?: string;
  [id: string]: unknown;
}

function ids(messages: MessageFile): string[] {
  return Object.keys(messages).filter((id) => id !== "$schema");
}

it("every English message has a Chinese translation", () => {
  const translated = new Set(ids(zh));
  const missing = ids(en).filter((id) => !englishOnly.has(id) && !translated.has(id));
  expect(missing).toEqual([]);
});

it("Chinese adds no messages beyond the English catalog", () => {
  const english = new Set(ids(en));
  expect(ids(zh).filter((id) => !english.has(id))).toEqual([]);
});

it("keeps English-only surfaces out of the Chinese catalog", () => {
  for (const id of englishOnly) {
    expect(ids(en)).toContain(id);
    expect(ids(zh)).not.toContain(id);
  }
});

it("never ships an empty message", () => {
  for (const [id, value] of Object.entries(en)) {
    if (id !== "$schema") expect(value, id).toEqual(expect.any(String));
    if (typeof value === "string") expect(value.trim(), id).not.toBe("");
  }
});
