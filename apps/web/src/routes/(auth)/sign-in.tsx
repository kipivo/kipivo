import { ChevronRightIcon } from "@kipivo/icons";
import { renderMarkup } from "@kipivo/i18n";
import { buttonVariants } from "@kipivo/ui/components/button";
import { PageTitle } from "@kipivo/ui/blocks/page";
import { cn } from "@kipivo/ui/lib/utils";
import { requireInstallation } from "@/features/account/install-status";
import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { afterSignIn, socialAuthSearch, useEmailMethods } from "@/features/account/auth-navigation";
import { CredentialsForm } from "@/features/account/credentials-form";
import { useAccountSession } from "@/features/account/session";
import { SocialSignIn } from "@/features/account/social-sign-in";
import { m } from "@kipivo/i18n/messages";

const emailMethodLink = cn(
  buttonVariants({ variant: "outline" }),
  "h-auto min-h-11 justify-between gap-2 border-input px-3.5 py-2 whitespace-normal",
);

export const Route = createFileRoute("/(auth)/sign-in")({
  beforeLoad: requireInstallation,
  staticData: { brandPanel: true, languageSwitch: true },
  validateSearch: socialAuthSearch,
  head: () => ({ meta: [{ title: m.signInDocumentTitle() }] }),
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
        {m.signInHeading()}
      </PageTitle>
      <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
        {search.authorize
          ? m.signInIntroDeviceAuthorization()
          : search.next === "/workbench"
            ? m.signInIntroWorkbench()
            : search.next === "/settings"
              ? m.signInIntroSettings()
              : search.next
                ? m.signInIntroAdmin()
                : m.signInIntroDefault()}
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
              {m.signInForgotPassword()}
            </Link>
          )
        }
      />
      <SocialSignIn returnTo="/sign-in" search={search} callbackError={error} />
      {emailMethods && (
        <nav aria-label={m.signInOtherMethodsLabel()} className="mt-6 grid gap-2.5">
          <p className="mb-0.5 flex items-center gap-3 text-center text-xs font-medium text-muted-foreground before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">
            {m.signInEmailHeading()}
          </p>
          <Link to="/magic-link" search={search} className={emailMethodLink}>
            {m.signInEmailLink()}
            <ChevronRightIcon aria-hidden="true" className="text-muted-foreground" />
          </Link>
          <Link to="/email-code" search={search} className={emailMethodLink}>
            {m.signInEmailCode()}
            <ChevronRightIcon aria-hidden="true" className="text-muted-foreground" />
          </Link>
        </nav>
      )}
      <p className="mt-6 border-t border-border pt-5 text-center text-sm leading-relaxed text-muted-foreground">
        {renderMarkup(m.signInSignUpPrompt(), {
          link: (chunks) => (
            <Link
              to="/sign-up"
              search={search}
              className="control-focus rounded-sm font-medium text-foreground underline underline-offset-4"
            >
              {chunks}
            </Link>
          ),
        })}
      </p>
    </>
  );
}
