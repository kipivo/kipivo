import { PlusIcon } from "@kipivo/icons";
import { Button } from "@kipivo/ui/components/button";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect } from "storybook/test";
import { ButtonExample } from "./examples";
import { docsFor } from "./documentation";

const meta = {
  title: "Components/Button",
  component: ButtonExample,
  tags: ["autodocs"],
  parameters: docsFor("button"),
  args: {
    label: "Run checks",
    variant: "default",
    size: "default",
    disabled: false,
    loading: false,
  },
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "secondary", "outline", "ghost", "destructive", "link"],
    },
    size: { control: "select", options: ["xs", "sm", "default", "lg"] },
  },
} satisfies Meta<typeof ButtonExample>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {};
export const Secondary: Story = { args: { label: "View logs", variant: "secondary" } };
export const Outline: Story = { args: { label: "View logs", variant: "outline" } };
export const Ghost: Story = { args: { label: "View logs", variant: "ghost" } };
export const Destructive: Story = { args: { label: "Delete run", variant: "destructive" } };
export const Link: Story = { args: { label: "View logs", variant: "link" } };
export const Disabled: Story = { args: { label: "Waiting for runner", disabled: true } };
export const Loading: Story = { args: { loading: true } };

function SizeComparison() {
  const sizes = ["xs", "sm", "default", "lg"] as const;
  const [selectedSize, setSelectedSize] = useState<(typeof sizes)[number]>();

  return (
    <div className="grid justify-items-center gap-4">
      <div className="flex flex-wrap items-end justify-center gap-3">
        {sizes.map((size) => (
          <Button key={size} size={size} variant="outline" onClick={() => setSelectedSize(size)}>
            {size}
          </Button>
        ))}
      </div>
      <p role="status" className="text-xs text-muted-foreground">
        {selectedSize ? `Selected size: ${selectedSize}.` : "Select a button to try its size."}
      </p>
    </div>
  );
}

export const Sizes: Story = {
  render: () => <SizeComparison />,
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: `import { Button } from "@kipivo/ui/components/button";

<Button size="xs">Extra small</Button>
<Button size="sm">Small</Button>
<Button size="default">Default</Button>
<Button size="lg">Large</Button>`,
      },
    },
  },
};

function IconAction() {
  const [queued, setQueued] = useState(0);

  return (
    <div className="grid justify-items-center gap-4">
      <Button
        size="icon"
        variant="outline"
        aria-label="Queue a check"
        onClick={() => setQueued((count) => count + 1)}
      >
        <PlusIcon aria-hidden="true" />
      </Button>
      <p role="status" className="text-xs text-muted-foreground">
        {queued === 0
          ? "No checks queued."
          : `${queued} ${queued === 1 ? "check" : "checks"} queued.`}
      </p>
    </div>
  );
}

export const IconOnly: Story = {
  render: () => <IconAction />,
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: `import { PlusIcon } from "@kipivo/icons";
import { Button } from "@kipivo/ui/components/button";

<Button size="icon" variant="outline" aria-label="Queue a check" onClick={queueCheck}>
  <PlusIcon aria-hidden="true" />
</Button>`,
      },
    },
  },
  play: async ({ canvas, userEvent }) => {
    const button = canvas.getByRole("button", { name: "Queue a check" });
    await userEvent.tab();
    await expect(button).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await expect(canvas.getByRole("status")).toHaveTextContent("1 check queued.");
  },
};
