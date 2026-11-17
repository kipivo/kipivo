import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }, testInfo) => {
  await page.addInitScript((theme) => {
    if (!localStorage.getItem("kipivo-ui-theme")) localStorage.setItem("kipivo-ui-theme", theme);
  }, testInfo.project.name);
});

test("all component pages render generated controls and usage", async ({ page }) => {
  await page.goto("/");
  for (const name of [
    "Button",
    "Input",
    "Textarea",
    "Label",
    "Badge",
    "Card",
    "Dialog",
    "Dropdown menu",
    "Tooltip",
    "Wordmark",
  ]) {
    await page
      .getByRole("navigation", { name: "Components" })
      .getByRole("link", { name, exact: true })
      .click();
    await expect(page.getByRole("heading", { name, exact: true, level: 1 })).toBeVisible();
    await expect(page.getByRole("region", { name: "Component preview" })).toBeVisible();
    await expect(page.getByRole("form", { name: "Example props" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Usage", exact: true })).toBeVisible();
    await expect(page.getByText("Configure this prop in the story source.")).toHaveCount(0);
  }
  await page.getByRole("link", { name: "Theme & colors" }).click();
  await expect(page.getByRole("heading", { name: "Chart palette" })).toBeVisible();
});

test("controls, presets and reset update the live example", async ({ page }) => {
  await page.goto("/#button");
  const preview = page.getByRole("region", { name: "Component preview" });
  await page.getByRole("textbox", { name: "label", exact: true }).fill("Check now");
  await preview.getByRole("button", { name: "Check now" }).click();
  await expect(preview.getByRole("status")).toHaveText("Action ran 1 time.");
  await page.getByRole("button", { name: "Reset example" }).click();
  await expect(preview.getByRole("button", { name: "Run checks" })).toBeEnabled();
  await expect(preview.getByRole("status")).toHaveText("Click to try the action.");
  await page.getByRole("combobox", { name: "Preset" }).selectOption("Disabled");
  await expect(preview.getByRole("button")).toBeDisabled();
  await page.getByRole("combobox", { name: "Preset" }).selectOption("Loading");
  await expect(preview.getByRole("button", { name: "Running checks…" })).toBeDisabled();
  await expect(preview.getByRole("button")).toHaveAttribute("aria-busy", "true");
});

test("fields connect labels and validation messages", async ({ page }) => {
  for (const [id, label] of [
    ["input", "Task name"],
    ["textarea", "Task description"],
  ]) {
    await page.goto(`/#${id}`);
    const preview = page.getByRole("region", { name: "Component preview" });
    const field = preview.getByRole("textbox", { name: label });
    await field.fill("Verify the project");
    await expect(field).toHaveValue("Verify the project");
    await page.getByRole("combobox", { name: "Preset" }).selectOption("Invalid");
    await expect(field).toHaveAttribute("aria-invalid", "true");
    await expect(field).toHaveAccessibleDescription(/Enter a .* to continue\./);
    await page.getByRole("combobox", { name: "Preset" }).selectOption("Disabled");
    await expect(field).toBeDisabled();
  }
  await page.goto("/#label");
  const preview = page.getByRole("region", { name: "Component preview" });
  await preview.getByText("Project name", { exact: true }).click();
  await expect(preview.getByRole("textbox", { name: "Project name" })).toBeFocused();
});

test("dialog restores focus after Escape and Cancel", async ({ page }) => {
  await page.goto("/#dialog");
  const trigger = page
    .getByRole("region", { name: "Component preview" })
    .getByRole("button", { name: "Delete run" });
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "Delete this run?" });
  await expect(dialog).toHaveAccessibleDescription(
    "This removes the run and its saved logs. You cannot undo this action.",
  );
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
});

test("menu supports keyboard navigation and disabled actions", async ({ page }) => {
  await page.goto("/#dropdown-menu");
  const preview = page.getByRole("region", { name: "Component preview" });
  const trigger = preview.getByRole("button", { name: "Run actions" });
  await trigger.focus();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("menuitem", { name: "View logs" })).toBeFocused();
  await expect(page.getByRole("menuitem", { name: "Retry run" })).toHaveAttribute(
    "aria-disabled",
    "true",
  );
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("menuitem", { name: "Delete run" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("menu")).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await page.getByRole("menuitem", { name: "View logs" }).click();
  await expect(preview.getByRole("status")).toHaveText("Showing example logs.");
});

test("tooltip describes its trigger on hover and keyboard focus", async ({ page }) => {
  await page.goto("/#tooltip");
  const trigger = page
    .getByRole("region", { name: "Component preview" })
    .getByRole("button", { name: "Run checks" });
  await trigger.hover();
  await expect(page.getByRole("tooltip")).toHaveText("Run the project's configured checks.");
  await expect(trigger).toHaveAccessibleDescription("Run the project's configured checks.");
  await page.mouse.move(0, 0);
  await expect(page.getByRole("tooltip")).not.toBeVisible();
  await trigger.focus();
  await expect(page.getByRole("tooltip")).toBeVisible();
  await expect(trigger).toHaveAccessibleDescription("Run the project's configured checks.");
});

test("theme persists and the manual fits a narrow viewport", async ({ page }, testInfo) => {
  await page.goto("/#input");
  await page.keyboard.press("Tab");
  await page.getByRole("link", { name: "Skip to content" }).press("Enter");
  await expect(page.getByRole("main")).toBeFocused();
  await expect(page.getByRole("heading", { name: "Input", level: 1, exact: true })).toBeVisible();
  const heading = await page
    .getByRole("heading", { name: "Input", level: 1, exact: true })
    .boundingBox();
  const header = await page.locator("header").boundingBox();
  expect(heading!.y).toBeGreaterThanOrEqual(header!.y + header!.height);
  await expect(
    page.getByRole("button", {
      name: testInfo.project.name === "dark" ? "Dark" : "Light",
      exact: true,
    }),
  ).toHaveAttribute("aria-pressed", "true");
  await page
    .getByRole("button", { name: testInfo.project.name === "dark" ? "Light" : "Dark", exact: true })
    .click();
  await page.reload();
  await expect(
    page.getByRole("button", {
      name: testInfo.project.name === "dark" ? "Light" : "Dark",
      exact: true,
    }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("combobox", { name: "Component", exact: true }).selectOption("dialog");
  await expect(page.getByRole("heading", { name: "Dialog", exact: true, level: 1 })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});
