import { DashboardIcon, TerminalIcon } from "@kipivo/icons";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@kipivo/ui/components/sidebar";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect } from "storybook/test";
import { docsFor } from "./documentation";

const items = [
  { label: "Workbench", href: "#workbench", icon: DashboardIcon },
  { label: "Local runs", href: "#runs", icon: TerminalIcon },
];

function Example() {
  const [current, setCurrent] = useState("#workbench");
  return (
    <nav aria-label="Workspace" className="max-w-56">
      <SidebarMenu>
        {items.map(({ label, href, icon: Icon }) => (
          <SidebarMenuItem key={href}>
            <SidebarMenuButton
              render={
                <a
                  href={href}
                  onClick={(event) => {
                    event.preventDefault();
                    setCurrent(href);
                  }}
                />
              }
              isActive={current === href}
              aria-current={current === href ? "page" : undefined}
            >
              <Icon aria-hidden="true" />
              <span>{label}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </nav>
  );
}

const meta = {
  title: "Components/Sidebar Menu",
  component: SidebarMenu,
  tags: ["autodocs"],
  parameters: docsFor("sidebarMenu"),
  render: () => <Example />,
} satisfies Meta<typeof SidebarMenu>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas, userEvent }) => {
    const workbench = canvas.getByRole("link", { name: "Workbench" });
    const runs = canvas.getByRole("link", { name: "Local runs" });
    await expect(workbench).toHaveAttribute("aria-current", "page");
    workbench.focus();
    await userEvent.tab();
    await expect(runs).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await expect(runs).toHaveAttribute("aria-current", "page");
    await expect(runs).toHaveAttribute("data-active");
    await expect(workbench).not.toHaveAttribute("data-active");
  },
};
