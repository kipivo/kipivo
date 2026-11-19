import { Field, FieldLabel } from "@kipivo/ui/components/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@kipivo/ui/components/select";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useId } from "react";
import { expect, waitFor, within } from "storybook/test";

const items = [
  { value: "name", label: "Name" },
  { value: "email", label: "Email address" },
];
function SelectExample({ disabled }: { disabled: boolean }) {
  const id = useId();
  return (
    <Field className="w-fit">
      <FieldLabel htmlFor={id}>Account menu label</FieldLabel>
      <Select items={items} defaultValue="name" disabled={disabled}>
        <SelectTrigger id={id} className="min-w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {items.map(({ label, value }) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </Field>
  );
}
const meta = {
  title: "Components/Select",
  component: SelectExample,
  tags: ["autodocs"],
  args: { disabled: false },
} satisfies Meta<typeof SelectExample>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {
  play: async ({ canvas, canvasElement, userEvent }) => {
    const trigger = canvas.getByRole("combobox", { name: "Account menu label" });
    const body = within(canvasElement.ownerDocument.body);
    await expect(trigger).toHaveTextContent("Name");
    trigger.focus();
    await userEvent.keyboard("{Enter}");
    const selected = await body.findByRole("option", { name: /^Name$/ });
    await waitFor(() => expect(selected).toHaveFocus());
    await userEvent.keyboard("{ArrowDown}");
    const email = body.getByRole("option", { name: "Email address" });
    await waitFor(() => expect(email).toHaveFocus());
    await userEvent.keyboard("{Enter}");
    await waitFor(async () => {
      await expect(trigger).toHaveTextContent("Email address");
      await expect(trigger).toHaveFocus();
    });
  },
};
export const Disabled: Story = { args: { disabled: true } };
