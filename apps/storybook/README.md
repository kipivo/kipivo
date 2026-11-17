# Component stories

The `storybook` workspace is a standalone component manual built with [Fumadocs Story Headless](https://www.fumadocs.dev/docs/tanstack-start/integrations/story/headless), React, and Vite. The workspace name and commands are retained; the Storybook framework and addons have been removed.

```sh
bun run dev:storybook
```

Open [localhost:6006](http://localhost:6006). The manual does not start Web, the API, or a database. `bun run dev` excludes this workspace.

The nine shared components and Wordmark have live examples, editable props, usage snippets, and accessibility guidance. Props stack into labeled fields on narrow screens. Search the desktop navigation by component name or description; `/` focuses search, Enter opens the first result, and Escape clears it. The mobile picker and previous/next links work without search.

Theme & colors shows the current semantic and chart token values, with copyable CSS declarations and a contrast checker. Select foreground/background tokens and the small-text (4.5:1) or control-boundary (3:1) requirement. Ratios use browser-composited sRGB, including transparent foreground tokens over the selected surface. This checks token pairs; component opacity, hover states, and other layered surfaces still need checking in context. Light/Dark applies the shared stylesheet to previews and portals, updates the inspector, and persists locally. The inspector reads the theme without changing its tokens.

Follow the [theme contrast constraints](../../packages/ui/README.md#contrast-constraints) when composing examples. In particular, small primary-colored links need a local darker color on a full muted/secondary surface in light mode. Recheck the documented combinations when changing surfaces or tokens.

## Build and verify

```sh
bun run build:storybook
bun run test:ui:install
bun run test:ui
```

The static build is written to `apps/storybook/dist`. Playwright builds through Turbo and serves it on loopback port 4384, checking both light and dark themes. Tests cover generated controls and reset, disabled/loading states, field labels and errors, dialog focus restoration, menu keyboard navigation, tooltip descriptions, theme persistence, search, 320px-wide prop editing, contrast inspection, clipboard feedback/fallback, and preview load failure/recovery. A small contrast regression checks browser-composited text, input borders, focus colors, and muted text. CI runs these in the `ui` job and retains traces on failure. On Linux, add `--with-deps` to the browser installation command if system libraries are missing.

`bun run check` includes formatting, lint, types, and unused-code checks for this workspace. Browser tests run separately and do not require backend services. There is no screenshot baseline, coverage service, or Chromatic dependency.

## Add a story

1. Add a small example in `src/examples.tsx`, importing from `@kipivo/ui` public subpaths. Give it explicit scalar props for the controls you need.
2. Export a `defineStory({ Component, args })` in `src/components.story.tsx`. The Vite plugin transforms `*.story.tsx` and generates the control types from TypeScript.
3. Register the page's title, description, usage, and guidance in `src/pages.ts`. Keep examples deterministic and independent of backend services.
4. Add a browser check only for behavior that needs protection.

`src/story.tsx` replaces Fumadocs' built-in panel through `defineStoryFactory({ WithControl: StoryPanel })`. The custom panel uses `StoryProvider`, `useStory`, `useStoryArgs`, and `@fumari/stf` fields. It supports the string, number, boolean, and literal/enum props used by these examples. The fields describe **example props**, not the complete inherited DOM/Base UI API. Add an appropriate control before introducing a more complex prop type. A failed preview leaves the usage and guidance available, with a reload action to retry.

Fumadocs Story requires `fumadocs-core` and `fumadocs-ui` as peers even with a custom panel. Both are pinned here, with `fumadocs-ui` mapped to Fumadocs' Base UI distribution; Knip permits these peer-only dependencies. The manual uses the shared Kipivo stylesheet and components for its interface.

Examples already have TooltipProvider. Give fields unique IDs with `useId`; compose Base UI triggers with `render={<Button />}`. Portal assertions must query the page rather than only the preview region.
