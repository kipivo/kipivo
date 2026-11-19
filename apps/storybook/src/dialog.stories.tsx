import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, waitFor, within } from "storybook/test";
import { Button } from "@kipivo/ui/components/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@kipivo/ui/components/dialog";
import { DialogExample } from "./examples";
import { docsFor } from "./documentation";

const meta = {
  title: "Components/Dialog",
  component: DialogExample,
  tags: ["autodocs"],
  parameters: docsFor("dialog"),
  args: {
    title: "Delete this run?",
    description: "This removes the run and its saved logs. You cannot undo this action.",
  },
} satisfies Meta<typeof DialogExample>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Drawer: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" />}>Open navigation</DialogTrigger>
      <DialogContent presentation="drawer">
        <DialogTitle>On this page</DialogTitle>
      </DialogContent>
    </Dialog>
  ),
  play: async ({ canvas, canvasElement, userEvent }) => {
    const trigger = canvas.getByRole("button", { name: "Open navigation" });
    await userEvent.click(trigger);
    const body = canvasElement.ownerDocument.body;
    const drawer = await within(body).findByRole("dialog", { name: "On this page" });
    const backdrop = body.querySelector('[data-slot="dialog-overlay"]');
    await expect(drawer).toHaveStyle({ opacity: "1" });
    await expect(backdrop).toHaveStyle({
      backdropFilter: "none",
      animationDuration: getComputedStyle(drawer).animationDuration,
      animationFillMode: "both",
    });
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(trigger).toHaveFocus());
  },
};

export const ConfirmDeletion: Story = {
  play: async ({ args, canvas, canvasElement, userEvent }) => {
    const trigger = canvas.getByRole("button", { name: "Delete run" });
    const body = within(canvasElement.ownerDocument.body);

    await userEvent.click(trigger);
    const dialog = await body.findByRole("dialog", { name: args.title });
    await expect(dialog).toHaveAccessibleDescription(args.description);
    await userEvent.click(within(dialog).getByRole("button", { name: /^Delete run$/ }));
    await waitFor(() => expect(dialog).not.toBeVisible());
    await expect(trigger).toHaveFocus();
    await expect(canvas.getByRole("status")).toHaveTextContent("Example run deleted.");
  },
};

export const DetailPanel: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" />}>Inspect task</DialogTrigger>
      <DialogContent presentation="detail">
        <DialogHeader>
          <DialogTitle>Task details</DialogTitle>
          <DialogDescription>Review the mobile login flow.</DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  ),
  play: async ({ canvas, canvasElement, userEvent }) => {
    const trigger = canvas.getByRole("button", { name: "Inspect task" });
    await userEvent.click(trigger);
    const dialog = await within(canvasElement.ownerDocument.body).findByRole("dialog", {
      name: "Task details",
    });
    await expect(dialog).toBeVisible();
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(trigger).toHaveFocus());
  },
};
