import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@kipivo/ui/components/dialog";
import { Button } from "@kipivo/ui/components/button";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";

const meta = { title: "Components/Dialog", component: Dialog } satisfies Meta<typeof Dialog>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <Dialog {...args}>
      <DialogTrigger render={<Button variant="outline" />}>Delete run</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete this run?</DialogTitle>
          <DialogDescription>
            This removes the run and its saved logs. You cannot undo this action.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
          <DialogClose render={<Button variant="destructive" />}>Delete run</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
  play: async ({ canvas, canvasElement }) => {
    const trigger = canvas.getByRole("button", { name: "Delete run" });
    const body = within(canvasElement.ownerDocument.body);
    await userEvent.click(trigger);
    const dialog = await body.findByRole("dialog", { name: "Delete this run?" });
    await expect(dialog).toHaveAccessibleDescription(
      "This removes the run and its saved logs. You cannot undo this action.",
    );
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(body.queryByRole("dialog")).not.toBeInTheDocument());
    await expect(trigger).toHaveFocus();
    await userEvent.click(trigger);
    await userEvent.click(await body.findByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(body.queryByRole("dialog")).not.toBeInTheDocument());
  },
};

export const Open: Story = { ...Default, args: { defaultOpen: true }, play: undefined };
