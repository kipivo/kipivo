import type { Locale } from "@kipivo/i18n/runtime";

export const languageNames = {
  en: { full: "English", short: "EN" },
  "zh-CN": { full: "简体中文", short: "简中" },
} satisfies Record<Locale, { full: string; short: string }>;
