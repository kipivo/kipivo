import { Wordmark } from "@kipivo/ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import logo from "../../../assets/logo.svg?no-inline";

const meta = {
  title: "Foundations/Wordmark",
  component: Wordmark,
  args: { name: "Kipivo", logo },
} satisfies Meta<typeof Wordmark>;
export default meta;
export const Default: StoryObj<typeof meta> = {};
