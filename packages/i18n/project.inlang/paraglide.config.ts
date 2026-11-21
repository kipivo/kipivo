import { defineConfig } from "@inlang/paraglide-js";

/**
 * Shared by every app that compiles these catalogs. Apps pass their own `outdir`;
 * everything else stays identical so web and desktop resolve locales the same way.
 */
export default defineConfig({
  strategy: ["cookie", "preferredLanguage", "baseLocale"],
  cookieName: "locale",
  cookieMaxAge: 60 * 60 * 24 * 365,
  cookieSameSite: "lax",
  cookieSecure: "auto",
  outputStructure: "message-modules",
  emitReadme: false,
  emitPrettierIgnore: false,
});
