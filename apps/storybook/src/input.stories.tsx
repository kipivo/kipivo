import type { Meta, StoryObj } from "@storybook/react-vite";
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
