import { createMiddleware, createStart } from "@tanstack/react-start";
import { paraglideMiddleware } from "@kipivo/i18n/server";

/**
 * Resolve the request locale once, inside Paraglide's async local storage, so
 * every message call during server rendering reads the same locale.
 */
const paraglide = createMiddleware({ type: "request" }).server(async ({ request, next }) => {
  return paraglideMiddleware(request, async () => next());
});

export const startInstance = createStart(() => ({ requestMiddleware: [paraglide] }));
