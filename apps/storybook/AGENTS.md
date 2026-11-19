# Storybook

- Write stories in `src/*.stories.tsx` and composed examples under `src/patterns/`. Import the real components from `@kipivo/ui`; change component behavior and theme tokens in the [UI package](../../packages/ui/AGENTS.md), not in a story wrapper.
- Use story args for editable examples and `play` for interactions. Use the shared theme decorator when checking focus, portals, or contrast in light and dark mode. Keep this app runnable without Web, the API, or a database.
- Run `bun run test:stories` for story interactions and `bun run test:ui` for the built manager, theme, and browser checks. See the [Storybook guide](README.md) before changing the pinned core/addon or docgen toolchain.
