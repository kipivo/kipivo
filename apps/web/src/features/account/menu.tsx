import { ChevronDownIcon } from "@kipivo/icons";
import { Badge } from "@kipivo/ui/components/badge";
import { InitialsAvatar } from "@kipivo/ui/components/initials-avatar";
import { Button } from "@kipivo/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@kipivo/ui/components/dropdown-menu";
import { cn } from "@kipivo/ui/lib/utils";
import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import type { CurrentAccount } from "./client";
import { authRequest } from "./auth-client";
import { roleLabel } from "./access-labels";
import { useAccountSession } from "./session";

export default function AccountMenu({
  account,
  className,
  side,
}: {
  account: CurrentAccount;
  className?: string;
  side?: "top" | "bottom";
}) {
  const { clearSession, refresh } = useAccountSession();
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState(false);

  const label = account.settings.menuLabel;

  async function signOut() {
    setError(false);
    setSigningOut(true);
    try {
      await authRequest("/sign-out", { body: {} });
      await navigate({ to: "/", replace: true });
      clearSession();
    } catch {
      setError(true);
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <DropdownMenu
      onOpenChange={(open) => {
        if (open) {
          setError(false);
          void refresh();
        }
      }}
    >
      <DropdownMenuTrigger
        render={
          <Button
            variant={side ? "ghost" : "outline"}
            className={cn(
              side === "top"
                ? "min-h-12 min-w-0 cursor-pointer justify-start gap-2 overflow-hidden rounded-control px-2 py-[5px] whitespace-nowrap hover:bg-workspace-selected aria-expanded:bg-workspace-selected [&>:not(:first-child)]:sidebar-label"
                : side === "bottom"
                  ? "size-11 min-h-11 cursor-pointer rounded-full p-0 hover:bg-workspace-selected aria-expanded:bg-workspace-selected"
                  : "h-9 max-w-36 gap-2 pr-2 pl-1",
              className,
            )}
          />
        }
        aria-label="Account menu"
      >
        <InitialsAvatar name={account.name} />
        {side === "top" ? (
          <>
            <span className="min-w-0 text-start">
              <span className="block truncate font-medium">{account[label]}</span>
              <span className="block text-xs text-muted-foreground">{roleLabel[account.role]}</span>
            </span>
            <ChevronDownIcon
              aria-hidden="true"
              className="ms-auto size-4 rotate-180 text-muted-foreground"
            />
          </>
        ) : (
          !side && <span className="hidden truncate sm:inline">{account[label]}</span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side={side}
        align={side === "top" ? "start" : "end"}
        className="w-64 max-w-(--available-width)"
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel className="grid gap-1 px-2 py-2">
            <span className="truncate text-sm font-semibold text-foreground">{account[label]}</span>
            <span className="truncate">{label === "name" ? account.email : account.name}</span>
            <Badge variant="secondary" className="mt-1 w-fit">
              {roleLabel[account.role]}
            </Badge>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem render={<Link to="/workbench" />} className="cursor-pointer px-2">
            Workbench
          </DropdownMenuItem>
          <DropdownMenuItem render={<Link to="/settings" />} className="cursor-pointer px-2">
            Settings
          </DropdownMenuItem>
          {account.permissions.includes("accounts.read") && (
            <DropdownMenuItem render={<Link to="/admin" />} className="cursor-pointer px-2">
              Administration
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            closeOnClick={false}
            disabled={signingOut}
            onClick={() => void signOut()}
            className="cursor-pointer px-2"
          >
            {signingOut ? "Signing out…" : "Sign out"}
          </DropdownMenuItem>
          {error && (
            <p role="alert" className="px-2 py-1 text-xs text-destructive">
              Unable to sign out. Try again.
            </p>
          )}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
