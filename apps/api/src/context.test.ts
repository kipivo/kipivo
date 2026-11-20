import { asValue } from "awilix";
import { Hono } from "hono";
import { expect, it } from "vitest";
import { createApp } from "./app";
import { provideServices, requestServices, type AppEnv } from "./context";

it("resolves the services supplied to each app, not the last app registered", async () => {
  const first = createApp({ ready: async () => true });
  const second = createApp({ ready: async () => false });
  const responses = await Promise.all([first, second, first].map((app) => app.request("/readyz")));
  expect(responses.map(({ status }) => status)).toEqual([200, 503, 200]);
});

it("inherits app services and isolates registrations between concurrent requests", async () => {
  const services = { ready: async () => true };
  const app = new Hono<AppEnv>();

  app.use(provideServices(services));
  app.get("/:status", async (context) => {
    const inherited = requestServices(context) === services;
    const ready = context.req.param("status") === "ready";
    context.var.servicesScope.register("appServices", asValue({ ready: async () => ready }));
    await Promise.resolve();
    return context.json({ inherited, ready: await requestServices(context).ready?.() });
  });

  const responses = await Promise.all([app.request("/ready"), app.request("/unavailable")]);
  expect(responses.map(({ status }) => status)).toEqual([200, 200]);
  expect(await Promise.all(responses.map((response) => response.json()))).toEqual([
    { inherited: true, ready: true },
    { inherited: true, ready: false },
  ]);
});
