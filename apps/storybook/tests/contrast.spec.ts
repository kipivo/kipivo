import { expect, test, type Locator } from "@playwright/test";

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
  await page.addInitScript(
    (theme) => localStorage.setItem("kipivo-ui-theme", theme),
    testInfo.project.name,
  );
  await page.goto("/#button");
  const preview = page.getByRole("region", { name: "Component preview" });
  const button = preview.getByRole("button");
  await button.hover();
  await button.evaluate((element) =>
    Promise.all(element.getAnimations().map((animation) => animation.finished)),
  );
  expect(await contrast(button)).toBeGreaterThanOrEqual(4.5);
  await page.getByRole("combobox", { name: "Preset" }).selectOption("Destructive");
  await expect(button).toHaveText("Delete run");
  await button.hover();
  await button.evaluate((element) =>
    Promise.all(element.getAnimations().map((animation) => animation.finished)),
  );
  expect(await contrast(button)).toBeGreaterThanOrEqual(4.5);

  await page.goto("/#input");
  const input = preview.getByRole("textbox", { name: "Task name" });
  expect(await contrast(input, "border-top-color", false)).toBeGreaterThanOrEqual(3);
  expect(await contrast(input, "--ring", false)).toBeGreaterThanOrEqual(3);

  await page.goto("/#dropdown-menu");
  await preview.getByRole("button", { name: "Run actions" }).click();
  const destructive = page.getByRole("menuitem", { name: "Delete run" });
  await destructive.focus();
  await expect(destructive).toBeFocused();
  expect(await contrast(destructive)).toBeGreaterThanOrEqual(4.5);

  await page.goto("/#theme");
  const description = page.getByRole("main").locator("h1 + p");
  expect(await contrast(description)).toBeGreaterThanOrEqual(4.5);
  for (const surface of ["--muted", "--card"]) {
    await description.evaluate((element, surface) => {
      (element as HTMLElement).style.background = `var(${surface})`;
    }, surface);
    expect(await contrast(description)).toBeGreaterThanOrEqual(4.5);
  }
});
