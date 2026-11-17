import { Textarea } from "@kipivo/ui/components/textarea";
import { Label } from "@kipivo/ui/components/label";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useId } from "react";

const meta = {
  title: "Components/Textarea",
  component: Textarea,
  args: { placeholder: "Describe what the bot should do.", rows: 4 },
  render: function Render(args) {
    const id = useId();
    return (
      <div className="grid w-72 max-w-full gap-2">
        <Label htmlFor={id}>Instructions</Label>
        <Textarea
          {...args}
          id={id}
          aria-describedby={args["aria-invalid"] ? `${id}-error` : undefined}
        />
        {args["aria-invalid"] && (
          <p id={`${id}-error`} className="text-sm text-destructive">
            Enter instructions for this task.
          </p>
        )}
      </div>
    );
  },
} satisfies Meta<typeof Textarea>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Disabled: Story = {
  args: { disabled: true, defaultValue: "Run the project checks." },
};
export const Invalid: Story = { args: { "aria-invalid": true } };
