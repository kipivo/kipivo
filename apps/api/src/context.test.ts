import { expect, it } from "vitest";
import { createApp } from "./app";

it("resolves the services supplied to each app, not the last app registered", async () => {
  const first = createApp({ ready: async () => true });
  const second = createApp({ ready: async () => false });
  const responses = await Promise.all([first, second, first].map((app) => app.request("/readyz")));
  expect(responses.map(({ status }) => status)).toEqual([200, 503, 200]);
});
