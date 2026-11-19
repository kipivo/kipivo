import { ActionCard } from "@kipivo/ui/blocks/action-card";
import { Button, buttonVariants } from "@kipivo/ui/components/button";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect } from "storybook/test";

function ConnectionCheck() {
  const [checked, setChecked] = useState(false);

  return (
    <div className="grid justify-items-start gap-2">
      <Button type="button" variant="outline" onClick={() => setChecked(true)}>
        Test runner connection
      </Button>
      <p role="status" className="text-sm text-muted-foreground">
        {checked ? "Demo runner is connected." : "Connection not checked."}
      </p>
    </div>
  );
}

const meta = {
  title: "Patterns/Action Card",
  component: ActionCard,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="max-w-sm">
        <Story />
      </div>
    ),
  ],
  argTypes: { children: { control: false } },
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Introduce a management destination or action with a level-two heading and a short description. Only the supplied action is interactive: use a link to navigate or a button to perform an action in place.",
      },
    },
  },
} satisfies Meta<typeof ActionCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Destination: Story = {
  args: {
    title: "Workspace members",
    description: "Review who has access to this workspace and what they can do.",
    children: (
      <a href="#action-card-member-directory" className={buttonVariants({ variant: "outline" })}>
        Manage members
      </a>
    ),
  },
  render: (args) => (
    <div className="grid gap-6">
      <ActionCard {...args} />
      <h2 id="action-card-member-directory" tabIndex={-1} className="font-medium control-focus">
        Member directory
      </h2>
    </div>
  ),
};

export const Action: Story = {
  args: {
    title: "Local runner",
    description: "Check whether Kipivo can reach your runner.",
    children: <ConnectionCheck />,
  },
};

export const KeyboardAction: Story = {
  ...Action,
  tags: ["!autodocs"],
  play: async ({ canvas, userEvent }) => {
    const button = canvas.getByRole("button", { name: "Test runner connection" });
    const status = canvas.getByRole("status");

    await userEvent.click(canvas.getByRole("heading", { name: "Local runner" }));
    await expect(status).toHaveTextContent("Connection not checked.");
    await userEvent.tab();
    await expect(button).toHaveFocus();
    await userEvent.keyboard(" ");
    await expect(status).toHaveTextContent("Demo runner is connected.");
  },
};
