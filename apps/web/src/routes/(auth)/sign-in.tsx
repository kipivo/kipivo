import { ChevronRightIcon } from "@kipivo/icons";
import { buttonVariants } from "@kipivo/ui/components/button";
import { PageTitle } from "@kipivo/ui/blocks/page";
import { cn } from "@kipivo/ui/lib/utils";
import { requireInstallation } from "@/features/account/install-status";
import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { afterSignIn, socialAuthSearch, useEmailMethods } from "@/features/account/auth-navigation";
import { CredentialsForm } from "@/features/account/credentials-form";
import { useAccountSession } from "@/features/account/session";
import { SocialSignIn } from "@/features/account/social-sign-in";

const emailMethodLink = cn(
  buttonVariants({ variant: "outline" }),
  "h-auto min-h-11 justify-between gap-2 border-input px-3.5 py-2 whitespace-normal",
);

export const Route = createFileRoute("/(auth)/sign-in")({
  beforeLoad: requireInstallation,
  staticData: { brandPanel: true },
  validateSearch: socialAuthSearch,
  head: () => ({ meta: [{ title: "Sign in | Kipivo" }] }),
  component: SignInRoute,
});

function SignInRoute() {
  const { error, ...search } = Route.useSearch();
  const { session } = useAccountSession();
  const emailMethods = useEmailMethods();
  if (session.status === "signed-in") return <Navigate {...afterSignIn(search)} replace />;

  return (
    <>
      <PageTitle className="text-[clamp(2rem,4vw,2.5rem)] leading-[1.08]">
        Sign in to Kipivo
      </PageTitle>
      <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
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
              className="control-focus rounded-sm text-sm font-medium text-muted-foreground underline underline-offset-4 hover:text-foreground"
            >
              Forgot password?
            </Link>
          )
        }
      />
      <SocialSignIn returnTo="/sign-in" search={search} callbackError={error} />
      {emailMethods && (
        <nav aria-label="Other sign-in methods" className="mt-6 grid gap-2.5">
          <p className="mb-0.5 flex items-center gap-3 text-center text-xs font-medium text-muted-foreground before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">
            Sign in by email
          </p>
          <Link to="/magic-link" search={search} className={emailMethodLink}>
            Email me a sign-in link
            <ChevronRightIcon aria-hidden="true" className="text-muted-foreground" />
          </Link>
          <Link to="/email-code" search={search} className={emailMethodLink}>
            Sign in with an email code
            <ChevronRightIcon aria-hidden="true" className="text-muted-foreground" />
          </Link>
        </nav>
      )}
      <p className="mt-6 border-t border-border pt-5 text-center text-sm leading-relaxed text-muted-foreground">
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
