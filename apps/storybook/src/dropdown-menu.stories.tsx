import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@kipivo/ui/components/dropdown-menu";
import { Button } from "@kipivo/ui/components/button";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";

const meta = {
  title: "Components/Dropdown menu",
  component: DropdownMenu,
  args: { onOpenChange: fn() },
} satisfies Meta<typeof DropdownMenu>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <DropdownMenu {...args}>
      <DropdownMenuTrigger render={<Button variant="outline" />}>Run actions</DropdownMenuTrigger>
      <DropdownMenuContent className="w-44">
        <DropdownMenuItem>View logs</DropdownMenuItem>
        <DropdownMenuItem disabled>Retry run</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive">Delete run</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
  play: async ({ canvas, canvasElement }) => {
    const trigger = canvas.getByRole("button", { name: "Run actions" });
    const body = within(canvasElement.ownerDocument.body);
    trigger.focus();
    await userEvent.keyboard("{ArrowDown}");
    await waitFor(() => expect(body.getByRole("menuitem", { name: "View logs" })).toHaveFocus());
    await userEvent.keyboard("{ArrowDown}");
    await expect(body.getByRole("menuitem", { name: "Retry run" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    await userEvent.keyboard("{ArrowDown}");
    await waitFor(() => expect(body.getByRole("menuitem", { name: "Delete run" })).toHaveFocus());
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(body.queryByRole("menu")).not.toBeInTheDocument());
    await waitFor(() => expect(trigger).toHaveFocus());
  },
};

export const Open: Story = { ...Default, args: { defaultOpen: true }, play: undefined };
