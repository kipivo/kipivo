import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { InputExample } from "./examples";
import { docsFor } from "./documentation";

const meta = {
  title: "Components/Input",
  component: InputExample,
  tags: ["autodocs"],
  parameters: docsFor("input"),
  args: {
    label: "Task name",
    placeholder: "Check the project",
    disabled: false,
    required: false,
    invalid: false,
  },
} satisfies Meta<typeof InputExample>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Invalid: Story = { args: { required: true, invalid: true } };
export const Disabled: Story = { args: { placeholder: "Waiting for runner", disabled: true } };

export const WithHelpText: Story = {
  args: {
    description: "Use a short name that teammates can recognize in the run history.",
  },
  parameters: {
    docs: {
      source: {
        code: `import { Input } from "@kipivo/ui/components/input";
import { Label } from "@kipivo/ui/components/label";

<Label htmlFor="task-name">Task name</Label>
<Input id="task-name" aria-describedby="task-name-help" />
<p id="task-name-help">Use a short name that teammates can recognize in the run history.</p>`,
      },
    },
  },
  play: async ({ args, canvas, userEvent }) => {
    const label = args.label ?? "Task name";
    const field = canvas.getByRole("textbox", { name: label });
    await userEvent.click(canvas.getByText(label, { exact: true }));
    await expect(field).toHaveFocus();
    await expect(field).toHaveAccessibleDescription(args.description);
  },
};
