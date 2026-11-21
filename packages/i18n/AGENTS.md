# @kipivo/i18n

See the [package guide](README.md) for catalogs, the compile configuration and the React helpers. Keep the Apache-2.0 license with the source.

This package owns the inlang project, the message files and the single compiled output in `generated/`; apps and shared packages import `@kipivo/i18n/messages`, `/runtime` and `/server` and must not compile a second copy, because a second runtime would ignore `setLocale`. Message ids are flat `camelCase`; do not reintroduce namespaces or a runtime message table. English is the base locale, so English-only surfaces simply omit the id from `zh-CN.json`.

Keep `renderMarkup` and `createLocale` framework-thin: they must not import app code or a generated catalog.

Run `bun run kpdev i18n check` for a quick unused and missing message check, and `bun run kpdev check` for catalog parity, unused-message and markup tests. For changes affecting locale resolution, the cookie contract or request-scoped rendering, run the authentication suite described in the [Web internationalization guide](../../docs/i18n.md).
