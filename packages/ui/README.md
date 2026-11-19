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

Available components include Button, BackToTopButton, Input, PasswordInput, InitialsAvatar, Textarea, Label, Field, Select, NativeSelect, Separator, Card, Badge, Dialog, DropdownMenu, SidebarMenu, Tooltip, and ThemeSelector. The root export retains Wordmark. Import components through their individual subpaths.

### Component ownership

| Shared UI                                                                                                    | Web                                                                                                                                          |
| ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `BackToTopButton` renders the accessible control and its reduced-motion-aware rocket animation.              | The landing page observes its hero, positions the button, scrolls the document and returns focus to its header.                              |
| `ThemeSelector` renders the preference controls and reports the selection event.                             | The theme provider resolves system preferences, persists the choice, applies SSR and browser theme colors, and animates the page transition. |
| `InitialsAvatar` derives decorative initials from a supplied name. `PasswordInput` owns password visibility. | Account screens supply identity, field labels, password policy, authentication and navigation.                                               |
| `copyText` from `@kipivo/ui/lib/clipboard` reports whether the browser copied a string.                      | Quickstart supplies the commands and manual-copy instructions. Storybook gives feedback suited to its code and token examples.               |

For in-place detail editing, use `<DialogContent presentation="detail">` with the usual dialog title and description. It docks on the right at the desktop breakpoint and keeps the centered modal on smaller screens. Use the default centered presentation for confirmations.

## Styles and themes

Consumers install the Tailwind Vite plugin and import the shared stylesheet once. Add the consumer's source directory explicitly so Tailwind also generates its app-specific utilities:

```css
/* In the consumer's src/styles.css. */
@import "@kipivo/ui/globals.css";
@source ".";
```

The shared stylesheet scans UI source, self-hosts Geist, and owns semantic colors, radii, focus, and reduced-motion behavior. Light mode uses warm white surfaces; `.dark` on the document element selects neutral charcoal surfaces. Coral marks primary actions, amber marks accents, and the base radius is 10px. `ThemeSelector` offers Light, Dark, and System as a radio group. Web defaults to dark and saves the choice in the browser. Storybook exposes both palettes through its toolbar.

Use semantic classes such as `bg-background`, `text-foreground`, `bg-primary`, `text-muted-foreground`, and `border-border`. The opaque `primary-hover` token preserves button text contrast in both themes. Input borders and focus rings are stronger than decorative borders; destructive colors remain readable on tinted surfaces, including hover states. Five `chart-*` tokens are also exposed as Tailwind colors.

The existing `kipivo-*` color aliases map to these same tokens. Put product-specific layout in the consuming app.

### Page blocks and focus

Use `Page` and `PageTitle` from `@kipivo/ui/blocks/page` for Web screens. `Page` renders the single `main` landmark; use the `page-gutter` utility on a separate header to line up its contents. Keep a form or other narrow reading measure **inside** that grid rather than centering a second container. `PageTitle` renders an `h1`; use its default scale for work screens and `scale="display"` for the landing headline. Route guards, actions and feature-specific content stay in the app. See **Patterns / Page** in Storybook.

Use `OperationPage` from `@kipivo/ui/blocks/operation-page` for settings, administration, directories and run tools. It owns the `main` landmark, compact heading, short description, optional page action and spacing before content. Place it directly in the route (do not wrap it in `Page`). The app shell owns navigation and permissions. Keep form-level actions next to the fields they save. See **Patterns / Operation Page** in Storybook.

Use `ActionCard` for a management destination or a single in-place action. It renders a level-two heading and description below the page title. The card itself is not clickable; pass a named link for navigation or a `Button` for an in-place action. See **Patterns / Action Card** in Storybook.

```tsx
import { ActionCard } from "@kipivo/ui/blocks/action-card";
import { buttonVariants } from "@kipivo/ui/components/button";

<ActionCard title="Workspace members" description="Review who has access to this workspace.">
  <a href="/settings/members" className={buttonVariants({ variant: "outline" })}>
    Manage members
  </a>
</ActionCard>;
```

`control-focus` draws a 2px neutral outline on `:focus-visible`: flush with bordered fields and offset 2px on buttons and links. It does not recolor the control border, apply a halo or override invalid states. Use it on custom native controls as well as shared components. Compound widgets can put the same `ring` color on the visible peer of the focused input, as in `ThemeSelector`. Do not reduce the indicator by lowering opacity: verify its rendered contrast against the surrounding surface in both themes.

### Contrast constraints

Keep the current token values. The light theme has three text combinations with relatively little contrast margin:

| Text / surface               | Recorded contrast |
| ---------------------------- | ----------------- |
| `muted-foreground` / `muted` | 4.82:1            |
| `primary` / `background`     | 4.67:1            |
| `primary` / `card`           | 4.89:1            |

Recheck these combinations before changing the light theme's background, card, or muted colors. The recorded ratios use browser-resolved sRGB colors; they are reference measurements, not a substitute for checking a changed surface.

Do not place small `text-primary` links on a full `bg-muted` surface in light mode: the contrast is approximately 4.29:1, below the 4.5:1 text requirement. This also applies to `bg-secondary`, which currently has the same light color. Check table stripes, selected navigation items, and tinted notices when adding links.

For a brand-colored link on a muted surface, scope the darker color to that link instead of changing the global tokens:

```tsx
<div className="bg-muted">
  <a href="/runs" className="text-primary-hover underline underline-offset-4 dark:text-primary">
    View runs
  </a>
</div>
```

This uses the existing light `primary-hover` value, `oklch(0.53 0.19 34)`, and retains `primary` in dark mode. Recheck this link if either token or the container background changes, including hover, focus, and visited states. Alternatives are `text-foreground` with an underline or a card/page background. These are local composition rules; do not globally darken `primary` or strengthen decorative borders to address them.

Disabled controls are exempt from the contrast requirement, but must still communicate that they are unavailable through behavior and visible state. Preserve native `disabled` behavior and the existing disabled styling.

Wrap the app in `TooltipProvider` before using tooltips. The stylesheet isolates the body stacking context so Base UI's portals remain above app content; avoid raising application wrappers above portals.

Use Base UI's `render` prop to compose triggers with Button. For navigation, apply `buttonVariants` to a real link so it retains link semantics. Pair inputs with Label and errors with `aria-invalid` and `aria-describedby`. Decorative Hugeicons use stroke width 2 and `aria-hidden="true"`; icon-only controls need accessible names.

The Tooltip wrapper supplies a stable popup ID, `role="tooltip"`, and the trigger's `aria-describedby`, which Base UI 1.9 does not supply. Keep this association when updating the generated component; the tooltip story checks the accessible description.

## Add a component

From the repository root:

```sh
bun run ui:add select
```

The CLI runs in this package and uses `components.json` to select Base UI, Hugeicons, and the shared source paths. Web also has a matching configuration for adding app-owned blocks from its directory. When reviewing generated components, import the named icon components from [`@kipivo/icons`](../icons/AGENTS.md). Keep the Hugeicons dependencies in that package.

Add examples and Storybook stories in `apps/storybook/src` for variants and disabled/loading/error states. See the [component stories guide](../../apps/storybook/README.md) for Controls, documentation, and browser checks. Verify with `bun run check`, `bun run build --filter=web`, `bun run build:storybook`, and `bun run test:ui`.
