# Shared Web UI

- Keep shared DOM components in `src/components/` and expose them through `@kipivo/ui/components/<name>`. Feature-specific layouts stay in the consuming app; Expo screens use native components. The package root retains `Wordmark`.
- Put shared page compositions in `src/blocks/` and expose them through `@kipivo/ui/blocks/<name>`; keep routing and feature-specific content out of those blocks.
- For a shadcn component use `bun run ui:add <name>` from the root, review the generated source against [components.json](components.json), and use shared semantic tokens from `src/styles/globals.css`. Follow the [UI guide](README.md) for Base UI composition and light/dark contrast constraints.
- Add examples and relevant interaction states in [Storybook](../../apps/storybook/AGENTS.md). Run `bun run test:stories` and `bun run test:ui`, particularly for keyboard focus, portals, or theme changes.
