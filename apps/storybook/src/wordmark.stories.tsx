import type { Meta, StoryObj } from "@storybook/react-vite";
import { WordmarkExample } from "./examples";
import { docsFor } from "./documentation";

const meta = {
  title: "Foundations/Wordmark",
  component: WordmarkExample,
  tags: ["autodocs"],
  parameters: docsFor("wordmark"),
  args: { name: "Kipivo" },
} satisfies Meta<typeof WordmarkExample>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
