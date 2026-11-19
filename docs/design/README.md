# Kipivo workspace design guide

![Workbench in the light theme, with workspace navigation on the left and the current task, progress, and three-column task board on the right.](workbench.webp)

Run `bun run --cwd apps/web dev` from the repository root. Use the [Workbench](http://localhost:3000/workbench) to create and edit tasks. Guests and signed-in accounts each have their own board in the current browser. With the local runner active, open [Local runs](http://localhost:3000/runs) to submit a check and read its logs. The [Design guide](http://localhost:3000/design-guide) shows the workspace palette, type scale, and interaction patterns.

The workbench uses the Kipivo K mark, Geist, and the shared theme. The focus card shows the current task alongside board progress. The board groups tasks by stage. Moving a task to **Done** updates both the completed count and the progress bar.

Below the logs, a diagram traces the path of a run. Selecting a run sends a dot from the request to the local runner. Once the check finishes, the path extends to its exit code. Select **Replay** to see the path again. The assembly illustration on the homepage, in the design guide, and on the sign-in and sign-up pages opens once. Both illustrations show a static frame when the system requests reduced motion.

## Brand and theme

- Use the K mark from the repository. Preserve the proportions of the coral strokes and the amber dot in the upper right. When the mark appears beside the Kipivo name, use `Wordmark` so the text provides the accessible name.
- Use at most one prominent brand illustration per page. The homepage places it in the introduction and the workbench uses it in the focus card. The focus card echoes the assembly illustration with matte surfaces, a dark background, and an amber dot. Give logs, tables, and editing forms a solid background. [Focus card artwork](../../apps/web/src/features/workbench/assembly.webp)
- Calculate progress as completed tasks divided by total tasks. On desktop, show the percentage in 40 px type alongside the completed count. On mobile, put the count and progress bar on one line. An empty board prompts the user to create a task. Show progress once the first task exists. Give decorative images empty alt text.

### Color by role

| Role                | Colors or tokens                                 | Usage                                                                                                                                  |
| ------------------- | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| Brand               | Coral `#FF6B4A`, Amber `#FFB02E`                 | Use the same colors for the K mark and illustrations in both themes.                                                                   |
| Page and content    | `background`, `card`, `foreground`               | Warm white or charcoal page background, distinct card surfaces, and primary text.                                                      |
| Supporting content  | `muted`, `muted-foreground`                      | Board column backgrounds, timestamps, descriptions, and secondary navigation.                                                          |
| Primary actions     | `primary`, `primary-foreground`, `primary-hover` | Use filled buttons for create and save actions, an outline for cancel, and a transparent background for the add button in each column. |
| Boundaries          | `border`, `input`, `ring`                        | Dividers, input borders, and keyboard focus indicators, respectively.                                                                  |
| Errors and deletion | `destructive`                                    | Field errors, failed runs, delete actions, and deletion confirmations.                                                                 |
| Success             | `--color-workspace-success`                      | Use `#236649` in light mode and `#89D1AD` in dark mode for the Done checkmark and the Passed status dot.                               |
| Fixed dark surfaces | `--color-plate`, `--color-on-plate`              | The focus card and log area use `#151516` and `#FFFAF4` in both themes.                                                                |

Workspace pages and their editors share the same action colors. In light mode, buttons use an ink-gray background (`#343A36`) with warm white text (`#FAF9F5`). The background darkens to `#282E2A` on hover. In dark mode, buttons use a warm gray background (`#D6D1C7`) with dark text (`#242722`). The background lightens to `#E5E0D6` on hover. Selected navigation items use a subtle gray background. The progress bar distinguishes its completed portion by lightness.

Shared CSS custom properties use the `--` prefix. In Tailwind, use semantic utilities such as `bg-card` and `text-foreground`. The web app defaults to dark mode and offers **Light**, **Dark**, and **System**. Dialogs and menus use the page theme.

Target a contrast ratio of 4.5:1 for body text against its background and 3:1 for control boundaries and focus indicators. The workspace palette is in **Design guide**. The shared theme is in Storybook under **Foundations → Theme**. [Shared colors](../../packages/ui/src/styles/globals.css) · [Contrast checks](../../packages/ui/README.md#contrast-constraints)

## Typography and layout

| Role                       | Size / line height and weight                  | Usage                                                                                                                                  |
| -------------------------- | ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Workspace page title       | 28–36 px / 1.07, weight 650                    | Use one `h1` per page. On the workbench, align the title with **New task**. The text below explains that the browser stores the tasks. |
| Current task               | 22–30 px / 1.08, weight 555                    | Limit titles to two lines in the focus card and task cards. Show the full title in the editor.                                         |
| Section heading            | 20 / 26 px, weight 620                         | Task board, run history, and log output.                                                                                               |
| Task names and form labels | 14 / 21 px, weight about 600                   | Name the object or action on one line. Put longer instructions in a separate paragraph.                                                |
| Body text and task notes   | 14 / 21 px and 13 / 20 px                      | Show up to two lines of notes on a card. Show the full notes in the editor.                                                            |
| Identifiers and logs       | 12–13 px monospace, 21 px line height for logs | IDs, timestamps, commands, and raw output. Use tabular numerals for percentages.                                                       |

Use self-hosted Geist for Latin text. For Chinese text, fall back to PingFang SC, Microsoft YaHei, and the system font. Use natural letter spacing for Chinese paragraphs. Workspace pages use compact headings. The homepage uses `PageTitle scale="display"` for its main heading.

Give the header and page content the same horizontal padding. Align the left edge of the page title with the sidebar toggle on desktop and the workspace name on mobile. Leave 24 px below the page title on desktop and 16 px on mobile. Separate the workbench summary from the board by 32 px on desktop and 20 px on mobile. Panel padding scales from 16 px on mobile to 24 px on desktop. Use an 8 px corner radius for navigation items and action buttons, 10 px for task cards and run entries, and 16 px for outer panels.

Below a viewport width of 768 px, navigation moves to the bottom. On the design guide page, **More** stays selected and its menu marks the current page with a checkmark. Column layouts use the content width available after accounting for the sidebar and padding.

| Available content width | Workbench and local runs                                                                                                                 |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Above 44 rem            | Show the three board stages side by side. Allocate space to run history and output in a 1:2.1 ratio, with at least 17.5 rem for history. |
| 34–44 rem               | Stack the board stages and run panels vertically. Keep the focus card and progress side by side.                                         |
| At or below 34 rem      | Show progress in a single row below the focus card. At or below 29 rem, task cards within each stage also use a single column.           |

When the run history list is narrower than 28 rem, show the name and status on the first line and the short ID and UTC time on the second. At 28 rem and above, show all four on one line. The palette uses six, three, or two columns according to the panel width. Images and run diagrams scale to fit their containers while preserving their aspect ratios.

## Components and interaction states

On desktop, the header toggle switches between the full sidebar and a 4 rem icon rail. When the user toggles it, the sidebar width and content position transition together over 200 ms. Labels fade over 120 ms. Apply the layout immediately when restoring a preference on reload or when reduced motion is enabled. Zustand stores the preference in the current browser and carries it across workspace pages. Mobile uses bottom navigation.

The expanded desktop sidebar is 184–224 px wide. The workspace header shows the sidebar toggle, theme icon, and workspace name from left to right. Select the moon for dark mode or the sun for light mode. When following the system theme, the first click switches to the opposite of the current appearance and saves that choice. The account button at the bottom of the sidebar shows the avatar and display name and opens its menu upward. On mobile, place the theme icon and avatar side by side in the header with touch targets of at least 44 × 44 px. Signed-in users can open **Settings** from the account menu to display their name or email address.

The **New task** button beside the workbench title is 36 px high on desktop, with 12 px horizontal padding and 14 px text. On touchscreens, use a minimum height of 44 px and 16 px horizontal padding. The **Open workbench** button in the homepage introduction is 44 px high.

Use the same light keyboard focus ring for **Edit task** on the dark focus card and **Replay** in the log area.

| State or interaction           | Appearance and behavior                                                                                                                                                                                                                                                 |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Default, hover, and selected   | Primary buttons use `primary-hover` on hover. Card borders darken on hover. The current navigation item changes background and font weight and sets `aria-current`.                                                                                                     |
| Keyboard and touch             | Use the shared 2 px `control-focus` ring and a light ring on fixed dark surfaces. Give icon buttons accessible action names. Touch targets are at least 44 × 44 px.                                                                                                     |
| Create and edit                | The plus button opens quick entry in its own column and becomes a close button. Open the editor on the right on desktop and in a centered dialog on mobile. Escape closes it. If the original card moves to another column or is deleted, return focus to **New task**. |
| Submitting                     | Keep the button width stable, use an in-progress verb for its label, and set `disabled` and `aria-busy`. Confirm a successful save near the action.                                                                                                                     |
| Empty                          | Offer **New task** and quick entry in each column. Show the startup command until the runner connects, then offer the first check. When all tasks are complete, the focus card reads **All caught up.**                                                                 |
| Errors and destructive actions | Place actionable errors beside the field and associate them with the input. Preserve user input after storage or network errors. For deletion, name the item, explain the consequence, and ask for confirmation.                                                        |
| Motion                         | Use short transitions for color and panel changes. With reduced motion enabled, show state changes immediately. Bottom bars and dialogs respect the device safe area and visible viewport height.                                                                       |

Task stages use a dashed circle for **To do**, a half-filled circle that adapts to the theme for **In progress**, and a filled circle with a checkmark for **Done**. Run history uses a dashed circle for **Queued**, a half-filled circle for **Running**, a filled circle for **Passed**, and a diamond for **Failed**. Show **Pending** for the exit code while a run is queued or running. Keep the exit code and raw logs in the same panel so a reader can investigate a failure.

## Applying the guide across the project

| Page                        | Actions and layout                                                                                                                                                                                                |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Homepage                    | Use the K mark and assembly illustration. Give **Open workbench** prominence in the introduction. Align the example run and quickstart with the main content.                                                     |
| Sign-in, sign-up, and setup | Use a narrow form, visible labels and the theme selector in the upper right. Sign-in and sign-up use a two-column card with the brand image from 768 px upward and a single column below.                         |
| Settings and administration | Use `OperationPage`. Save settings groups independently. Put search above the account directory and start role changes from the corresponding account.                                                            |
| Workbench and local runs    | Group tasks by stage and show progress. The local runs page shows the startup command, the action to submit a check, or run history and logs according to the connection and run state.                           |
| Expo connection screen      | Use native font scaling and touch controls. Present the connection address, the check result, and **Open workspace** in that order. Map the color roles in this guide to the native theme when sharing a palette. |

Import web components from `@kipivo/ui`. Keep page layouts and illustrations with their feature. Promote a color or other design value to a shared semantic token once a second feature needs it. [UI component guide](../../packages/ui/README.md) · [Tailwind theme](../../apps/web/src/styles/globals.css) · [Theme transition](../../apps/web/src/styles/theme-transition.css) · [Workspace routes](../../apps/web/src/routes/_app/) · [Native theme](../../apps/mobile/src/components/theme.ts)
