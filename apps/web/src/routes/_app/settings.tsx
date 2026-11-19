import { OperationPage } from "@kipivo/ui/blocks/operation-page";
import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useAccountSession } from "@/features/account/session";
import {
  EmailSettingsForm,
  DirectorySettingsForm,
  PersonalSettingsForm,
} from "@/features/settings/forms";
export const Route = createFileRoute("/_app/settings")({
  head: () => ({ meta: [{ title: "Settings | Kipivo" }] }),
  component: SettingsRoute,
});
function SettingsRoute() {
  const { session } = useAccountSession();
  if (session.status === "signed-out")
    return <Navigate to="/sign-in" search={{ next: "/settings" }} replace />;
  return (
    <OperationPage
      title="Settings"
      description={
        session.status === "signed-in" && session.account.permissions.includes("settings.manage")
          ? "Manage your personal preferences and instance configuration."
          : "Manage preferences for your account."
      }
    >
      {session.status === "signed-in" ? (
        <div key={session.account.id} className="divide-y divide-border">
          <PersonalSettingsForm account={session.account} />
          {session.account.permissions.includes("settings.manage") && (
            <>
              <DirectorySettingsForm />
              <EmailSettingsForm />
            </>
          )}
        </div>
      ) : (
        <p role="status" className="text-sm text-muted-foreground">
          {session.status === "unavailable"
            ? "Account settings are unavailable. Reload to try again."
            : "Loading settings…"}
        </p>
      )}
    </OperationPage>
  );
}
