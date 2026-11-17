# Storybook

The isolated development workspace for `@kipivo/ui`. It uses React/Vite, the shared Tailwind stylesheet and self-hosted font, a light/dark theme toolbar, and Storybook's accessibility and Vitest addons. It does not start Web, the API, a database, or the local runner.

From the repository root:

```sh
bun run dev:storybook
```

Open [localhost:6006](http://localhost:6006). Storybook starts only when requested; `bun run dev` excludes it. Every initial component has stories, and Foundations shows the palette and Wordmark. Controls adjust props. The accessibility panel reports violations, and the testing widget runs the same browser tests used by CI.

```sh
bun run build:storybook
bun run test:ui:install
bun run test:ui
```

The static build is written to `apps/storybook/dist`. Browser tests render every story in both themes, fail on accessibility violations, and exercise input labeling, button clicks, dialog dismissal/focus restoration, menu keyboard navigation, and tooltips. They run separately from `bun run check`, which does not require browser binaries. On Linux, add `--with-deps` to the browser installation command if system libraries are missing.

Add `*.stories.tsx` files under `src`, importing components through `@kipivo/ui` public subpaths. Keep examples deterministic and independent of backend services. Import app-specific story styles through `src/styles.css`; the preview already supplies TooltipProvider. Portal assertions must query the story document's body rather than only the canvas.
