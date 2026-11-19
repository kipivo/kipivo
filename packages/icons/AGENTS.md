# Web icons

Import each icon as a React component, for example `import { RocketIcon } from "@kipivo/icons"`. Use `<RocketIcon aria-hidden="true" />` for a decorative icon. Give icon-only controls an accessible name on the control itself.

To add an icon, import the glyph from its individual Hugeicons module in [src/index.tsx](src/index.tsx) and export a named component that binds the glyph and passes props to the renderer. Web, UI, and Storybook share this entry point.
