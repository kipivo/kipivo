# @kipivo/i18n

Kipivo’s message catalogs and the small runtime layer shared by web and desktop. Translation is compiled by [Paraglide JS](https://paraglidejs.com); this package owns the catalogs, the compile configuration and the React helpers that Paraglide does not ship.

## Layout

- `messages/en.json`, `messages/zh-CN.json` — flat `camelCase` message ids. English is the base locale.
- `project.inlang/` — the inlang project and `paraglide.config.ts`, which fixes the locale strategy (cookie → browser preference → base locale), the cookie contract and physical message modules.
- `src/` — `renderMarkup`/`stripMarkup` for `<tag>` rich text, and `createLocale` for React locale state.

## Entry points

- `@kipivo/i18n` exports the React helpers only. Generated messages are not re-exported here: every app compiles the catalogs into its own directory and imports `{ m }` from there, so bundlers can tree-shake per message.

## Compiled entries

The package compiles once into `generated/` (ignored by Git) and exports:

- `@kipivo/i18n/messages` — `{ m }` and every message function.
- `@kipivo/i18n/runtime` — `getLocale`, `setLocale`, `locales`, `cookieName`.
- `@kipivo/i18n/server` — `paraglideMiddleware` for server rendering.
- `@kipivo/i18n/vite` — `paraglide()`, the Vite plugin with the project path and output directory already set.

Run `bun run kpdev i18n compile` (the package's `compile` script, which app scripts delegate to) before TypeScript, tests or builds, and `bun run kpdev i18n check` to find unused or missing message ids; the CLI also emits the `.d.ts` files. The Vite plugin recompiles on message edits. Every app and shared package imports the same files, so the locale store is one runtime instance: `setLocale` updates app and package screens together. Apps wrap the tree with `createLocale({ getLocale, setLocale })` and run `paraglideMiddleware` per request. See the [Web guide](../../docs/i18n.md).

## Adding a message

Add the id to `messages/en.json`, add the translation to `messages/zh-CN.json` unless the surface is English-only, then call `m.myMessage()` at the call site. `bun run kpdev check` compiles the catalogs, so invalid ICU fails there.
