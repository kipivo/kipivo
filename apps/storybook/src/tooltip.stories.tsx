import { Tooltip, TooltipContent, TooltipTrigger } from "@kipivo/ui/components/tooltip";
import { Button } from "@kipivo/ui/components/button";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";

const meta = { title: "Components/Tooltip", component: Tooltip } satisfies Meta<typeof Tooltip>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <Tooltip {...args}>
      <TooltipTrigger render={<Button variant="outline" />}>Run checks</TooltipTrigger>
      <TooltipContent>Run the project's configured checks.</TooltipContent>
    </Tooltip>
  ),
  play: async ({ canvas, canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    await userEvent.hover(canvas.getByRole("button", { name: "Run checks" }));
    await expect(await body.findByRole("tooltip")).toHaveTextContent(
      "Run the project's configured checks.",
    );
    await expect(canvas.getByRole("button", { name: "Run checks" })).toHaveAccessibleDescription(
      "Run the project's configured checks.",
    );
    await userEvent.unhover(canvas.getByRole("button", { name: "Run checks" }));
    await waitFor(() => expect(body.queryByRole("tooltip")).not.toBeInTheDocument());
  },
};

export const Open: Story = { ...Default, args: { defaultOpen: true }, play: undefined };
