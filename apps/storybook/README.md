# Component stories

The `storybook` workspace uses official [Storybook for React & Vite](https://storybook.js.org/docs/get-started/frameworks/react-vite). Shared components remain in `@kipivo/ui`; this application supplies their examples, documentation, and the theme inspector.

```sh
bun run dev:storybook
```

Open [localhost:6006](http://localhost:6006). Storybook runs independently of Web, the API, and a database. `bun run dev` excludes this workspace.

## Browse and inspect

Use Storybook's sidebar/search to choose a component and story. Controls edits the example props, resets args, and supports sharing states through the URL. The Docs entry contains usage snippets and accessibility guidance. The controls describe the example wrappers; they do not enumerate the full inherited DOM/Base UI API.

The theme toolbar switches Light/Dark by applying the shared stylesheet's class to the preview document, including Base UI portals. Storybook retains the global theme in its navigation URLs. Its manager appearance is separate from the component theme.

[Theme & colors](http://localhost:6006/?path=/story/foundations-theme--palette) displays actual semantic/chart token values, copyable CSS declarations, and an interactive contrast checker. Select foreground/background tokens and either small text (4.5:1) or control boundaries (3:1). Ratios use browser-composited sRGB, including translucent foreground tokens over the selected surface. Component opacity, hover states, and other layered surfaces need checking in context.

Follow the [theme contrast constraints](../../packages/ui/README.md#contrast-constraints). In particular, small primary-colored links on full muted/secondary surfaces need a local darker color in light mode. The inspector reads the shared theme without changing token values.

## Build and verify

```sh
bun run build:storybook
bun run test:ui:install
bun run test:ui
```

The static build is written to `apps/storybook/dist` and cached by Turbo. `bun run --cwd apps/storybook preview` serves it on port 6006. Playwright builds through Turbo and serves the same output on loopback port 4384. Tests cover component states, labels/errors, dialog/menu focus, tooltips, native Controls and documentation, theme switching, the inspector, clipboard fallback, narrow screens, and browser-composited contrast.

CI retains Bun's package cache, Turbo artifacts, Vite dependencies, and Storybook's manager/builder cache. It runs browser tests in the `ui` job and retains traces/screenshots on failure. On Linux, add `--with-deps` to browser installation if system libraries are missing.

`bun run check` covers formatting, lint, types, unused code, and unit tests. Browser checks run separately. The installed addons provide Docs and Themes; Playwright handles the browser checks directly.

## Add a story

1. Add a deterministic example in `src/examples.tsx`, importing from `@kipivo/ui` public subpaths. Give it explicit props for the controls you need.
2. Create `src/<component>.stories.tsx` using `Meta`/`StoryObj` from `@storybook/react-vite`. Set the component, args, variants, and `tags: ["autodocs"]`. Explicitly configure enum controls when needed.
3. Add usage and guidance to `src/documentation.ts`, then attach it with `parameters: docsFor("component")`.
4. Add a browser check for new behavior that needs protection.

`.storybook/preview.tsx` supplies TooltipProvider and the theme decorator. Give fields unique IDs with `useId`; compose Base UI triggers with `render={<Button />}`. Portal assertions must query the preview document, not only the example's container. Configure browser tests in Playwright; Storybook does not start a separate Vitest project.
