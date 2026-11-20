import { FolderIcon } from "@kipivo/icons";
import { Wordmark } from "@kipivo/ui";
import { ThemeToggle } from "@kipivo/ui/components/theme-toggle";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import logo from "@assets/logo.svg?no-inline";
import { AccountControl } from "@/features/account/control";
import { WorkspaceNav } from "./workspace-nav";
import { SidebarToggle } from "./sidebar";
import { useSidebarStore } from "./sidebar-store";

export function WorkspaceFrame({ children }: { children: ReactNode }) {
  const collapsed = useSidebarStore((state) => state.collapsed);
  return (
    <div
      className="workspace-shell min-h-svh bg-background text-foreground [--gutter:clamp(1rem,4vw,1.75rem)]
        max-md:pb-[calc(4.75rem+env(safe-area-inset-bottom))] md:grid
        md:grid-cols-[clamp(11.5rem,18.1%,14rem)_minmax(0,1fr)] md:[--gutter:clamp(1.5rem,3.4vw,3.5rem)]
        sidebar-collapsed:grid-cols-[4rem_minmax(0,1fr)]
        md:motion-safe:has-[[data-motion-ready]]:[--sidebar-slide:200ms_cubic-bezier(0.25,0.8,0.25,1)]
        md:motion-safe:has-[[data-motion-ready]]:[--sidebar-fade:120ms_ease-out]
        md:motion-safe:[transition:grid-template-columns_var(--sidebar-slide,0s)]"
      data-sidebar-collapsed={collapsed || undefined}
    >
      <a
        href="#workspace-content"
        className="control-focus fixed top-2 left-2 z-10 -translate-y-[180%] rounded-sm bg-card p-2 focus:translate-y-0 pointer-coarse:min-h-11"
      >
        Skip to content
      </a>
      <aside
        id="workspace-sidebar"
        className="bg-card md:sticky md:top-0 md:flex md:h-dvh md:min-w-0 md:flex-col md:overflow-x-hidden md:overflow-y-auto
          md:border-r md:px-3 md:pt-6 md:pb-4 sidebar-collapsed:px-2
          motion-safe:[transition:padding_var(--sidebar-slide,0s)]"
      >
        <div className="hidden md:block">
          <Link
            to="/workbench"
            className="control-focus ml-1.5 inline-flex min-h-9 max-w-[calc(100%-0.375rem)] items-center overflow-clip rounded-sm
              align-top pointer-coarse:min-h-11 [&>div]:gap-1.5 [&>div]:text-2xl/[normal] [&>div]:tracking-[-0.055em]
              [&_img]:size-8.5 [&_img]:shrink-0 [&_[data-slot=wordmark-name]]:sidebar-label"
            aria-label="Kipivo workbench"
          >
            <Wordmark logo={logo} name="Kipivo" />
          </Link>
        </div>
        <WorkspaceNav />
        <div className="mt-auto hidden border-t pt-3 md:grid">
          <AccountControl side="top" />
        </div>
      </aside>
      <div className="min-w-0">
        <header className="flex min-h-13 items-center justify-between gap-2 border-b bg-card px-[max(var(--gutter),calc((100%-var(--container-workspace))/2+var(--gutter)))] md:min-h-10 md:justify-start md:bg-transparent">
          <div className="hidden items-center gap-1 md:flex">
            <SidebarToggle />
            <ThemeToggle />
          </div>
          <Link
            to="/workbench"
            className="control-focus flex items-center gap-[7px] rounded-sm text-xs/[1.4] font-medium text-foreground"
          >
            <FolderIcon size={14} className="text-muted-foreground" aria-hidden="true" />
            Kipivo{" "}
            <span className="ms-0.5 border-s ps-[9px] text-[11px] font-normal text-muted-foreground">
              Workspace
            </span>
          </Link>
          <div className="flex items-center gap-1 md:hidden">
            <ThemeToggle />
            <AccountControl side="bottom" />
          </div>
        </header>
        <div
          id="workspace-content"
          tabIndex={-1}
          className="@container/workspace mx-auto w-full max-w-workspace px-(--gutter) pt-5 pb-6 outline-none md:pt-8 [&>main.page-gutter]:w-full [&>main.page-gutter]:max-w-none [&>main.page-gutter]:p-0"
        >
          {children}
        </div>
      </div>
    </div>
  );
}
