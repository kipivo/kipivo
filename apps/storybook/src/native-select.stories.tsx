import { Field, FieldDescription, FieldLabel } from "@kipivo/ui/components/field";
import { NativeSelect, NativeSelectOption } from "@kipivo/ui/components/native-select";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useId } from "react";
import { expect } from "storybook/test";

function MenuLabelExample({ disabled }: { disabled: boolean }) {
  const id = useId();
  return (
    <Field className="w-fit" data-disabled={disabled}>
      <FieldLabel htmlFor={id}>Account menu label</FieldLabel>
      <NativeSelect id={id} disabled={disabled} aria-describedby={`${id}-help`} defaultValue="name">
        <NativeSelectOption value="name">Name</NativeSelectOption>
        <NativeSelectOption value="email">Email address</NativeSelectOption>
      </NativeSelect>
      <FieldDescription id={`${id}-help`}>Choose how your account is displayed.</FieldDescription>
    </Field>
  );
}

const meta = {
  title: "Components/Native Select",
  component: MenuLabelExample,
  tags: ["autodocs"],
  args: { disabled: false },
} satisfies Meta<typeof MenuLabelExample>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas, userEvent }) => {
    const select = canvas.getByRole("combobox", { name: "Account menu label" });
    await expect(select).toHaveAccessibleDescription("Choose how your account is displayed.");
    await userEvent.selectOptions(select, "email");
    await expect(select).toHaveValue("email");
  },
};
export const Disabled: Story = { args: { disabled: true } };
