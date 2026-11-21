import { baseLocale, isLocale, locales, type Locale } from "@kipivo/i18n/runtime";
import type { I18nConfig } from "fumadocs-core/i18n";
import { docsBase } from "../mount";

export const i18n: I18nConfig<Locale> = {
  languages: [...locales],
  defaultLanguage: baseLocale,
  hideLocale: "default-locale",
};

export function guidePath(splat = "") {
  const slugs = splat.split("/").filter(Boolean);
  const prefix = slugs[0];
  const language = isLocale(prefix) ? prefix : baseLocale;
  return { language, slugs: language === baseLocale ? slugs : slugs.slice(1) };
}

export function guideUrl(slugs: string[], language: string = baseLocale) {
  return [docsBase, ...(language === baseLocale ? [] : [language]), ...slugs].join("/");
}

export const chineseLabels = {
  "Search(search dialog)": "搜索文档",
  "Search(search trigger)": "搜索",
  "Open Search(search trigger)(aria-label)": "搜索文档",
  "Close Search(search dialog)(aria-label)": "关闭搜索",
  "No results found(search dialog)": "没有找到相关文档",
  "Search failed(search dialog)": "搜索失败",
  "On this page(table of contents)": "本页目录",
  "No Headings(table of contents)": "本页没有小节",
  "Previous Page(pagination)": "上一页",
  "Next Page(pagination)": "下一页",
  "Open Sidebar(aria-label)": "打开侧边栏",
  "Open Sidebar(sidebar)(aria-label)": "打开侧边栏",
  "Close Sidebar(aria-label)": "关闭侧边栏",
  "Close Sidebar(sidebar)(aria-label)": "关闭侧边栏",
  "Collapse Sidebar(sidebar)(aria-label)": "收起侧边栏",
  "Copy Text(code block)(aria-label)": "复制代码",
  "Copied Text(code block)(aria-label)": "已复制代码",
  "Copy Anchor Link(heading anchor)(aria-label)": "复制小节链接",
  "Copied Anchor Link(heading anchor)(aria-label)": "已复制小节链接",
  "Skip to Content(skip link)": "跳至正文",
};
