import {
  BookBookmarkIcon,
  BookOpenIcon,
  CheckIcon,
  DashboardIcon,
  HomeIcon,
  MoreHorizontalIcon,
  SettingsIcon,
  ShieldUserIcon,
  TerminalIcon,
  type IconComponent,
} from "@kipivo/icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@kipivo/ui/components/dropdown-menu";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@kipivo/ui/components/sidebar";
import { cn } from "@kipivo/ui/lib/utils";
import { Link, useHydrated, useMatch } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useAccountSession } from "@/features/account/session";

function WorkspaceMenuGroup({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("max-md:contents", className)}>
      <p
        className="mb-2 hidden h-[1.5em] overflow-hidden px-2.5 text-[11px]/normal font-semibold tracking-[0.055em]
        whitespace-nowrap text-muted-foreground uppercase md:block sidebar-collapsed:invisible
        sidebar-collapsed:mb-0 sidebar-collapsed:h-0 sidebar-collapsed:opacity-0
        motion-safe:[transition:height_var(--sidebar-slide,0s),margin-bottom_var(--sidebar-slide,0s),opacity_var(--sidebar-fade,0s),visibility_var(--sidebar-fade,0s)]"
      >
        {label}
      </p>
      <SidebarMenu className="max-md:contents" aria-label={label}>
        {children}
      </SidebarMenu>
    </div>
  );
}

const menuButtonClass =
  "max-md:min-h-12 max-md:flex-col max-md:justify-center max-md:gap-1 max-md:p-1 max-md:text-[11px] sidebar-collapsed:px-3.5 motion-safe:[transition:background-color_140ms_ease-out,color_140ms_ease-out,padding_var(--sidebar-slide,0s)]";

function Destination({
  to,
  label,
  icon: Icon,
  hash,
  compactLabel,
}: {
  compactLabel?: string;
  hash?: string;
  to: "/" | "/workbench" | "/runs" | "/settings" | "/admin" | "/design-guide";
  label: string;
  icon: IconComponent;
}) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        className={menuButtonClass}
        aria-label={label}
        title={label}
        render={
          <Link
            to={to}
            hash={hash}
            activeOptions={{ exact: to !== "/admin", includeHash: !!hash }}
            activeProps={{ "data-active": "" }}
          />
        }
      >
        <Icon strokeWidth={1.7} aria-hidden="true" />
        {compactLabel && <span className="md:hidden">{compactLabel}</span>}
        <span className={cn("sidebar-label", compactLabel && "hidden md:inline")}>{label}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

export function WorkspaceNav() {
  const hydrated = useHydrated();
  const { session } = useAccountSession();
  const inDesignGuide = useMatch({
    from: "/_app/design-guide",
    shouldThrow: false,
    select: () => true,
  });
  return (
    <nav
      aria-label="Workspace"
      className="fixed inset-x-0 bottom-0 z-5 grid auto-cols-fr grid-flow-col border-t bg-card px-2.5 pt-[5px]
        pb-[calc(5px+env(safe-area-inset-bottom))] md:static md:z-auto md:mt-9 md:block md:border-0
        md:bg-transparent md:p-0 sidebar-collapsed:mt-5 motion-safe:[transition:margin-top_var(--sidebar-slide,0s)]"
    >
      <WorkspaceMenuGroup label="Workspace">
        <Destination to="/workbench" label="Workbench" icon={DashboardIcon} />
        {import.meta.env.DEV && <Destination to="/runs" label="Local runs" icon={TerminalIcon} />}
        {session.status === "signed-in" && (
          <Destination to="/settings" label="Settings" icon={SettingsIcon} />
        )}
        {session.status === "signed-in" &&
          session.account.permissions.includes("accounts.read") && (
            <Destination
              to="/admin"
              label="Administration"
              compactLabel="Admin"
              icon={ShieldUserIcon}
            />
          )}
        <SidebarMenuItem className="md:hidden">
          <DropdownMenu>
            <DropdownMenuTrigger
              disabled={!hydrated}
              render={<SidebarMenuButton className={menuButtonClass} isActive={inDesignGuide} />}
              aria-label={
                inDesignGuide
                  ? "More destinations, current page: Design guide"
                  : "More destinations"
              }
            >
              <MoreHorizontalIcon size={19} aria-hidden="true" />
              <span>More</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              side="top"
              align="end"
              className="w-44 pointer-coarse:[&_[data-slot=dropdown-menu-item]]:min-h-11"
            >
              <DropdownMenuItem render={<Link to="/design-guide" />}>
                Design guide
                {inDesignGuide && <CheckIcon className="ms-auto" aria-hidden="true" />}
              </DropdownMenuItem>
              <DropdownMenuItem render={<Link to="/" hash="workspace-guide" />}>
                Workspace guide
              </DropdownMenuItem>
              <DropdownMenuItem render={<Link to="/" />}>Home</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </WorkspaceMenuGroup>
      <WorkspaceMenuGroup
        label="Reference"
        className="max-md:hidden md:mt-8 sidebar-collapsed:mt-3 sidebar-collapsed:border-t sidebar-collapsed:pt-3 motion-safe:[transition:margin-top_var(--sidebar-slide,0s),padding-top_var(--sidebar-slide,0s)]"
      >
        <Destination to="/design-guide" label="Design guide" icon={BookOpenIcon} />
        <Destination
          to="/"
          hash="workspace-guide"
          label="Workspace guide"
          icon={BookBookmarkIcon}
        />
        <Destination to="/" label="Home" icon={HomeIcon} />
      </WorkspaceMenuGroup>
    </nav>
  );
}
