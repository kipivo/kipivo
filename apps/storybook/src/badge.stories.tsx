import { Badge } from "@kipivo/ui/components/badge";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useId } from "react";
import { BadgeExample } from "./examples";
import { docsFor } from "./documentation";

const meta = {
  title: "Components/Badge",
  component: BadgeExample,
  tags: ["autodocs"],
  parameters: docsFor("badge"),
  args: { label: "Passed", variant: "secondary" },
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "secondary", "destructive", "outline", "ghost", "link"],
    },
  },
} satisfies Meta<typeof BadgeExample>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Passed: Story = {};
export const Running: Story = { args: { label: "Running", variant: "default" } };
export const Failed: Story = { args: { label: "Failed", variant: "destructive" } };

function LinkedBadge({ label, variant }: Parameters<typeof BadgeExample>[0]) {
  const detailsId = useId();

  return (
    <div className="grid max-w-xs gap-3">
      <Badge variant={variant} render={<a href={`#${detailsId}`} />}>
        {label}
      </Badge>
      <section id={detailsId} className="rounded-lg border p-3 text-sm" tabIndex={-1}>
        <h2 className="font-medium">Check details</h2>
        <p className="text-muted-foreground">Build and tests passed on the latest run.</p>
      </section>
    </div>
  );
}

export const WithLink: Story = {
  args: { label: "View 2 passed checks", variant: "outline" },
  render: (args) => <LinkedBadge {...args} />,
  parameters: {
    docs: {
      source: {
        code: `import { Badge } from "@kipivo/ui/components/badge";

<Badge variant="outline" render={<a href="#check-details" />}>
  View 2 passed checks
</Badge>`,
      },
    },
  },
};
