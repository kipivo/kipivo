import { createFileRoute, notFound } from "@tanstack/react-router";
import { RunPage } from "../run-page";

export const Route = createFileRoute("/runs")({
  beforeLoad: () => {
    if (!import.meta.env.DEV) throw notFound();
  },
  component: RunPage,
});
