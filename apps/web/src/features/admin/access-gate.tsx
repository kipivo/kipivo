import { Button, buttonVariants } from "@kipivo/ui/components/button";
import { Link, Navigate } from "@tanstack/react-router";
import { useCallback, useState, type ReactNode } from "react";
import type { CurrentAccount } from "@/features/account/client";
import { useAccountSession } from "@/features/account/session";

type AdminAccessGateProps = {
  returnTo: "/admin" | "/admin/accounts";
  children(account: CurrentAccount, onAccessError: (status: number | undefined) => void): ReactNode;
};

export function AdminAccessGate({ returnTo, children }: AdminAccessGateProps) {
  const { session, refresh } = useAccountSession();
  const [accessChanged, setAccessChanged] = useState(false);

  const onAccessError = useCallback(
    (status: number | undefined) => {
      if (status === 401 || status === 403) {
        if (status === 403) setAccessChanged(true);
        void refresh();
      }
    },
    [refresh],
  );

  if (session.status === "signed-out") {
    return <Navigate to="/sign-in" search={{ next: returnTo }} replace />;
  }

  if (session.status === "loading") {
    return (
      <p role="status" className="text-sm text-muted-foreground">
        Checking your access…
      </p>
    );
  }

  if (session.status === "unavailable") {
    return (
      <div className="rounded-xl border border-border bg-card p-4">
        <p role="alert" className="text-sm text-destructive">
          Unable to load your account.
        </p>
        <Button variant="outline" className="mt-3" onClick={() => void refresh()}>
          Try again
        </Button>
      </div>
    );
  }

  if (session.account.permissions.includes("accounts.read")) {
    return children(session.account, onAccessError);
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 sm:p-6">
      <h2 className="font-medium">Administrator access required</h2>
      <p role="alert" className="mt-2 text-sm text-muted-foreground">
        {accessChanged
          ? "Your permissions changed. You no longer have access to manage accounts."
          : `You’re signed in as ${session.account.email}. An administrator can grant you access.`}
      </p>
      <Link to="/" className={buttonVariants({ variant: "outline", className: "mt-4" })}>
        Back to home
      </Link>
    </div>
  );
}
