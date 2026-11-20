# Component stories

The `storybook` workspace uses [Storybook 11 beta for React & Vite](https://storybook.js.org/blog/storybook-11-beta), with its core and addons pinned together at `11.0.0-beta.3`. Shared components remain in `@kipivo/ui`; this application supplies their examples, documentation, and the theme inspector.

Storybook has its own TypeScript 6 dependency for server-side component docgen. TypeScript 7 does not expose the compiler API required by this beta. The other workspaces keep their own TypeScript versions. See the [Storybook 11 migration guide](https://storybook.js.org/docs/11/releases/migration-guide#typescript).

The new headless CLI can read example props and story snippets without a running dev server:

```sh
bun run --cwd apps/storybook storybook tools docs list --no-attach
bun run --cwd apps/storybook storybook tools docs show --id components-button --no-attach
```

```sh
bun run kpdev dev storybook
```

Open [localhost:6006](http://localhost:6006). Storybook runs independently of Web, the API, and a database. `bun run kpdev dev` excludes this workspace.

## Browse and inspect

Use Storybook's sidebar/search to choose a component and story. Controls edits the example props, resets args, and supports sharing states through the URL. The Docs entry contains usage snippets and accessibility guidance. The controls describe the example wrappers; they do not enumerate the full inherited DOM/Base UI API.

Components shows individual controls and states. Patterns shows how to compose them into a run configuration form and a run history, including validation, status, and row actions.

The theme toolbar switches Light/Dark by applying the shared stylesheet's class to the preview document, including Base UI portals. Storybook retains the global theme in its navigation URLs. Its manager appearance is separate from the component theme.

[Theme & colors](http://localhost:6006/?path=/story/foundations-theme--palette) displays actual semantic/chart token values, copyable CSS declarations, and an interactive contrast checker. Select foreground/background tokens and either small text (4.5:1) or control boundaries (3:1). Ratios use browser-composited sRGB, including translucent foreground tokens over the selected surface. Component opacity, hover states, and other layered surfaces need checking in context.

Follow the [theme contrast constraints](../../packages/ui/README.md#contrast-constraints). In particular, small primary-colored links on full muted/secondary surfaces need a local darker color in light mode. The inspector reads the shared theme without changing token values.

## Build and verify

```sh
bun run kpdev turbo run build --filter=storybook
bun run kpdev test ui install
bun run kpdev test stories
bun run kpdev test ui
```

The static build is written to `apps/storybook/dist` and cached by Turbo. `bun run --cwd apps/storybook preview` serves it on port 6006. Playwright builds through Turbo and serves the same output on loopback port 4384. Tests cover component states, labels/errors, dialog/menu focus, tooltips, native Controls and documentation, theme switching, the inspector, clipboard fallback, narrow screens, and browser-composited contrast.

CI retains Bun's package cache, Turbo artifacts, Vite dependencies, and Storybook's manager/builder cache. It runs browser tests in the `ui` job and retains traces/screenshots on failure. On Linux, add `--with-deps` to browser installation if system libraries are missing.

`bun run kpdev check` covers formatting, lint, types, unused code, and unit tests. Browser checks run separately. The [Vitest addon](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon/) turns stories into Chromium component tests. Run them with `bun run kpdev test stories`, or use **Run tests** in Storybook's sidebar testing widget. Its eye toggle reruns affected stories while editing. Stories with a `play` function also check their documented interactions.

V8 coverage is installed. Enable **Coverage** in the testing widget, or run `bun run kpdev test stories --coverage` to write a report to `apps/storybook/coverage`.

The addon and CLI share one project in `vitest.config.ts`. In panel mode the addon names projects by Storybook config directory, so registering this directory more than once causes duplicate project names. The preview's theme decorator and TooltipProvider are loaded automatically by Storybook 11; a manual `setProjectAnnotations` setup file is unnecessary. Playwright's separate suite checks both themes, the manager UI, and contrast. CI runs both suites in the `ui` job using the same installed Chromium binary.

## Add a story

1. Add a deterministic example using public `@kipivo/ui` imports. Put component examples in `src/examples.tsx` and composed examples in `src/patterns/`.
2. Define the story with `Meta` and `StoryObj` from `@storybook/react-vite`. Set component args, opt into `autodocs`, and configure the controls readers need.
3. Add component guidance to `src/documentation.ts` and attach it with `parameters: docsFor("component")`. Describe a pattern in its own story metadata.
4. Use a dedicated `play` story to verify interactions that change the example state.

`.storybook/preview.tsx` supplies TooltipProvider and the theme decorator. Give fields unique IDs with `useId`; compose Base UI triggers with `render={<Button />}`. Portal assertions must query the preview document, not only the example's container. Configure story rendering and `play` tests in Vitest, and manager/theme/contrast checks in Playwright.
