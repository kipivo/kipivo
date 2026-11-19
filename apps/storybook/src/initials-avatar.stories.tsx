import { InitialsAvatar } from "@kipivo/ui/components/initials-avatar";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { docsFor } from "./documentation";

const meta = {
  title: "Components/Initials Avatar",
  component: InitialsAvatar,
  tags: ["autodocs"],
  parameters: docsFor("initialsAvatar"),
  args: { name: "Ada Lovelace" },
  render: ({ name }) => (
    <div className="flex items-center gap-2">
      <InitialsAvatar name={name} />
      <span>{name || "Unknown user"}</span>
    </div>
  ),
} satisfies Meta<typeof InitialsAvatar>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const EmptyName: Story = { args: { name: "" } };
