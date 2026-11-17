import { expect } from "@playwright/test";
import { test } from "../fixtures/local-runs";

test("CLI submission is visible in Web and survives restarting the runner", async ({
  page,
  runs,
}) => {
  const response = await page.request.get(`${runs.runnerOrigin()}/v1/runs`);
  expect(response.status()).toBe(401);

  const id = (await runs.cli("run", "check")).trim();
  await page.goto(`${runs.webOrigin}/runs`);
  const details = page.getByRole("region", { name: "Run details" });
  await expect(details).toContainText(id);
  await expect(details.getByRole("status")).toHaveText("Status: running");
  await expect(details.getByRole("log")).toContainText("fixture check started");
  await expect(page.getByRole("button", { name: "Run checks" })).toBeDisabled();

  const submit = (origin: string) =>
    page.request.post(`${runs.webOrigin}/api/local/runs`, {
      headers: { Origin: origin },
      data: { kind: "check" },
    });
  expect((await submit("https://example.test")).status()).toBe(403);
  expect((await submit(runs.webOrigin)).status()).toBe(409);

  await runs.finish(0);
  await expect(details.getByRole("status")).toHaveText("Status: succeeded");
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

test("a Web submission reports its failure to the CLI", async ({ page, runs }) => {
  await runs.finish(7);
  await page.goto(`${runs.webOrigin}/runs`);
  await page.getByRole("button", { name: "Run checks" }).click();
  const details = page.getByRole("region", { name: "Run details" });
  await expect(details.getByRole("status")).toHaveText("Status: failed");
  await expect(details).toContainText("Exit code: 7");
  const id = (
    await page.getByRole("region", { name: "Run history" }).locator("code").innerText()
  ).trim();
  expect(JSON.parse(await runs.cli("status", id))).toMatchObject({ status: "failed", exitCode: 7 });
  expect(await runs.cli("logs", id)).toContain("fixture stderr");
});
