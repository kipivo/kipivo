# Mobile

- Put Expo Router screens and layouts under `src/app/`. Use React Native components; `@kipivo/ui` and its CSS target the DOM. Keep the `expo/tsconfig.base` inheritance for Expo-specific resolution.
- Keep native app identity, URL scheme, platforms, and plugins in [app.json](app.json). Generated bundles in `dist/` are not source files.
- Use `bun run dev:mobile` for a device or simulator check. Run `bun run build --filter=mobile` to verify both native bundle exports; a successful Web build does not cover Metro. See the [mobile guide](README.md).
