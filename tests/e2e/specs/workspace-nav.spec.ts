import { expect, type Page } from "@playwright/test";
import { test } from "../fixtures/local-runs";

const desktop = { width: 1280, height: 800 };
const narrow = { width: 360, height: 640 };

function workspace(page: Page) {
  return page.getByRole("navigation", { name: "Workspace", exact: true });
}

function runsHeading(page: Page) {
  return page.getByRole("heading", { name: "Local runs", level: 1 });
}

async function expectCurrentRuns(page: Page) {
  const nav = workspace(page);
  await expect(nav).toHaveCount(1);
  await expect(nav.getByRole("link", { name: "Local runs", exact: true })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(nav.locator('[aria-current="page"]')).toHaveCount(1);
}

async function expectSidebar(page: Page) {
  await expect
    .poll(
      async () => {
        const nav = await workspace(page).boundingBox();
        const heading = await runsHeading(page).boundingBox();
        return nav && heading ? nav.x + nav.width <= heading.x : false;
      },
      { message: "Workspace navigation is to the left of the run content" },
    )
    .toBe(true);
}

test("the design guide has a shareable URL and returns to the live workbench", async ({
  page,
  localWeb,
}) => {
  await page.setViewportSize(desktop);
  await page.goto(`${localWeb.origin}/workbench`);
  await workspace(page).getByRole("link", { name: "Design guide", exact: true }).click();
  await expect(page).toHaveURL(`${localWeb.origin}/design-guide`);
  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: "Design guide" })).toBeVisible();
  await expect(workspace(page).getByRole("link", { name: "Design guide" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await page.getByRole("link", { name: "查看本地运行记录" }).click();
  await expectCurrentRuns(page);
  await page.goBack();
  await page.setViewportSize(narrow);
  const more = workspace(page).getByRole("button", { name: /^More destinations/ });
  await expect(more).toHaveAttribute("data-active", "");
  await more.click();
  await expect(page.getByRole("menuitem", { name: "Design guide" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await page.keyboard.press("Escape");
  await workspace(page).getByRole("link", { name: "Workbench" }).click();
  await expect(more).not.toHaveAttribute("data-active", "");
  await expect(page.getByRole("heading", { name: "Add your first task" })).toBeVisible();
  await expect(page.getByRole("progressbar")).toHaveCount(0);
});

test("desktop sidebar preference persists across routes, reloads and mobile layouts", async ({
  page,
  localWeb,
}) => {
  await page.setViewportSize(desktop);
  await page.goto(`${localWeb.origin}/workbench`);
  const collapse = page.getByRole("button", { name: "Collapse sidebar" });
  const expand = page.getByRole("button", { name: "Expand sidebar" });
  const sidebar = page.locator("#workspace-sidebar");
  const theme = page
    .getByRole("banner")
    .getByRole("button", { name: /^Switch to (light|dark) theme$/ });
  const workbenchLabel = workspace(page).getByText("Workbench", { exact: true });
  await expect(workbenchLabel).toBeVisible();
  const expandedWidth = await sidebar.evaluate((element) => element.clientWidth);
  await expect(collapse).toBeEnabled();
  await collapse.press("Enter");
  await expect(expand).toHaveAttribute("aria-expanded", "false");
  await page.keyboard.press("Tab");
  await expect(theme).toBeFocused();
  await expect(workbenchLabel).toBeHidden();
  await expect
    .poll(() => sidebar.evaluate((element) => element.clientWidth))
    .toBeLessThan(expandedWidth);

  await workspace(page).getByRole("link", { name: "Design guide", exact: true }).click();
  await expect(page).toHaveURL(`${localWeb.origin}/design-guide`);
  await expect(expand).toBeVisible();
  await page.reload();
  await expect(expand).toBeVisible();
  await page.setViewportSize(narrow);
  await expect(expand).toBeHidden();
  await theme.click();
  await expect(page.locator("html")).toHaveCSS("color-scheme", "light");
  await expect(theme).toHaveAccessibleName("Switch to dark theme");
  await expect(workbenchLabel).toBeVisible();
  await page.setViewportSize(desktop);
  await expect(workbenchLabel).toBeHidden();
  await expand.click();
  await page.reload();
  await expect(collapse).toHaveAttribute("aria-expanded", "true");
  await expect(workbenchLabel).toBeVisible();
  await expect.poll(() => sidebar.evaluate((element) => element.clientWidth)).toBe(expandedWidth);
});

test("desktop workspace navigation is a sidebar and follows browser history", async ({
  page,
  localWeb,
}) => {
  await page.setViewportSize(desktop);
  const runsUrl = `${localWeb.origin}/runs`;
  await page.goto(runsUrl);
  await expectCurrentRuns(page);
  await expectSidebar(page);

  await workspace(page).getByRole("link", { name: "Home", exact: true }).click();
  await expect(page).toHaveURL(`${localWeb.origin}/`);
  await expect(workspace(page)).toHaveCount(0);
  await page.goBack();
  await expect(page).toHaveURL(runsUrl);
  await expectCurrentRuns(page);
  await expectSidebar(page);
  await page.goForward();
  await expect(page).toHaveURL(`${localWeb.origin}/`);
  await expect(workspace(page)).toHaveCount(0);

  await page.goto(`${localWeb.origin}/sign-in`);
  await expect(page.getByRole("heading", { name: "Sign in to Kipivo", level: 1 })).toBeVisible();
  await expect(workspace(page)).toHaveCount(0);
});

test("narrow workspace navigation sits at the viewport bottom without horizontal overflow", async ({
  page,
  localWeb,
}) => {
  await page.setViewportSize(desktop);
  const runsUrl = `${localWeb.origin}/runs`;
  await page.goto(runsUrl);
  await expectCurrentRuns(page);

  await page.setViewportSize(narrow);
  await expect(page).toHaveURL(runsUrl);
  await expectCurrentRuns(page);
  const nav = workspace(page);
  await expect(nav).toBeInViewport({ ratio: 1 });
  await expect
    .poll(
      () => nav.evaluate((element) => window.innerHeight - element.getBoundingClientRect().bottom),
      {
        message: "Workspace navigation is near the bottom edge of the viewport",
      },
    )
    .toBeLessThanOrEqual(24);
  await expect
    .poll(
      () =>
        page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        ),
      {
        message: "The run page fits the narrow viewport",
      },
    )
    .toBeLessThanOrEqual(1);

  await page.setViewportSize(desktop);
  await expectCurrentRuns(page);
  await expectSidebar(page);
});
