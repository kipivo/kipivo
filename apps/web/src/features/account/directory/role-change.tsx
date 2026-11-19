import { getPermissions } from "@kipivo/rbac";
import { Button } from "@kipivo/ui/components/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@kipivo/ui/components/dialog";
import { useState } from "react";
import { accountClient, errorStatus, type ListedAccount } from "@/features/account/client";
import { permissionLabel, roleLabel } from "@/features/account/access-labels";

export function RoleChange({
  account,
  onChange,
  onAccessError,
}: {
  account: ListedAccount;
  onChange(account: ListedAccount): void;
  onAccessError(status: number | undefined): void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const role = account.role === "member" ? "admin" : "member";
  const adding = role === "admin";
  const delta = getPermissions(adding ? role : account.role).filter(
    (permission) => !getPermissions(adding ? account.role : role).includes(permission),
  );

  async function changeRole() {
    setBusy(true);
    setError("");
    try {
      const api = await accountClient();
      const updated = await api.admin.accounts.setRole({ id: account.id, role });
      onChange(updated);
      setOpen(false);
    } catch (cause) {
      const status = errorStatus(cause);
      onAccessError(status);
      setError(
        status === 401
          ? "Your session expired. Sign in again to continue."
          : status === 403
            ? "Your account does not have permission to make this change."
            : status === 404
              ? "This account could not be found."
              : "Unable to change the role. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (busy) return;
        setError("");
        setOpen(next);
      }}
    >
      <DialogTrigger
        render={<Button variant="outline" size="sm" />}
        aria-label={`Change role for ${account.name}`}
      >
        Change role
      </DialogTrigger>
      <DialogContent showCloseButton={!busy} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change account role</DialogTitle>
          <DialogDescription className="break-words">
            Change <strong className="font-medium text-foreground">{account.name}</strong> from{" "}
            {roleLabel[account.role]} to {roleLabel[role]}.
          </DialogDescription>
        </DialogHeader>
        {delta.length > 0 && (
          <div className="rounded-lg border border-border bg-muted/40 px-3 py-2.5">
            <p className="font-medium">{adding ? "Permissions added" : "Permissions removed"}</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-4 text-muted-foreground">
              {delta.map((permission) => (
                <li key={permission}>{permissionLabel[permission]}</li>
              ))}
            </ul>
          </div>
        )}
        {error && (
          <p role="alert" className="text-destructive">
            {error}
          </p>
        )}
        <DialogFooter className="[&_button]:min-h-9 pointer-coarse:[&_button]:min-h-11">
          <DialogClose render={<Button variant="outline" disabled={busy} />}>Cancel</DialogClose>
          <Button type="button" disabled={busy} aria-busy={busy} onClick={() => void changeRole()}>
            {busy ? "Updating…" : adding ? "Make administrator" : "Make member"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
