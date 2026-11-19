import { PageTitle } from "@kipivo/ui/blocks/page";
import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { afterSignIn, socialAuthSearch } from "@/features/account/auth-navigation";
import { CredentialsForm } from "@/features/account/credentials-form";
import { requireInstallation } from "@/features/account/install-status";
import { useAccountSession } from "@/features/account/session";
import { SocialSignIn } from "@/features/account/social-sign-in";

export const Route = createFileRoute("/(auth)/sign-up")({
  beforeLoad: requireInstallation,
  staticData: { brandPanel: true },
  validateSearch: socialAuthSearch,
  head: () => ({ meta: [{ title: "Create an account | Kipivo" }] }),
  component: SignUp,
});
function SignUp() {
  const { error, ...search } = Route.useSearch();
  const { session } = useAccountSession();
  if (session.status === "signed-in") return <Navigate {...afterSignIn(search)} replace />;
  return (
    <>
      <PageTitle className="text-[clamp(2rem,4vw,2.5rem)] leading-[1.08]">
        Create your account
      </PageTitle>
      <CredentialsForm creating />
      <SocialSignIn returnTo="/sign-up" search={search} callbackError={error} />
      <p className="mt-6 border-t border-border pt-5 text-center text-sm leading-relaxed text-muted-foreground">
        Already have an account?{" "}
        <Link
          to="/sign-in"
          search={search}
          className="control-focus rounded-sm font-medium text-foreground underline underline-offset-4"
        >
          Sign in
        </Link>
      </p>
    </>
  );
}
