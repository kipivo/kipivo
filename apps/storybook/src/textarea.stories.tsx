import type { Meta, StoryObj } from "@storybook/react-vite";
import { TextareaExample } from "./examples";
import { docsFor } from "./documentation";

const meta = {
  title: "Components/Textarea",
  component: TextareaExample,
  tags: ["autodocs"],
  parameters: docsFor("textarea"),
  args: {
    label: "Task description",
    placeholder: "Describe the checks to run",
    disabled: false,
    required: false,
    invalid: false,
  },
} satisfies Meta<typeof TextareaExample>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Invalid: Story = { args: { required: true, invalid: true } };
export const Disabled: Story = { args: { placeholder: "Waiting for runner", disabled: true } };
