import { cookieName } from "@kipivo/i18n/runtime";
import { createMiddleware, createStart } from "@tanstack/react-start";
import { AUTO_COOKIE, hasCookie, removeCookie } from "@/features/i18n/preference";
import { paraglideMiddleware } from "@kipivo/i18n/server";

/**
 * In automatic mode the browser preference decides, even if a locale cookie is
 * still around from an earlier explicit choice or from Paraglide's own write.
 * Only document requests need the locale, and cloning their headers is safe.
 */
function withoutRememberedLocale(request: Request): Request {
  if (request.method !== "GET" && request.method !== "HEAD") return request;
  const cookie = request.headers.get("cookie");
  if (!cookie || !hasCookie(cookie, AUTO_COOKIE)) return request;
  const headers = new Headers(request.headers);
  const remaining = removeCookie(cookie, cookieName);
  if (remaining) headers.set("cookie", remaining);
  else headers.delete("cookie");
  return new Request(request, { headers });
}

/**
 * Resolve the request locale once, inside Paraglide's async local storage, so
 * every message call during server rendering reads the same locale.
 */
const paraglide = createMiddleware({ type: "request" }).server(async ({ request, next }) => {
  return paraglideMiddleware(withoutRememberedLocale(request), async () => next());
});

export const startInstance = createStart(() => ({ requestMiddleware: [paraglide] }));
