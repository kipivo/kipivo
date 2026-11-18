import { expect, test } from "@playwright/test";
import { openStory } from "./helpers";

test("native Controls edit and reset the example args", async ({ page }, testInfo) => {
  await page.goto(
    `/?path=/story/components-button--primary&globals=theme:${testInfo.project.name}`,
  );
  const preview = page.frameLocator("#storybook-preview-iframe");
  const controls = page.getByRole("region", { name: "Addon panel", exact: true });
  const label = controls.getByPlaceholder("Edit string...", { exact: true });
  await label.fill("Check now");
  await preview.getByRole("button", { name: "Check now" }).click();
  await expect(preview.getByRole("status")).toHaveText("Action ran 1 time.");
  await controls.getByRole("switch", { name: "disabled", exact: true }).press("Space");
  await expect(preview.getByRole("button", { name: "Check now" })).toBeDisabled();
  await controls.getByRole("button", { name: "Reset controls" }).click();
  await expect(preview.getByRole("button", { name: "Run checks" })).toBeEnabled();
  await expect(label).toHaveValue("Run checks");
  await page.getByRole("button", { name: "Reload story", exact: true }).click();
  await expect(preview.getByRole("status")).toHaveText("Click to try the action.");
  await page
    .getByRole("navigation", { name: "Stories", exact: true })
    .getByRole("row", { name: /^Loading\b/ })
    .click();
  await expect(preview.getByRole("button", { name: "Running checks…" })).toBeDisabled();
});

test("Docs retain usage snippets and accessibility guidance", async ({ page }, testInfo) => {
  await page.goto(
    `/iframe.html?id=components-button--docs&viewMode=docs&globals=theme:${testInfo.project.name}`,
  );
  await expect(page.getByRole("heading", { level: 1, name: "Button", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Guidance$/ })).toBeVisible();
  await expect(
    page.getByText("Use Button for actions and a real link for navigation.", { exact: true }),
  ).toBeVisible();
  await page.getByRole("switch", { name: "Show code", exact: true }).first().click();
  await expect(
    page.locator("pre").filter({ hasText: "@kipivo/ui/components/button" }).first(),
  ).toBeVisible();
});

test("theme toolbar updates the inspector and retains the theme on reload", async ({
  page,
}, testInfo) => {
  const theme = testInfo.project.name;
  const alternate = theme === "dark" ? "light" : "dark";
  await page.goto(`/?path=/story/foundations-theme--palette&globals=theme:${theme}`);
  const preview = page.frameLocator("#storybook-preview-iframe");
  await expect(preview.locator("html")).toHaveClass(new RegExp(`\\b${theme}\\b`));
  await expect(page.getByRole("region", { name: "Addon panel", exact: true })).not.toBeVisible();
  const foreground = preview.getByRole("combobox", { name: "Foreground", exact: true });
  await foreground.selectOption("primary");
  const primary = preview
    .getByRole("term")
    .filter({ hasText: /^--primary$/ })
    .locator("..");
  const before = await primary.innerText();
  await page
    .getByRole("region", { name: "Toolbar", exact: true })
    .getByRole("button", { name: "Theme", exact: true })
    .click();
  await expect(preview.locator("html")).toHaveClass(new RegExp(`\\b${alternate}\\b`));
  await expect(primary).not.toHaveText(before);
  await expect(foreground).toHaveValue("primary");
  await page.reload();
  await expect(preview.locator("html")).toHaveClass(new RegExp(`\\b${alternate}\\b`));
});

test("color inspector compares tokens and composited translucent borders", async ({
  page,
}, testInfo) => {
  await openStory(page, "foundations-theme--palette", testInfo.project.name);
  const foreground = page.getByRole("combobox", { name: "Foreground", exact: true });
  const background = page.getByRole("combobox", { name: "Background", exact: true });
  const result = page
    .getByRole("status")
    .filter({ has: page.getByLabel("Contrast ratio", { exact: true }) });
  const primary = page
    .getByRole("term")
    .filter({ hasText: /^--primary$/ })
    .locator("..");
  const value = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue("--primary").trim(),
  );
  await expect(primary).toContainText(value);
  await foreground.selectOption("primary");
  await background.selectOption("muted");
  await expect(result).toContainText(
    testInfo.project.name === "light" ? "Below 4.5:1" : "Pass · minimum 4.5:1",
  );
  await foreground.selectOption("primary-hover");
  await expect(result).toContainText("Pass · minimum 4.5:1");
  await page.getByRole("combobox", { name: "Requirement" }).selectOption("3");
  await foreground.selectOption("input");
  await background.selectOption("background");
  await expect(result).toContainText("Pass · minimum 3:1");
  await foreground.selectOption("border");
  await expect(result).toContainText("Below 3:1");
  expect(
    parseFloat(await page.getByLabel("Contrast ratio", { exact: true }).innerText()),
  ).toBeLessThan(2);
  await foreground.selectOption("ring");
  await expect(result).toContainText("Pass · minimum 3:1");
});

test("token copying reports success and a manual fallback", async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (text: string) => {
          document.documentElement.dataset.copied = text;
        },
      },
    });
  });
  await openStory(page, "foundations-theme--palette", testInfo.project.name);
  const copy = page.getByRole("button", { name: "Copy --primary", exact: true });
  await copy.click();
  await expect(copy).toHaveText("Copied");
  const value = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue("--primary").trim(),
  );
  await expect(page.locator("html")).toHaveAttribute("data-copied", `--primary: ${value};`);
  await expect(copy).toHaveText("Copy", { timeout: 4000 });
  await page.evaluate(() => {
    navigator.clipboard.writeText = async () => {
      throw new Error("Clipboard denied");
    };
  });
  await page.setViewportSize({ width: 320, height: 740 });
  await copy.click();
  await expect(page.getByRole("status").filter({ hasText: "Clipboard unavailable" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("button", { name: "Copy code" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Clipboard unavailable" })).toHaveCount(
    2,
  );
  await expect(page.locator("#storybook-root pre")).toContainText(
    '@import "@kipivo/ui/globals.css"',
  );
});

test("component previews and the palette fit narrow screens", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 740 });
  for (const id of [
    "components-button--primary",
    "components-input--default",
    "foundations-theme--palette",
  ]) {
    await openStory(page, id, testInfo.project.name);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  await page.getByRole("combobox", { name: "Foreground", exact: true }).selectOption("ring");
  await page.getByRole("combobox", { name: "Requirement", exact: true }).selectOption("3");
  await expect(page.getByRole("status").filter({ hasText: "Pass · minimum 3:1" })).toBeVisible();
});
