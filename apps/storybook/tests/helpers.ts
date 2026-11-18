import { expect, type Page } from "@playwright/test";

function storyUrl(id: string, theme: string) {
  return `/iframe.html?id=${id}&viewMode=story&globals=theme:${theme}`;
}

export async function openStory(page: Page, id: string, theme: string) {
  await page.goto(storyUrl(id, theme));
  await expect(page.locator("html")).toHaveClass(new RegExp(`\\b${theme}\\b`));
  await expect(page.locator("#storybook-root")).not.toBeEmpty();
}
