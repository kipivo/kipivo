import { requireInstallation } from "@/features/account/install-status";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { WorkspaceFrame } from "@/layout/workspace-frame";

export const Route = createFileRoute("/_app")({
  beforeLoad: requireInstallation,
  component: () => (
    <WorkspaceFrame>
      <Outlet />
    </WorkspaceFrame>
  ),
});
