import { Input } from "@kipivo/ui/components/input";
import { Label } from "@kipivo/ui/components/label";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useId } from "react";
import { expect, userEvent } from "storybook/test";

const meta = {
  title: "Components/Label",
  component: Label,
  render: function Render() {
    const id = useId();
    return (
      <div className="grid w-72 max-w-full gap-2">
        <Label htmlFor={id}>Project name</Label>
        <Input id={id} defaultValue="Kipivo" />
      </div>
    );
  },
} satisfies Meta<typeof Label>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByText("Project name"));
    await expect(canvas.getByRole("textbox", { name: "Project name" })).toHaveFocus();
  },
};
