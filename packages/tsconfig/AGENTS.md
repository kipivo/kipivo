# Shared TypeScript presets

- Keep [base.json](base.json) suitable for non-DOM code. [react.json](react.json) extends it with JSX and DOM libraries. Workspace-specific types, include paths, and framework options belong in the consuming workspace.
- Preserve the `@kipivo/tsconfig/base.json` and `@kipivo/tsconfig/react.json` exports. Do not replace the Expo preset in mobile or change Storybook's compiler version as a side effect of a shared preset change.
- There is no package-local build or test. Run `bun run kpdev check` from the root to type-check the workspace consumers and the Railway config.
