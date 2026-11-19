import { BackToTopButton } from "@kipivo/ui/components/back-to-top-button";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, waitFor } from "storybook/test";
import { docsFor } from "./documentation";

const meta = {
  title: "Components/Back to Top Button",
  component: BackToTopButton,
  tags: ["autodocs"],
  parameters: { ...docsFor("backToTopButton"), layout: "centered" },
  args: { onClick: fn() },
} satisfies Meta<typeof BackToTopButton>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ args, canvas, userEvent }) => {
    const button = canvas.getByRole("button", { name: "Back to top" });
    await userEvent.click(button);
    await expect(args.onClick).toHaveBeenCalled();
    await waitFor(() => expect(canvas.getByRole("button", { name: "Back to top" })).toBeVisible());
  },
};
