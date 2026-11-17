import { Button } from "@kipivo/ui/components/button";
import type { Meta, StoryObj } from "@storybook/react-vite";

const meta = { title: "Foundations/Theme", parameters: { layout: "padded" } } satisfies Meta;
export default meta;

export const Palette: StoryObj<typeof meta> = {
  render: () => (
    <div className="mx-auto grid max-w-2xl gap-8 py-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Kipivo UI</h1>
        <p className="mt-2 text-muted-foreground">
          Neutral surfaces, coral actions, and amber accents across light and dark themes.
        </p>
      </div>
      <dl className="grid gap-4 sm:grid-cols-2">
        {[
          "background",
          "foreground",
          "primary",
          "primary-hover",
          "secondary",
          "muted",
          "accent",
          "destructive",
          "input",
          "ring",
        ].map((token) => (
          <div key={token} className="flex items-center gap-3">
            <span
              className="size-10 shrink-0 rounded-lg border border-border"
              style={{ backgroundColor: `var(--${token})` }}
              aria-hidden="true"
            />
            <dt className="text-sm font-medium">{token}</dt>
            <dd className="sr-only">Shared theme color</dd>
          </div>
        ))}
      </dl>
      <section aria-labelledby="chart-palette-title">
        <h2 id="chart-palette-title" className="mb-4 text-sm font-semibold">
          Chart palette
        </h2>
        <ul className="grid grid-cols-5 gap-3">
          {[1, 2, 3, 4, 5].map((index) => (
            <li key={index} className="grid gap-2 text-center text-xs text-muted-foreground">
              <span
                className="h-16 rounded-lg"
                style={{ backgroundColor: `var(--chart-${index})` }}
                aria-hidden="true"
              />
              <span>chart-{index}</span>
            </li>
          ))}
        </ul>
      </section>
      <div className="flex flex-wrap gap-3">
        <Button>Run checks</Button>
        <Button variant="outline">View logs</Button>
        <Button disabled>Waiting for runner</Button>
      </div>
      <p className="text-sm text-muted-foreground">
        Use the theme toolbar to compare light and dark appearances.
      </p>
    </div>
  ),
};
