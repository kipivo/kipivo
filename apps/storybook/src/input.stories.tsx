import { Input } from "@kipivo/ui/components/input";
import { Label } from "@kipivo/ui/components/label";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useId } from "react";
import { expect, userEvent } from "storybook/test";

const meta = {
  title: "Components/Input",
  component: Input,
  args: { placeholder: "e.g. Verify the API" },
  render: function Render(args) {
    const id = useId();
    return (
      <div className="grid w-72 max-w-full gap-2">
        <Label htmlFor={id}>Task name</Label>
        <Input
          {...args}
          id={id}
          aria-describedby={args["aria-invalid"] ? `${id}-error` : undefined}
        />
        {args["aria-invalid"] && (
          <p id={`${id}-error`} className="text-sm text-destructive">
            Enter a task name.
          </p>
        )}
      </div>
    );
  },
} satisfies Meta<typeof Input>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    const input = canvas.getByRole("textbox", { name: "Task name" });
    await userEvent.type(input, "Verify the API");
    await expect(input).toHaveValue("Verify the API");
  },
};
export const Disabled: Story = { args: { disabled: true, defaultValue: "Verify the API" } };
export const Invalid: Story = { args: { "aria-invalid": true } };
