import { expect } from "@playwright/test";
import { test } from "../fixtures/local-runs";

test("missing pages return 404 and offer working recovery links", async ({ page, localWeb }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  for (const [path, link, destination] of [
    ["/404", "Back to home", "/"],
    ["/missing/route", "Open workbench", "/workbench"],
  ]) {
    const response = await page.goto(localWeb.origin + path);
    expect(response?.status()).toBe(404);
    await expect(page).toHaveTitle("404: Page not found | Kipivo");
    await expect(
      page.getByRole("heading", { level: 1, name: "404: Page not found." }),
    ).toBeVisible();
    await page.getByRole("link", { name: link, exact: true }).click();
    await expect(page).toHaveURL(localWeb.origin + destination);
  }
});
