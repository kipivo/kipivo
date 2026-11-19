import { buttonVariants } from "@kipivo/ui/components/button";
import { LoginIcon } from "@kipivo/icons";
import { cn } from "@kipivo/ui/lib/utils";
import { Link, useLocation } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { useAccountSession } from "./session";

const AccountMenu = lazy(() => import("./menu"));

export function AccountControl({
  className,
  side,
}: {
  className?: string;
  side?: "top" | "bottom";
}) {
  const { session } = useAccountSession();
  const onWorkbench = useLocation({ select: (location) => location.pathname === "/workbench" });
  const signInClassName = cn(
    buttonVariants({ variant: "outline" }),
    side === "top" &&
      "grid place-items-center sidebar-collapsed:px-0 [&>*]:col-start-1 [&>*]:row-start-1 [&>span]:sidebar-label",
    className,
  );
  const placeholder = (
    <span
      data-slot="account-placeholder"
      aria-hidden="true"
      className={
        side
          ? cn("h-8 w-[4.25rem] max-w-full rounded-lg bg-muted", className)
          : cn(signInClassName, "pointer-events-none")
      }
    >
      {!side && <span className="invisible">Sign in</span>}
    </span>
  );

  if (session.status === "loading") return placeholder;
  if (session.status === "signed-in") {
    return (
      <Suspense fallback={placeholder}>
        <AccountMenu account={session.account} className={className} side={side} />
      </Suspense>
    );
  }
  return (
    <Link
      to="/sign-in"
      search={onWorkbench ? { next: "/workbench" } : {}}
      aria-label="Sign in"
      title="Sign in"
      className={signInClassName}
    >
      {side === "top" && (
        <LoginIcon
          className="opacity-0 sidebar-collapsed:opacity-100 motion-safe:[transition:opacity_var(--sidebar-fade,0s)]"
          aria-hidden="true"
        />
      )}
      <span>Sign in</span>
    </Link>
  );
}
