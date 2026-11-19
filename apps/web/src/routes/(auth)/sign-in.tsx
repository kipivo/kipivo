import { buttonVariants } from "@kipivo/ui/components/button";
import { PageTitle } from "@kipivo/ui/blocks/page";
import { requireInstallation } from "@/features/account/install-status";
import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { afterSignIn, authSearch, useEmailMethods } from "@/features/account/auth-navigation";
import { CredentialsForm } from "@/features/account/credentials-form";
import { useAccountSession } from "@/features/account/session";

export const Route = createFileRoute("/(auth)/sign-in")({
  beforeLoad: requireInstallation,
  staticData: { brandPanel: "desktop" },
  validateSearch: authSearch,
  head: () => ({ meta: [{ title: "Sign in | Kipivo" }] }),
  component: SignInRoute,
});

function SignInRoute() {
  const search = Route.useSearch();
  const { session } = useAccountSession();
  const emailMethods = useEmailMethods();
  if (session.status === "signed-in") return <Navigate {...afterSignIn(search)} replace />;

  return (
    <>
      <PageTitle className="text-[clamp(2.1rem,3.6vw,3rem)] leading-[1.05]">
        Sign in to Kipivo
      </PageTitle>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        {search.authorize
          ? "Sign in to continue authorizing your device."
          : search.next === "/workbench"
            ? "Sign in to open your account’s workbench."
            : search.next === "/settings"
              ? "Sign in to change your settings."
              : search.next
                ? "Sign in to continue to administration."
                : "Enter your account email and password to continue."}
      </p>
      <CredentialsForm
        creating={false}
        passwordAction={
          emailMethods && (
            <Link
              to="/forgot-password"
              search={search}
              className="control-focus rounded-sm text-sm font-normal text-muted-foreground underline underline-offset-4 hover:text-foreground"
            >
              Forgot password?
            </Link>
          )
        }
      />
      {emailMethods && (
        <nav aria-label="Other sign-in methods" className="mt-6 grid gap-2">
          <p className="mb-1 text-sm text-muted-foreground">Or sign in without a password</p>
          <Link
            to="/magic-link"
            search={search}
            className={buttonVariants({ variant: "outline", className: "h-10" })}
          >
            Email me a sign-in link
          </Link>
          <Link
            to="/email-code"
            search={search}
            className={buttonVariants({ variant: "outline", className: "h-10" })}
          >
            Sign in with an email code
          </Link>
        </nav>
      )}
      <p className="mt-6 flex flex-wrap items-baseline gap-x-2 border-t border-border pt-5 text-sm text-muted-foreground">
        New to Kipivo?{" "}
        <Link
          to="/sign-up"
          search={search}
          className="control-focus rounded-sm font-medium text-foreground underline underline-offset-4"
        >
          Create an account
        </Link>
      </p>
    </>
  );
}
