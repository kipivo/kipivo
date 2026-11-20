import { imageMatrix, jobs } from "./plan";

type PlanSelection = Record<(typeof jobs)[number], boolean> & { images?: unknown };
type Needs = Partial<Record<string, { result?: string }>>;

function isPlanSelection(plan: unknown): plan is PlanSelection {
  if (!plan || typeof plan !== "object") return false;
  const selection = plan as Record<string, unknown>;
  return jobs.every((job) => typeof selection[job] === "boolean");
}

export function validateResults(plan: unknown, needs: Needs | null) {
  for (const job of ["changes", "check"]) {
    if (needs?.[job]?.result !== "success") throw new Error(`${job} must succeed`);
  }
  if (!isPlanSelection(plan)) throw new Error("Missing or invalid CI plan");
  const images = imageMatrix(plan);
  if (JSON.stringify(plan.images) !== JSON.stringify(images)) {
    throw new Error("Image matrix does not match the CI plan");
  }
  for (const job of ["ui", "cli", "mobile", "auth", "e2e", "images"] as const) {
    const selected = job === "images" ? images.length > 0 : plan[job];
    const expected = selected ? "success" : "skipped";
    const actual = needs?.[job]?.result;
    if (actual !== expected) {
      throw new Error(`${job}: expected ${expected}, received ${actual}`);
    }
  }
}

if (import.meta.main) {
  const needs: Needs | null = JSON.parse(process.env.CI_NEEDS || "null");
  validateResults(JSON.parse(process.env.CI_PLAN || "null"), needs);
  console.log("All required CI jobs succeeded; only unselected jobs were skipped.");
}
