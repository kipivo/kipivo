import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }, testInfo) => {
  await page.addInitScript((theme) => {
    if (!localStorage.getItem("kipivo-ui-theme")) localStorage.setItem("kipivo-ui-theme", theme);
  }, testInfo.project.name);
});

test("component search supports shortcuts, empty results and page navigation", async ({ page }) => {
  await page.goto("/#button");
  const search = page.getByRole("searchbox", { name: "Find a component" });
  const navigation = page.getByRole("navigation", { name: "Components" });
  await page.keyboard.press("/");
  await expect(search).toBeFocused();
  await search.fill("DIALOG");
  await expect(navigation.getByRole("link")).toHaveCount(1);
  await search.press("Enter");
  await expect(page.getByRole("heading", { name: "Dialog", exact: true, level: 1 })).toBeFocused();
  await page.keyboard.press("/");
  await search.fill("not-a-component");
  await expect(navigation.getByRole("status")).toHaveText("No matching components.");
  await navigation.getByRole("button", { name: "Clear search" }).click();
  await expect(search).toBeFocused();
  await expect(navigation.getByRole("link")).toHaveCount(11);
  await search.fill("color");
  await search.press("Escape");
  await expect(search).toHaveValue("");

  const title = page.getByRole("textbox", { name: "title", exact: true });
  await title.fill("Can I type a slash?");
  await title.press("End");
  await title.press("/");
  await expect(title).toHaveValue("Can I type a slash?/");
  await expect(title).toBeFocused();
  await page
    .getByRole("navigation", { name: "Adjacent pages" })
    .getByRole("link", { name: "Next Dropdown menu" })
    .click();
  await expect(page.getByRole("heading", { name: "Dropdown menu", level: 1 })).toBeVisible();
});

test("props can be edited on a narrow screen without horizontal scrolling", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/#button");
  const controls = page.getByRole("form", { name: "Example props" });
  const label = controls.getByRole("textbox", { name: "label", exact: true });
  await label.fill("Mobile action");
  await controls.getByRole("combobox", { name: "variant", exact: true }).selectOption("outline");
  await controls.getByRole("checkbox", { name: "disabled", exact: true }).check();
  const preview = page.getByRole("region", { name: "Component preview" });
  await expect(preview.getByRole("button", { name: "Mobile action" })).toBeDisabled();
  for (const element of await controls.locator("input, select").all()) {
    const bounds = await element.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(320);
  }
  expect(await controls.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
    true,
  );
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("color inspector updates ratios, thresholds and token values with the theme", async ({
  page,
}) => {
  await page.goto("/#theme");
  await page.getByRole("button", { name: "Light", exact: true }).click();
  const foreground = page.getByRole("combobox", { name: "Foreground", exact: true });
  const background = page.getByRole("combobox", { name: "Background", exact: true });
  const result = page
    .getByRole("status")
    .filter({ has: page.getByLabel("Contrast ratio", { exact: true }) });
  const primary = page
    .getByRole("term")
    .filter({ hasText: /^--primary$/ })
    .locator("..");
  const lightValue = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue("--primary").trim(),
  );
  await expect(primary).toContainText(lightValue);
  await foreground.selectOption("primary");
  await background.selectOption("muted");
  await expect(result).toContainText("Below 4.5:1");
  const ratio = parseFloat(await page.getByLabel("Contrast ratio", { exact: true }).innerText());
  expect(ratio).toBeGreaterThan(4.1);
  expect(ratio).toBeLessThan(4.5);
  await foreground.selectOption("primary-hover");
  await expect(result).toContainText("Pass · minimum 4.5:1");
  await page.getByRole("combobox", { name: "Requirement" }).selectOption("3");
  await foreground.selectOption("input");
  await background.selectOption("background");
  await expect(result).toContainText("Pass · minimum 3:1");

  await foreground.selectOption("border");
  await expect(result).toContainText("Below 3:1");
  await page.getByRole("button", { name: "Dark", exact: true }).click();
  await expect(primary).not.toContainText(lightValue);
  const darkValue = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue("--primary").trim(),
  );
  await expect(primary).toContainText(darkValue);
  // The translucent border must composite against the dark surface, rather than white.
  await expect(result).toContainText("Below 3:1");
  expect(
    parseFloat(await page.getByLabel("Contrast ratio", { exact: true }).innerText()),
  ).toBeLessThan(2);
  await foreground.selectOption("ring");
  await expect(result).toContainText("Pass · minimum 3:1");
});

test("copy reports success and offers a manual fallback when clipboard access fails", async ({
  page,
}) => {
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
  await page.goto("/#theme");
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
  await page.goto("/#button");
  await page.getByRole("button", { name: "Copy code" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Clipboard unavailable" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Usage" }).locator("pre")).toContainText(
    "import { Button",
  );
});

test("a failed preview leaves documentation available and can recover after reload", async ({
  page,
}) => {
  const chunk = /\/assets\/components\.story-[^/]+\.js$/;
  await page.route(chunk, (route) => route.abort());
  await page.goto("/#button");
  await expect(page.getByRole("alert")).toContainText("The example could not load");
  await expect(page.getByRole("heading", { name: "Usage", exact: true })).toBeVisible();
  await page.unroute(chunk);
  await page.getByRole("button", { name: "Reload page" }).click();
  await expect(
    page
      .getByRole("region", { name: "Component preview" })
      .getByRole("button", { name: "Run checks" }),
  ).toBeEnabled();
  await expect(page.getByRole("alert")).toHaveCount(0);
});
