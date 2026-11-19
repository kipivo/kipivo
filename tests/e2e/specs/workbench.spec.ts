import { expect, type Page } from "@playwright/test";
import { test } from "../fixtures/local-runs";

function quickAdd(page: Page, laneName: string) {
  const lane = page.getByRole("region", { name: laneName, exact: true });
  return {
    lane,
    add: lane.getByRole("button", { name: `Add task to ${laneName}`, exact: true }),
    input: lane.getByRole("textbox", { name: "Task title", exact: true }),
  };
}

for (const laneName of ["In progress", "Done"]) {
  test(`quick add creates tasks in ${laneName} on Enter and discards drafts on Escape`, async ({
    page,
    localWeb,
  }) => {
    await page.goto(`${localWeb.origin}/workbench`);
    const { lane, add, input } = quickAdd(page, laneName);
    const title = "Review the release checklist";
    const discarded = "Discard this draft";

    await add.click();
    await expect(input).toBeVisible();
    await expect(
      lane.getByRole("button", { name: `Cancel adding task to ${laneName}` }),
    ).toBeVisible();
    await expect(input).toHaveJSProperty("tagName", "INPUT");
    await expect(page.getByRole("dialog")).toBeHidden();
    await input.fill(discarded);
    await input.press("Escape");
    await expect(add).toBeFocused();
    await expect(input).toBeHidden();
    await expect(page.getByRole("button", { name: discarded, exact: true })).toHaveCount(0);

    await add.click();
    await expect(input).toHaveValue("");
    await input.fill(title);
    await input.press("Enter");
    await expect(input).toBeHidden();
    await expect(lane.getByRole("button", { name: title, exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: title, exact: true })).toHaveCount(1);
  });
}

for (const { device, viewport, placement } of [
  { device: "desktop", viewport: { width: 1440, height: 900 }, placement: "right" },
  { device: "mobile", viewport: { width: 390, height: 844 }, placement: "center" },
]) {
  test(`${device} task dialog opens at the ${placement} and returns focus on dismissal`, async ({
    page,
    localWeb,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto(`${localWeb.origin}/workbench`);
    const { lane, add, input } = quickAdd(page, "In progress");
    const title = "Review the release checklist";
    await add.click();
    await input.fill(title);
    await input.press("Enter");

    const task = lane.getByRole("button", { name: title, exact: true });
    const dialog = page.getByRole("dialog", { name: "Edit task", exact: true });
    await task.click();
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("textbox", { name: "Title", exact: true })).toHaveValue(title);
    await expect
      .poll(
        async () => {
          const box = await dialog.boundingBox();
          if (!box) return false;
          if (placement === "right") {
            return box.x >= viewport.width / 2 && box.x + box.width <= viewport.width + 1;
          }
          return (
            Math.abs(box.x + box.width / 2 - viewport.width / 2) <= 4 &&
            Math.abs(box.y + box.height / 2 - viewport.height / 2) <= 4
          );
        },
        { message: `The task dialog is positioned at the ${placement} of the ${device} viewport` },
      )
      .toBe(true);

    await dialog.getByRole("button", { name: "Close", exact: true }).click();
    await expect(dialog).toBeHidden();
    await expect(task).toBeFocused();

    await task.click();
    await expect
      .poll(() => dialog.evaluate((element) => element.contains(document.activeElement)))
      .toBe(true);
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(task).toBeFocused();
  });
}
