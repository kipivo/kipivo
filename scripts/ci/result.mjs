import { imageMatrix, jobs } from "./plan.mjs";

export function validateResults(plan, needs) {
  for (const job of ["changes", "check"]) {
    if (needs[job]?.result !== "success") throw new Error(`${job} must succeed`);
  }
  if (!plan || jobs.some((job) => typeof plan[job] !== "boolean")) {
    throw new Error("Missing or invalid CI plan");
  }
  const images = imageMatrix(plan);
  if (JSON.stringify(plan.images) !== JSON.stringify(images)) {
    throw new Error("Image matrix does not match the CI plan");
  }
  for (const job of ["ui", "cli", "mobile", "auth", "e2e", "images"]) {
    const selected = job === "images" ? images.length > 0 : plan[job];
    const expected = selected ? "success" : "skipped";
    if (needs[job]?.result !== expected) {
      throw new Error(`${job}: expected ${expected}, received ${needs[job]?.result}`);
    }
  }
}

if (import.meta.main) {
  validateResults(JSON.parse(process.env.CI_PLAN || "null"), JSON.parse(process.env.CI_NEEDS));
  console.log("All required CI jobs succeeded; only unselected jobs were skipped.");
}
