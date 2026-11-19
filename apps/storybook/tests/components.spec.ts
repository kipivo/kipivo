import { expect, test } from "@playwright/test";
import { openStory } from "./helpers";

test("the story catalog renders with unique IDs", async ({ page, request }, testInfo) => {
  test.slow();
  const response = await request.get("/index.json");
  expect(response.ok()).toBe(true);
  const { entries } = (await response.json()) as {
    entries: Record<string, { id: string; type: string }>;
  };
  const stories = Object.values(entries).filter((entry) => entry.type === "story");
  const ids = stories.map((story) => story.id);
  expect(ids).toEqual(
    expect.arrayContaining([
      "foundations-theme--palette",
      "foundations-wordmark--default",
      "components-badge--passed",
      "components-button--primary",
      "components-card--default",
      "components-dialog--default",
      "components-dropdown-menu--default",
      "components-input--default",
      "components-label--default",
      "components-textarea--default",
      "components-theme-selector--default",
      "components-tooltip--default",
      "patterns-action-card--destination",
      "patterns-action-card--action",
      "patterns-run-configuration--default",
      "patterns-run-history--default",
    ]),
  );
  expect(new Set(ids).size).toBe(ids.length);
  for (const id of ids) {
    await openStory(page, id, testInfo.project.name);
    await expect(page.locator("#storybook-root")).toBeVisible();
    await expect(page.locator(".sb-errordisplay")).not.toBeVisible();
  }
});

test("disabled and loading stories keep their native action semantics", async ({
  page,
}, testInfo) => {
  await openStory(page, "components-button--disabled", testInfo.project.name);
  await expect(page.getByRole("button", { name: "Waiting for runner" })).toBeDisabled();
  await openStory(page, "components-button--loading", testInfo.project.name);
  await expect(page.getByRole("button", { name: "Running checks…" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Running checks…" })).toHaveAttribute(
    "aria-busy",
    "true",
  );
});

test("the action card destination is a keyboard-accessible link", async ({ page }, testInfo) => {
  await openStory(page, "patterns-action-card--destination", testInfo.project.name);
  const preview = page.locator("#storybook-root");
  const link = preview.getByRole("link", { name: "Manage members" });
  await expect(preview.getByRole("heading", { level: 2, name: "Workspace members" })).toBeVisible();
  await expect(
    preview.getByText("Review who has access to this workspace and what they can do."),
  ).toBeVisible();

  await page.keyboard.press("Tab");
  await expect(link).toBeFocused();
  await expect(link).toHaveCSS("outline-style", "solid");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#action-card-member-directory$/);
  await expect(preview.getByRole("heading", { name: "Member directory" })).toBeFocused();
});

test("fields connect labels and validation messages", async ({ page }, testInfo) => {
  for (const [id, label] of [
    ["input", "Task name"],
    ["textarea", "Task description"],
  ]) {
    await openStory(page, `components-${id}--default`, testInfo.project.name);
    const preview = page.locator("#storybook-root");
    const field = preview.getByRole("textbox", { name: label });
    await field.fill("Verify the project");
    await expect(field).toHaveValue("Verify the project");
    await openStory(page, `components-${id}--invalid`, testInfo.project.name);
    await expect(field).toHaveAttribute("aria-invalid", "true");
    await expect(field).toHaveAccessibleDescription(/Enter a .* to continue\./);
    await openStory(page, `components-${id}--disabled`, testInfo.project.name);
    await expect(field).toBeDisabled();
  }
  await openStory(page, "components-label--default", testInfo.project.name);
  const preview = page.locator("#storybook-root");
  await preview.getByText("Project name", { exact: true }).click();
  await expect(preview.getByRole("textbox", { name: "Project name" })).toBeFocused();
});

test("dialog restores focus after Escape and Cancel", async ({ page }, testInfo) => {
  await openStory(page, "components-dialog--default", testInfo.project.name);
  const trigger = page.locator("#storybook-root").getByRole("button", { name: "Delete run" });
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

test("menu supports keyboard navigation and disabled actions", async ({ page }, testInfo) => {
  await openStory(page, "components-dropdown-menu--default", testInfo.project.name);
  const preview = page.locator("#storybook-root");
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

test("tooltip describes its trigger on hover and keyboard focus", async ({ page }, testInfo) => {
  await openStory(page, "components-tooltip--default", testInfo.project.name);
  const trigger = page.locator("#storybook-root").getByRole("button", { name: "Run checks" });
  await trigger.hover();
  await expect(page.getByRole("tooltip")).toHaveText("Run the project's configured checks.");
  await expect(trigger).toHaveAccessibleDescription("Run the project's configured checks.");
  await page.mouse.move(0, 0);
  await expect(page.getByRole("tooltip")).not.toBeVisible();
  await trigger.focus();
  await expect(page.getByRole("tooltip")).toBeVisible();
  await expect(trigger).toHaveAccessibleDescription("Run the project's configured checks.");
});

test("the theme indicator follows selection and respects reduced motion", async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await openStory(page, "components-theme-selector--default", testInfo.project.name);
  const group = page.getByRole("group", { name: "Theme", exact: true });
  const indicator = group.locator('[data-slot="theme-indicator"]');
  async function selectTheme(name: string) {
    const option = group.getByRole("radio", { name, exact: true });
    await option.check();
    const targetX = (await option.boundingBox())?.x ?? NaN;
    await expect
      .poll(async () => (await indicator.boundingBox())?.x ?? NaN)
      .toBeCloseTo(targetX, 1);
  }

  await expect(indicator).toHaveCSS("transition-duration", "0.2s");
  await selectTheme("System");

  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect
    .poll(() =>
      indicator.evaluate((element) => parseFloat(getComputedStyle(element).transitionDuration)),
    )
    .toBeLessThan(0.001);
  await selectTheme("Light");
});
