import { readFile } from "node:fs/promises";

console.log("fixture check started");
for (;;) {
  let result;
  try {
    result = JSON.parse(await readFile("check-result.json", "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    await Bun.sleep(25);
    continue;
  }
  console.error("fixture stderr");
  console.log("fixture check finished");
  process.exitCode = result.exitCode;
  break;
}
