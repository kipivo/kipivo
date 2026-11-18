import type { Meta, StoryObj } from "@storybook/react-vite";
import { LabelExample } from "./examples";
import { docsFor } from "./documentation";

const meta = {
  title: "Components/Label",
  component: LabelExample,
  tags: ["autodocs"],
  parameters: docsFor("label"),
  args: { label: "Project name" },
} satisfies Meta<typeof LabelExample>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
