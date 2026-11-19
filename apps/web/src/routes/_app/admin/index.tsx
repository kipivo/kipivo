import { ActionCard } from "@kipivo/ui/blocks/action-card";
import { OperationPage } from "@kipivo/ui/blocks/operation-page";
import { buttonVariants } from "@kipivo/ui/components/button";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AdminAccessGate } from "@/features/admin/access-gate";

export const Route = createFileRoute("/_app/admin/")({
  head: () => ({ meta: [{ title: "Administration | Kipivo" }] }),
  component: AdministrationRoute,
});

function AdministrationRoute() {
  return (
    <OperationPage
      title="Administration"
      description="Manage access and configure this Kipivo instance."
    >
      <AdminAccessGate returnTo="/admin">
        {(account) => (
          <div className="grid gap-4 sm:grid-cols-2">
            <ActionCard
              title="Accounts"
              description="Find accounts and review their access to Kipivo."
            >
              <Link to="/admin/accounts" className={buttonVariants({ variant: "outline" })}>
                Manage accounts
              </Link>
            </ActionCard>
            {account.permissions.includes("settings.manage") && (
              <ActionCard
                title="Instance settings"
                description="Configure email delivery and the account directory for this instance."
              >
                <Link to="/settings" className={buttonVariants({ variant: "outline" })}>
                  Open settings
                </Link>
              </ActionCard>
            )}
          </div>
        )}
      </AdminAccessGate>
    </OperationPage>
  );
}
