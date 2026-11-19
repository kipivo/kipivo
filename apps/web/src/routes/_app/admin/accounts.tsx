import { OperationPage } from "@kipivo/ui/blocks/operation-page";
import { createFileRoute } from "@tanstack/react-router";
import { AccountDirectory } from "@/features/account/directory/list";
import { AdminAccessGate } from "@/features/admin/access-gate";

export const Route = createFileRoute("/_app/admin/accounts")({
  head: () => ({ meta: [{ title: "Accounts | Kipivo" }] }),
  component: AccountsRoute,
});

function AccountsRoute() {
  return (
    <OperationPage title="Accounts" description="Find a teammate and review or change their role.">
      <AdminAccessGate returnTo="/admin/accounts">
        {(account, onAccessError) => (
          <AccountDirectory key={account.id} viewer={account} onAccessError={onAccessError} />
        )}
      </AdminAccessGate>
    </OperationPage>
  );
}
