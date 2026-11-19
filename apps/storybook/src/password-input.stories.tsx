import { Label } from "@kipivo/ui/components/label";
import { PasswordInput } from "@kipivo/ui/components/password-input";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useId, type ComponentProps } from "react";
import { expect } from "storybook/test";
import { docsFor } from "./documentation";

function Example(props: ComponentProps<typeof PasswordInput>) {
  const id = useId();
  return (
    <div className="grid max-w-xs gap-2">
      <Label htmlFor={id}>Password</Label>
      <PasswordInput {...props} id={id} />
    </div>
  );
}

const meta = {
  title: "Components/Password Input",
  component: PasswordInput,
  tags: ["autodocs"],
  parameters: docsFor("passwordInput"),
  render: (args) => <Example {...args} />,
} satisfies Meta<typeof PasswordInput>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas, userEvent }) => {
    const input = canvas.getByLabelText("Password", { exact: true });
    await userEvent.type(input, "sample");
    await userEvent.click(canvas.getByRole("button", { name: "Show password" }));
    await expect(input).toHaveAttribute("type", "text");
    await userEvent.click(canvas.getByRole("button", { name: "Hide password" }));
    await expect(input).toHaveAttribute("type", "password");
    await expect(input).toHaveValue("sample");
  },
};
export const Disabled: Story = { args: { disabled: true } };
