import { canAssignAccountRole } from "@kipivo/rbac";
import { Badge } from "@kipivo/ui/components/badge";
import { InitialsAvatar } from "@kipivo/ui/components/initials-avatar";
import type { CurrentAccount, ListedAccount } from "@/features/account/client";
import { roleLabel } from "@/features/account/access-labels";
import { RoleChange } from "./role-change";

export function AccountDirectoryRow({
  account,
  viewer,
  className,
  onRoleChange,
  onAccessError,
}: {
  account: ListedAccount;
  viewer: CurrentAccount;
  className: string;
  onRoleChange(account: ListedAccount): void;
  onAccessError(status: number | undefined): void;
}) {
  return (
    <li className={`${className} gap-y-1.5 py-3 sm:py-3.5`}>
      <div className="col-start-1 row-start-1 flex min-w-0 items-center gap-3">
        <div className="hidden sm:flex">
          <InitialsAvatar name={account.name} />
        </div>
        <div className="min-w-0">
          <div className="flex min-w-0 items-baseline gap-2">
            <span className="truncate text-sm font-medium">{account.name}</span>
            {account.id === viewer.id && <span className="text-xs text-muted-foreground">You</span>}
          </div>
          <p className="truncate text-xs text-muted-foreground" title={account.email}>
            {account.email}
          </p>
        </div>
      </div>
      <div className="col-start-1 row-start-2 sm:col-start-2 sm:row-start-1">
        <Badge variant={account.role === "admin" ? "secondary" : "outline"}>
          {roleLabel[account.role]}
        </Badge>
      </div>
      {canAssignAccountRole(viewer, account.id) && (
        <div className="col-start-2 row-span-2 row-start-1 justify-self-end sm:col-start-3 sm:row-span-1">
          <RoleChange account={account} onChange={onRoleChange} onAccessError={onAccessError} />
        </div>
      )}
    </li>
  );
}
