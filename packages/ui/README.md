# @kipivo/ui

Shared Web components based on shadcn's `base-nova` style and Base UI. Components are committed source owned by Kipivo. Expo native screens use React Native components rather than this DOM package.

## Use components

```tsx
import { Button } from "@kipivo/ui/components/button";
import { Input } from "@kipivo/ui/components/input";
import { Label } from "@kipivo/ui/components/label";

<div>
  <Label htmlFor="task-name">Task name</Label>
  <Input id="task-name" />
  <Button>Run checks</Button>
</div>;
```

Available components: Button, Input, Textarea, Label, Card, Badge, Dialog, DropdownMenu, and Tooltip. The root export retains Wordmark. Import components through their individual subpaths.

## Styles and themes

Consumers install the Tailwind Vite plugin and import the shared stylesheet once. Add the consumer's source directory explicitly so Tailwind also generates its app-specific utilities:

```css
/* In the consumer's src/styles.css. */
@import "@kipivo/ui/globals.css";
@source ".";
```

The shared stylesheet scans UI source, self-hosts Geist, and owns semantic colors, radii, focus, and reduced-motion behavior. Light mode uses warm white surfaces; `.dark` on the document element selects neutral charcoal surfaces. Coral marks primary actions, amber marks accent and dark focus states, and the base radius is 10px. Web starts in dark mode. The Fumadocs Story manual exposes both themes through its toolbar.

Use semantic classes such as `bg-background`, `text-foreground`, `bg-primary`, `text-muted-foreground`, and `border-border`. The opaque `primary-hover` token preserves button text contrast in both themes. Input borders and focus rings are stronger than decorative borders; destructive colors remain readable on tinted surfaces, including hover states. Five `chart-*` tokens are also exposed as Tailwind colors.

The existing `kipivo-*` color aliases map to these same tokens. Put product-specific layout in the consuming app.

Wrap the app in `TooltipProvider` before using tooltips. The stylesheet isolates the body stacking context so Base UI's portals remain above app content; avoid raising application wrappers above portals.

Use Base UI's `render` prop to compose triggers with Button. For navigation, apply `buttonVariants` to a real link so it retains link semantics. Pair inputs with Label and errors with `aria-invalid` and `aria-describedby`. Decorative Hugeicons use stroke width 2 and `aria-hidden="true"`; icon-only controls need accessible names.

The Tooltip wrapper supplies a stable popup ID, `role="tooltip"`, and the trigger's `aria-describedby`, which Base UI 1.9 does not supply. Keep this association when updating the generated component; the tooltip story checks the accessible description.

## Add a component

From the repository root:

```sh
bun run ui:add select
```

The CLI runs in this package and uses `components.json` to select Base UI, Hugeicons, and the shared source paths. Web also has a matching configuration for adding app-owned blocks from its directory. Add only components required by a feature, review generated changes to customized components, and keep shared dependencies declared here.

Add examples and Fumadocs stories in `apps/storybook/src` for variants and disabled/loading/error states. See the [component stories guide](../../apps/storybook/README.md) for the headless panel and browser checks. Verify with `bun run check`, `bun run build --filter=web`, `bun run build:storybook`, and `bun run test:ui`.
