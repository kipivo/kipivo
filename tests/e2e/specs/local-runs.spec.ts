import { expect, type Page } from "@playwright/test";
import { test } from "../fixtures/local-runs";

// Install before navigation so the first poll and every subsequent timer use the same clock.
async function openRuns(page: Page, origin: string) {
  await page.clock.install({ time: "2025-01-01T00:00:00Z" });
  await page.clock.pauseAt("2025-01-01T00:01:00Z");
  await page.goto(`${origin}/runs`);
}

test("run history offers the next action as a runner goes from offline to connected", async ({
  page,
  localWeb,
}) => {
  let connected = false;
  await page.route("**/api/local/runs", (route) =>
    route.fulfill(
      connected ? { json: [] } : { status: 503, json: { error: "Local runner unavailable." } },
    ),
  );
  await openRuns(page, localWeb.origin);
  await expect(page.getByRole("heading", { name: "Connect your local runner" })).toBeVisible();
  await expect(page.getByText("bun run kpdev runner serve", { exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "Run details" })).toBeHidden();
  connected = true;
  await page.clock.fastForward(1000);
  await expect(page.getByRole("heading", { name: "Run your first check" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Run checks" })).toBeEnabled();
  await expect(page.getByText("bun run kpdev runner serve", { exact: true })).toBeHidden();
});

test("CLI submission is visible in Web and survives restarting the runner", async ({
  page,
  localWeb,
  runs,
}) => {
  const response = await page.request.get(`${runs.runnerOrigin()}/v1/runs`);
  expect(response.status()).toBe(401);

  const id = (await runs.cli("run", "check")).trim();
  await expect.poll(() => runs.cli("logs", id)).toContain("fixture check started");
  await openRuns(page, localWeb.origin);
  const details = page.getByRole("region", { name: "Run details" });
  await expect(details).toContainText(id);
  await expect(details.getByRole("status")).toHaveText("Running");
  await expect(details.getByRole("log")).toContainText("fixture check started");
  await expect(page.getByRole("button", { name: "Run checks" })).toBeDisabled();

  const submit = (origin: string) =>
    page.request.post(`${localWeb.origin}/api/local/runs`, {
      headers: { Origin: origin },
      data: { kind: "check" },
    });
  expect((await submit("https://example.test")).status()).toBe(403);
  expect((await submit(localWeb.origin)).status()).toBe(409);

  await runs.finish(0);
  await expect.poll(async () => JSON.parse(await runs.cli("status", id)).status).toBe("succeeded");
  await expect(details.getByRole("status")).toHaveText("Running");
  await page.clock.fastForward(1000);
  await expect(details.getByRole("status")).toHaveText("Passed");
  await expect(details.getByRole("log")).toContainText("fixture check finished");
  await runs.restart();
  await page.reload();
  await expect(details).toContainText(id);
  await expect(details.getByRole("log")).toContainText("fixture stderr");
  expect(JSON.parse(await runs.cli("status", id))).toMatchObject({
    status: "succeeded",
    exitCode: 0,
  });
});

test("a Web submission reports its failure to the CLI", async ({ page, localWeb, runs }) => {
  await openRuns(page, localWeb.origin);
  await page.getByRole("button", { name: "Run checks" }).click();
  const details = page.getByRole("region", { name: "Run details" });
  await expect(details.getByRole("log")).toBeVisible();
  const id = (
    await page.getByRole("region", { name: "Run history" }).locator("code").innerText()
  ).trim();
  await runs.finish(7);
  await expect
    .poll(async () => JSON.parse(await runs.cli("status", id)))
    .toMatchObject({ status: "failed", exitCode: 7 });
  await page.clock.fastForward(1000);
  await expect(details.getByRole("status")).toHaveText("Failed");
  await expect(details.locator("dt").filter({ hasText: "Exit code" }).locator("+ dd")).toHaveText(
    "7",
  );
  expect(await runs.cli("logs", id)).toContain("fixture stderr");
});

test("Web theme applies across pages and follows the system when selected", async ({
  page,
  localWeb,
}) => {
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "no-preference" });
  await page.addInitScript(() => {
    const startViewTransition = document.startViewTransition.bind(document);
    document.startViewTransition = (update) => {
      const root = document.documentElement;
      const transition = startViewTransition(update);
      root.dataset.testThemeReveal = "requested";
      void transition.ready.then(
        () => {
          root.dataset.testThemeReveal = getComputedStyle(
            root,
            "::view-transition-image-pair(root)",
          ).animationName;
          const mask = getComputedStyle(root, "::view-transition-old(root)").maskImage;
          const origin = mask.match(/radial-gradient\(circle at ([\d.]+)px ([\d.]+)px/);
          if (origin) {
            root.dataset.testRevealOrigin = `${Math.round(Number(origin[1]))},${Math.round(Number(origin[2]))}`;
          }
          const sparks = getComputedStyle(root, "::view-transition-new(root)");
          const sparkPosition = sparks.maskPosition.split(", ").at(-1);
          if (sparkPosition && sparks.maskImage.includes("url(")) {
            root.dataset.testSparkOrigin = sparkPosition
              .split(" ")
              .map((length) => Math.round(Number.parseFloat(length)))
              .join(",");
          }
        },
        () => {},
      );
      return transition;
    };
  });
  await page.goto(localWeb.origin);
  const html = page.locator("html");
  const themeColor = page.locator('meta[name="theme-color"]');
  const group = page.getByRole("group", { name: "Theme", exact: true });
  const theme = (name: string) => group.getByRole("radio", { name, exact: true });

  await expect(group).toHaveCount(1);
  await expect(page.getByRole("banner").getByRole("group", { name: "Theme" })).toBeVisible();
  await expect(html).toHaveCSS("color-scheme", "dark");
  const dark = theme("Dark");
  await expect(dark).toBeEnabled();
  await expect(dark).toBeChecked();
  const systemCenter = await theme("System").evaluate((option) => {
    const { x, y, width, height } = option.getBoundingClientRect();
    return `${Math.round(x + width / 2)},${Math.round(y + height / 2)}`;
  });
  await dark.press("ArrowRight");
  await expect(theme("System")).toBeFocused();
  await expect(theme("System")).toBeChecked();
  await expect(html).toHaveCSS("color-scheme", "light");
  await expect(html).toHaveAttribute("data-test-theme-reveal", "theme-reveal");
  await expect(html).toHaveAttribute("data-test-reveal-origin", systemCenter);
  await expect(html).toHaveAttribute("data-test-spark-origin", systemCenter);
  await expect(html).not.toHaveAttribute("data-theme-transition", "");
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(html).toHaveCSS("color-scheme", "dark");

  await page.getByRole("link", { name: "Local runs" }).click();
  await expect(page.getByRole("heading", { name: "Local runs" })).toBeVisible();
  const toggle = page.getByRole("button", { name: /^Switch to (light|dark) theme$/ });
  await expect(toggle).toHaveAccessibleName("Switch to light theme");
  await toggle.press("Enter");
  await expect(html).toHaveCSS("color-scheme", "light");
  await expect(toggle).toHaveAccessibleName("Switch to dark theme");
  await expect(html).not.toHaveAttribute("data-theme-transition", "");
  const point = await toggle.evaluate((item) => {
    const { x, y } = item.getBoundingClientRect();
    return { x: Math.ceil(x) + 3, y: Math.ceil(y) + 5 };
  });
  await page.mouse.click(point.x, point.y);
  await expect(html).toHaveCSS("color-scheme", "dark");
  await expect(html).toHaveAttribute("data-test-spark-origin", `${point.x},${point.y}`);
  await expect(html).toHaveAttribute("data-test-reveal-origin", `${point.x},${point.y}`);
  await toggle.click();
  await expect(html).toHaveCSS("color-scheme", "light");
  await page.reload();
  await expect(toggle).toHaveAccessibleName("Switch to dark theme");
  await expect(themeColor).toHaveAttribute("content", "#fcf9f7");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await toggle.click();
  await expect(html).toHaveCSS("color-scheme", "dark");
  await expect(html).not.toHaveAttribute("data-test-theme-reveal", /.+/);

  await page.goto(localWeb.origin);
  await theme("System").click();
  await expect(theme("System")).toBeChecked();
  await page.getByRole("link", { name: "Local runs" }).click();
  await expect(toggle).toHaveAccessibleName("Switch to light theme");
  await page.emulateMedia({ colorScheme: "light" });
  await expect(toggle).toHaveAccessibleName("Switch to dark theme");
  await page.route("**/*", (route) =>
    route.request().resourceType() === "script" ? route.abort() : route.continue(),
  );
  await page.reload();
  await expect(toggle).toBeDisabled();
  await expect(html).toHaveCSS("color-scheme", "light");
  await expect(themeColor).toHaveAttribute("content", "#fcf9f7");
});

test("home has a header and auth pages have standalone theme controls", async ({
  page,
  localWeb,
}) => {
  // Keep setup visible without a database: an unavailable session is not a signed-out one.
  await page.route("**/rpc/auth/session/get", (route) => route.fulfill({ status: 503 }));
  await page.goto(localWeb.origin);
  const header = page.locator("header");
  const main = page.getByRole("main");
  const signIn = header.getByRole("link", { name: "Sign in" });
  await expect(main.getByRole("heading", { level: 1, name: "From spark to done." })).toBeVisible();
  await expect(main).toContainText(
    "Plan tasks on your board, run checks in your local checkout, and read the logs when something fails.",
  );
  await expect(header).toHaveCount(1);
  await expect(main).toHaveCount(1);
  await expect(main.locator("header")).toHaveCount(0);
  await expect(page.getByRole("banner")).toBeVisible();
  await signIn.click();
  await expect(main.getByRole("heading", { name: "Sign in to Kipivo" })).toBeVisible();
  await expect(header).toHaveCount(0);
  await expect(main).toHaveCount(1);
  const theme = main.getByRole("group", { name: "Theme", exact: true });
  await theme.getByRole("radio", { name: "Light", exact: true }).click();
  await expect(page.locator("html")).toHaveCSS("color-scheme", "light");

  await page.goto(`${localWeb.origin}/setup`);
  await expect(main.getByRole("heading", { name: "Administrator setup" })).toBeVisible();
  await expect(main).toHaveCount(1);
  await expect(header).toHaveCount(0);
  await expect(theme.getByRole("radio", { name: "Light", exact: true })).toBeChecked();
});

test("brand illustrations play once and respect reduced motion", async ({ page, localWeb }) => {
  for (const path of ["/", "/design-guide", "/sign-in", "/sign-up"]) {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto(`${localWeb.origin}${path}`);
    const art = page.locator("figure").filter({ has: page.locator("picture") });
    const image = art.locator("img");
    const currentFrame = () =>
      image.evaluate((img: HTMLImageElement) =>
        img.naturalWidth && img.currentSrc ? new URL(img.currentSrc).hash : null,
      );
    await expect(image).toBeVisible();
    await expect(image).toHaveJSProperty("fetchPriority", path === "/" ? "high" : "auto");
    await expect(art.locator("figcaption, button")).toHaveCount(0);
    await expect.poll(currentFrame).toBe("#intro");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect.poll(currentFrame).toBe("");
  }
});

test("sign-in and sign-up share the responsive brand panel and form widths", async ({
  page,
  localWeb,
}) => {
  const form = page.locator("form");
  const panel = page.getByRole("complementary", { name: "About Kipivo" });
  for (const width of [320, 390, 665, 768, 1280]) {
    await page.setViewportSize({ width, height: 800 });
    let left: number | undefined;
    for (const path of ["/sign-in", "/sign-up"]) {
      await page.goto(`${localWeb.origin}${path}`);
      const fields = await form.boundingBox();
      if (!fields) throw new Error(`Expected a visible form on ${path}`);
      if (left !== undefined) expect(fields.x).toBeCloseTo(left);
      left = fields.x;
      if (width < 768) {
        await expect(panel).toBeHidden();
      } else {
        const art = await panel.boundingBox();
        if (!art) throw new Error(`Expected a visible brand panel on ${path}`);
        expect(art.x).toBeGreaterThan(fields.x + fields.width);
        expect(art.y).toBeLessThan(fields.y + fields.height);
        expect(art.x + art.width).toBeLessThanOrEqual(width);
      }
    }
  }
});

test("mobile account entry and password visibility preserve the sign-in destination", async ({
  page,
  localWeb,
}) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(localWeb.origin);
  const illustration = page.locator("figure img");
  await expect(illustration).toBeVisible();
  expect(await illustration.evaluate((img: HTMLImageElement) => new URL(img.currentSrc).hash)).toBe(
    "",
  );
  await page.getByRole("link", { name: "Create an account" }).click();
  await expect(page.getByRole("heading", { name: "Create your account" })).toBeVisible();
  await page.goto(`${localWeb.origin}/sign-in?next=/settings`);
  await expect(page.getByText("Sign in to change your settings.")).toBeVisible();
  // Let Vite finish dependency discovery so a re-optimization reload can't clear the form.
  await page.waitForLoadState("networkidle");
  await expect(page.getByRole("complementary", { name: "About Kipivo" })).toBeHidden();
  const password = page.getByLabel("Password", { exact: true });
  await password.fill("visibility-test");
  await page.getByRole("button", { name: "Show password" }).click();
  await expect(password).toHaveAttribute("type", "text");
  await page.getByRole("button", { name: "Hide password" }).click();
  await expect(password).toHaveAttribute("type", "password");
  await expect(password).toHaveValue("visibility-test");
  await page.getByRole("link", { name: "Create an account" }).click();
  await expect(page).toHaveURL(
    (url) => url.pathname === "/sign-up" && url.searchParams.get("next") === "/settings",
  );
});

test.describe("with touch navigation", () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 780 } });

  test("sign-in keeps its bounds when the session resolves behind the drawer", async ({
    page,
    localWeb,
  }) => {
    let finishLookup!: () => void;
    const lookup = new Promise<void>((resolve) => {
      finishLookup = resolve;
    });
    await page.route("**/rpc/auth/session/get", async (route) => {
      await lookup;
      await route.fulfill({ json: { json: null } });
    });
    await page.goto(localWeb.origin);
    await page.evaluate(() => document.fonts.ready);
    await page.getByRole("button", { name: "Open navigation" }).tap();
    await expect(page.getByRole("dialog", { name: "On this page" })).toBeVisible();
    const placeholder = page.locator('header [data-slot="account-placeholder"]');
    const bounds = await placeholder.boundingBox();
    const background = await placeholder.evaluate((el) => getComputedStyle(el).backgroundColor);
    finishLookup();
    const signIn = page.locator('header a[href="/sign-in"]');
    await expect(signIn).toHaveCSS("background-color", background);
    expect(await signIn.boundingBox()).toEqual(bounds);
    await page.getByRole("button", { name: "Close navigation" }).tap();
    await expect(page.getByRole("link", { name: "Sign in", exact: true })).toBeInViewport();
  });
});

for (const width of [1600, 360, 320]) {
  test(`home navigation and fullscreen auth layouts fit at ${width}px`, async ({
    page,
    localWeb,
  }) => {
    await page.setViewportSize({ width, height: 780 });
    await page.route("**/rpc/auth/session/get", (route) => route.fulfill({ status: 503 }));

    await page.route("**/api/auth/email-methods", (route) =>
      route.fulfill({ json: { enabled: true } }),
    );

    const header = page.getByRole("banner");
    const main = page.getByRole("main");
    const brand = header.getByRole("link", { name: "Kipivo", exact: true });
    const theme = header.getByRole("group", { name: "Theme", exact: true });
    const menu = header.getByRole("button", { name: "Open navigation" });
    const desktop = width === 1600;

    async function expectNoHorizontalOverflow() {
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        ),
        "Page has no horizontal overflow",
      ).toBeLessThanOrEqual(1);
    }

    await test.step("/", async () => {
      await page.goto(localWeb.origin);
      const heading = main.getByRole("heading", {
        level: 1,
        name: "From spark to done.",
        exact: true,
      });
      const leadingControl = desktop ? brand : menu;
      await expect(heading).toBeVisible();
      await expect(brand).toBeInViewport();
      await expect(leadingControl).toBeInViewport();
      await expect(header.getByRole("link", { name: "Sign in", exact: true })).toBeInViewport();
      if (desktop) {
        await expect(theme).toBeInViewport();
        await expect(theme.getByRole("radio", { name: "System", exact: true })).toBeEnabled();
      }
      const left = await leadingControl.evaluate((element) => element.getBoundingClientRect().left);
      const contentLeft = await heading.evaluate((element) => element.getBoundingClientRect().left);
      expect(
        Math.abs(contentLeft - left),
        "Title starts at the header's leading edge",
      ).toBeLessThanOrEqual(1);
      await expectNoHorizontalOverflow();
      const github = header.getByRole("link", { name: "GitHub", exact: true });
      if (desktop) {
        await expect(github).toHaveAttribute("href", "https://github.com/kipivo/kipivo");
        await expect(github).toBeInViewport();
        await expect(menu).toBeHidden();
        const signIn = header.getByRole("link", { name: "Sign in", exact: true });
        const [githubBox, themeBox, signInBox] = await Promise.all(
          [github, theme, signIn].map((control) =>
            control.evaluate((element) => {
              const { left, right, height } = element.getBoundingClientRect();
              return { left, right, height };
            }),
          ),
        );
        expect(githubBox.right).toBeLessThan(themeBox.left);
        expect(Math.abs(githubBox.height - signInBox.height)).toBeLessThanOrEqual(1);
        expect(Math.abs(themeBox.height - signInBox.height)).toBeLessThanOrEqual(1);
      } else {
        await expect(github).toBeHidden();
      }
      const hero = main.getByRole("region", { name: "From spark to done.", exact: true });
      const smallestInset = await hero.evaluate((element) =>
        Math.min(
          ...["::before", "::after"].flatMap((layer) => {
            const style = getComputedStyle(element, layer);
            return [style.top, style.right, style.bottom, style.left].map(Number.parseFloat);
          }),
        ),
      );
      expect(
        smallestInset,
        "The hero artwork stays inside the content grid",
      ).toBeGreaterThanOrEqual(-1);
    });
    const authPages = [
      ["/sign-in", "Sign in to Kipivo"],
      ["/sign-up", "Create your account"],
      ["/forgot-password", "Forgot your password?"],
    ] as const;
    for (const [path, title] of authPages) {
      await test.step(path, async () => {
        await page.goto(`${localWeb.origin}${path}`);
        const heading = main.getByRole("heading", { level: 1, name: title, exact: true });
        const switcher = main.getByRole("group", { name: "Theme", exact: true });
        await expect(header).toHaveCount(0);
        await expect(heading).toBeVisible();
        await expect(switcher).toBeInViewport();
        await expect(switcher.getByRole("radio", { name: "System", exact: true })).toBeEnabled();
        const bounds = await switcher.evaluate((element) => {
          const { right, top, bottom } = element.getBoundingClientRect();
          return { top, bottom, rightInset: document.documentElement.clientWidth - right };
        });
        expect(bounds.top).toBeGreaterThanOrEqual(0);
        expect(bounds.top).toBeLessThanOrEqual(32);
        expect(bounds.rightInset).toBeGreaterThanOrEqual(0);
        expect(bounds.rightInset).toBeLessThanOrEqual(32);
        const titleBox = await heading.evaluate((element) =>
          element.getBoundingClientRect().toJSON(),
        );
        expect(titleBox.top).toBeGreaterThan(bounds.bottom);

        const form = main.locator("form");
        await expect(form).toBeVisible();
        const formBox = await form.evaluate((element) => element.getBoundingClientRect().toJSON());
        expect(Math.abs(formBox.left - titleBox.left)).toBeLessThanOrEqual(1);
        expect(formBox.width).toBeLessThanOrEqual(417);
        expect(formBox.left).toBeGreaterThan(0);
        expect(formBox.right).toBeLessThan(width);
        await expectNoHorizontalOverflow();
      });
    }
  });
}

test.describe("with JavaScript disabled", () => {
  test.use({ javaScriptEnabled: false });

  test("home visitors can read the server-rendered sample run", async ({ page, localWeb }) => {
    await page.goto(localWeb.origin);
    await page.getByRole("link", { name: "Explore a sample run" }).click();
    const example = page.getByRole("region", { name: "Read a run, line by line." });
    await expect(example.getByRole("status")).toHaveText(/Succeeded\s*Exit code 0/);
    await expect(example.getByRole("button", { name: "Failing check" })).toBeDisabled();
    await expect(example.getByRole("button", { name: "Passing check" })).toBeDisabled();
  });
});

test("home visitors can inspect a sample, copy local commands and read the workspace guide", async ({
  page,
  context,
  localWeb,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"], {
    origin: localWeb.origin,
  });
  await page.setViewportSize({ width: 360, height: 780 });
  const runnerRequests: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.startsWith("/api/local/runs"))
      runnerRequests.push(request.url());
  });
  await page.goto(localWeb.origin);
  const backToTop = page.getByRole("button", { name: "Back to top" });
  await expect(backToTop).toBeHidden();
  const menu = page.getByRole("button", { name: "Open navigation" });
  const drawer = page.getByRole("dialog", { name: "On this page" });
  await expect(drawer).toBeHidden();
  await menu.click();
  await expect(drawer).toBeVisible();
  await expect(drawer.getByRole("radio", { name: "System", exact: true })).toBeEnabled();
  await page.keyboard.press("Escape");
  await expect(drawer).toBeHidden();
  await expect(menu).toBeFocused();
  await menu.click();
  const homeNav = drawer.getByRole("navigation", { name: "On this page" });
  const exampleLink = homeNav.getByRole("link", { name: "Example run" });
  await exampleLink.click();
  await expect(drawer).toBeHidden();
  await expect(page).toHaveURL((url) => url.hash === "#example");
  const example = page.getByRole("region", { name: "Read a run, line by line." });
  await expect(example.getByRole("heading")).toBeInViewport();
  await expect(example).toBeFocused();
  const status = example.getByRole("status");
  const failing = example.getByRole("button", { name: "Failing check" });
  const passing = example.getByRole("button", { name: "Passing check" });
  await failing.click();
  await expect(failing).toHaveAttribute("aria-pressed", "true");
  await expect(status).toHaveText(/Failed\s*Exit code 1/);
  await expect(example.getByRole("list")).toContainText("src/example.ts");
  await passing.click();
  await expect(passing).toHaveAttribute("aria-pressed", "true");
  await expect(status).toHaveText(/Succeeded\s*Exit code 0/);
  const footer = page.getByRole("contentinfo");
  await expect(footer.getByRole("link", { name: "GitHub" })).toHaveAttribute(
    "href",
    "https://github.com/kipivo/kipivo",
  );
  const footerNav = footer.getByRole("navigation", { name: "Footer" });
  await footerNav.getByRole("link", { name: "Quickstart" }).click();
  await expect(page).toHaveURL((url) => url.hash === "#quickstart");
  const quickstart = page.getByRole("region", { name: "Run it locally." });
  await quickstart.getByRole("button", { name: "Copy commands: Read the result" }).click();
  await expect(backToTop).toBeInViewport();
  await expect(quickstart.getByText("Copied", { exact: true })).toBeVisible();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  const commands = copied
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  expect(commands).toEqual([
    'bun run kpdev runner status "$id"',
    'bun run kpdev runner logs "$id"',
  ]);
  await footerNav.getByRole("link", { name: "Workspace guide" }).click();
  await expect(page).toHaveURL((url) => url.hash === "#workspace-guide");
  await page.getByText("What happens if I restart the runner?", { exact: true }).click();
  await expect(page.getByText(/Completed runs and their logs stay/)).toBeVisible();
  await backToTop.focus();
  await backToTop.press("Enter");
  const header = page.getByRole("banner");
  await expect(header).toBeInViewport();
  await expect(header).toBeFocused();
  await expect(backToTop).toBeHidden();
  expect(runnerRequests).toEqual([]);
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const root = document.documentElement;
          // The root client width can include the reserved scrollbar gutter.
          const availableWidth = Math.min(root.offsetWidth, root.clientWidth);
          return root.scrollWidth - availableWidth;
        }),
      { message: "The landing page fits within the available width" },
    )
    .toBeLessThanOrEqual(1);
});

test("workbench tasks persist, move between lanes and delete only after confirmation", async ({
  page,
  localWeb,
}) => {
  await page.goto(localWeb.origin);
  await page.getByRole("link", { name: "Open workbench" }).click();
  const nav = page.getByRole("navigation", { name: "Workspace", exact: true });
  await expect(nav.getByRole("link", { name: "Workbench", exact: true })).toHaveAttribute(
    "aria-current",
    "page",
  );
  const dialog = page.getByRole("dialog");
  await page.getByRole("button", { name: "New task", exact: true }).click();
  await dialog.getByLabel("Title").fill("Review the new route");
  await dialog.getByLabel("Notes").fill("Verify on mobile");
  await dialog.getByRole("button", { name: "Create task" }).click();
  const card = page.getByRole("button", { name: /Review the new route/ });
  await expect(
    page
      .getByRole("region", { name: "To do", exact: true })
      .getByRole("button", { name: /Review the new route/ }),
  ).toBeVisible();
  await card.click();
  await dialog.getByLabel("Status").selectOption("active");
  await dialog.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("region", { name: "Board summary" })).toContainText("Current focus");
  await page.reload();
  await expect(
    page
      .getByRole("region", { name: "In progress", exact: true })
      .getByRole("button", { name: /Review the new route/ }),
  ).toBeVisible();
  await card.click();
  await dialog.getByLabel("Status").selectOption("done");
  await dialog.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("progressbar")).toHaveAttribute("value", "1");
  await card.click();
  await dialog.getByRole("button", { name: "Delete task" }).click();
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(card).toBeVisible();
  await card.click();
  await dialog.getByRole("button", { name: "Delete task" }).click();
  await dialog.getByRole("button", { name: "Confirm delete" }).click();
  await expect(card).toHaveCount(0);
  await page.setViewportSize({ width: 360, height: 780 });
  await expect(nav).toBeVisible();
  const more = nav.getByRole("button", { name: "More destinations" });
  await more.click();
  await expect(page.getByRole("menuitem", { name: "Workspace guide" })).toBeVisible();
  await more.press("Escape");
  await expect(more).toBeFocused();
  await nav.getByRole("link", { name: "Local runs" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Local runs" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Local runs" })).toHaveAttribute(
    "aria-current",
    "page",
  );
});
