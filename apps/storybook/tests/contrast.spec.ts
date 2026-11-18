import { expect, test, type Locator } from "@playwright/test";
import { openStory } from "./helpers";

// Resolve OKLCH and translucent surfaces through Chromium's sRGB canvas.
// Paint ancestor surfaces before sampling the foreground, as the browser does.
async function contrast(element: Locator, property = "color", includeOwnBackground = true) {
  return element.evaluate(
    (element, { property, includeOwnBackground }) => {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 1;
      const context = canvas.getContext("2d", { willReadFrequently: true })!;
      const ancestors: Element[] = [];
      for (
        let parent: Element | null = includeOwnBackground ? element : element.parentElement;
        parent;
        parent = parent.parentElement
      )
        ancestors.unshift(parent);
      context.fillStyle = "white";
      context.fillRect(0, 0, 1, 1);
      for (const ancestor of ancestors) {
        context.fillStyle = getComputedStyle(ancestor).backgroundColor;
        context.fillRect(0, 0, 1, 1);
      }
      function luminance() {
        const data = context.getImageData(0, 0, 1, 1).data;
        const linear = Array.from(data)
          .slice(0, 3)
          .map((value) => {
            const channel = value / 255;
            return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
          });
        return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
      }
      const background = luminance();
      context.fillStyle = getComputedStyle(element).getPropertyValue(property);
      context.fillRect(0, 0, 1, 1);
      const foreground = luminance();
      return (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05);
    },
    { property, includeOwnBackground },
  );
}

test("text, control boundaries and focus colors retain contrast", async ({ page }, testInfo) => {
  await openStory(page, "components-button--primary", testInfo.project.name);
  const preview = page.locator("#storybook-root");
  const button = preview.getByRole("button");
  await button.hover();
  await button.evaluate((element) =>
    Promise.all(element.getAnimations().map((animation) => animation.finished)),
  );
  expect(await contrast(button)).toBeGreaterThanOrEqual(4.5);
  await openStory(page, "components-button--destructive", testInfo.project.name);
  await expect(button).toHaveText("Delete run");
  await button.hover();
  await button.evaluate((element) =>
    Promise.all(element.getAnimations().map((animation) => animation.finished)),
  );
  expect(await contrast(button)).toBeGreaterThanOrEqual(4.5);

  await openStory(page, "components-input--default", testInfo.project.name);
  const input = preview.getByRole("textbox", { name: "Task name" });
  expect(await contrast(input, "border-top-color", false)).toBeGreaterThanOrEqual(3);
  expect(await contrast(input, "--ring", false)).toBeGreaterThanOrEqual(3);

  await openStory(page, "components-dropdown-menu--default", testInfo.project.name);
  await preview.getByRole("button", { name: "Run actions" }).click();
  const destructive = page.getByRole("menuitem", { name: "Delete run" });
  await destructive.focus();
  await expect(destructive).toBeFocused();
  expect(await contrast(destructive)).toBeGreaterThanOrEqual(4.5);

  await openStory(page, "foundations-theme--palette", testInfo.project.name);
  const description = page.getByRole("main").locator("h1 + p");
  expect(await contrast(description)).toBeGreaterThanOrEqual(4.5);
  for (const surface of ["--muted", "--card"]) {
    await description.evaluate((element, surface) => {
      (element as HTMLElement).style.background = `var(${surface})`;
    }, surface);
    expect(await contrast(description)).toBeGreaterThanOrEqual(4.5);
  }
});
