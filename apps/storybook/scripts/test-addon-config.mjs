import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

// Match the Storybook test panel's startup path, including its project filter.
process.env.VITEST = "true";
process.env.VITEST_STORYBOOK = "true";
const { createVitest } = await import("vitest/node");
const root = fileURLToPath(new URL("../", import.meta.url));
const projectName = `storybook:${fileURLToPath(new URL("../.storybook", import.meta.url))}`;
const vitest = await createVitest("test", {
  root,
  watch: false,
  project: [projectName],
});

try {
  assert.equal(vitest.projects.length, 1, "The Storybook panel must resolve one test project");
  assert.equal(vitest.projects[0].name, `${projectName} (chromium)`);
  console.log("Storybook test panel configuration passed");
} finally {
  await vitest.close();
}
