import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@kipivo/ui/components/field";
import { Input } from "@kipivo/ui/components/input";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useId } from "react";
import { expect } from "storybook/test";

function ContactFields({ invalid }: { invalid: boolean }) {
  const id = useId();
  return (
    <FieldGroup className="max-w-sm">
      <Field data-invalid={invalid}>
        <FieldLabel htmlFor={id}>Work email</FieldLabel>
        <Input
          id={id}
          type="email"
          defaultValue={invalid ? "incomplete" : ""}
          aria-invalid={invalid}
          aria-describedby={`${id}-hint`}
        />
        {invalid ? (
          <FieldError id={`${id}-hint`}>Enter a valid email address.</FieldError>
        ) : (
          <FieldDescription id={`${id}-hint`}>Use your company email address.</FieldDescription>
        )}
      </Field>
      <FieldSeparator>Or</FieldSeparator>
      <Field>
        <FieldLabel htmlFor={`${id}-phone`}>Phone number</FieldLabel>
        <Input id={`${id}-phone`} type="tel" />
      </Field>
    </FieldGroup>
  );
}

const meta = {
  title: "Components/Field",
  component: ContactFields,
  tags: ["autodocs"],
  args: { invalid: false },
} satisfies Meta<typeof ContactFields>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Invalid: Story = {
  args: { invalid: true },
  play: async ({ canvas }) => {
    const email = canvas.getByRole("textbox", { name: "Work email" });
    await expect(email).toBeInvalid();
    await expect(email).toHaveAccessibleDescription("Enter a valid email address.");
  },
};
