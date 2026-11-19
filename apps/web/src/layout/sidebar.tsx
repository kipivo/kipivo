import { PanelLeftCloseIcon, PanelLeftOpenIcon } from "@kipivo/icons";
import { Button } from "@kipivo/ui/components/button";
import { useHydrated } from "@tanstack/react-router";
import { useState } from "react";
import { useSidebarStore } from "./sidebar-store";

export function SidebarToggle() {
  const hydrated = useHydrated();
  // Restoring the saved width on first render should be instantaneous.
  const [motionReady, setMotionReady] = useState(false);
  const collapsed = useSidebarStore((state) => state.collapsed);
  const toggle = useSidebarStore((state) => state.toggle);
  const label = collapsed ? "Expand sidebar" : "Collapse sidebar";
  const Icon = collapsed ? PanelLeftOpenIcon : PanelLeftCloseIcon;

  return (
    <Button
      variant="ghost"
      size="icon"
      className="text-muted-foreground"
      aria-label={label}
      title={label}
      aria-expanded={!collapsed}
      aria-controls="workspace-sidebar"
      data-motion-ready={motionReady || undefined}
      disabled={!hydrated}
      onClick={() => {
        setMotionReady(true);
        toggle();
      }}
    >
      <Icon size={16} aria-hidden="true" />
    </Button>
  );
}
