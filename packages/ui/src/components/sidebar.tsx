import type * as React from "react";
import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cn } from "cn";

function SidebarMenu({ className, ...props }: React.ComponentProps<"ul">) {
  return (
    <ul
      data-slot="sidebar-menu"
      data-sidebar="menu"
      className={cn("flex w-full min-w-0 flex-col gap-1", className)}
      {...props}
    />
  );
}

function SidebarMenuItem({ className, ...props }: React.ComponentProps<"li">) {
  return (
    <li
      data-slot="sidebar-menu-item"
      data-sidebar="menu-item"
      className={cn("group/menu-item relative", className)}
      {...props}
    />
  );
}

function SidebarMenuButton({
  render,
  isActive = false,
  className,
  ...props
}: useRender.ComponentProps<"button"> & { isActive?: boolean }) {
  return useRender({
    defaultTagName: "button",
    render,
    state: { slot: "sidebar-menu-button", sidebar: "menu-button", active: isActive },
    props: mergeProps<"button">(
      {
        className: cn(
          "peer/menu-button control-focus flex min-h-10.5 w-full min-w-0 items-center gap-2 overflow-hidden rounded-lg px-3 py-2 text-left text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-50 data-active:bg-[var(--sidebar-accent,var(--muted))] data-active:font-semibold data-active:text-foreground pointer-coarse:min-h-11 [&_svg]:size-4.5 [&_svg]:shrink-0 [&>span:last-child]:truncate",
          className,
        ),
      },
      props,
    ),
  });
}

export { SidebarMenu, SidebarMenuButton, SidebarMenuItem };
