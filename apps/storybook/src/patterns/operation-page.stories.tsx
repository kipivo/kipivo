import { OperationPage } from "@kipivo/ui/blocks/operation-page";
import { Button } from "@kipivo/ui/components/button";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";

const meta = {
  title: "Patterns/Operation Page",
  component: OperationPage,
  parameters: { layout: "fullscreen" },
  args: {
    title: "Local runs",
    description: "Start a project check or select a previous run to inspect its output.",
    children: <p className="text-sm text-muted-foreground">No runs yet.</p>,
  },
} satisfies Meta<typeof OperationPage>;
export default meta;
type Story = StoryObj<typeof meta>;

export const WithAction: Story = {
  args: { action: <Button type="button">Run checks</Button> },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("main")).toContainElement(
      canvas.getByRole("heading", { level: 1, name: "Local runs" }),
    );
    await expect(canvas.getByRole("button", { name: "Run checks" })).toBeVisible();
  },
};
export const WithoutAction: Story = {
  args: {
    title: "Accounts",
    description: "Find a teammate and review or change their role.",
    children: <p className="text-sm text-muted-foreground">No accounts match your search.</p>,
  },
};
