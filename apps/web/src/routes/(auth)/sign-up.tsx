import { PageTitle } from "@kipivo/ui/blocks/page";
import { createFileRoute, Navigate } from "@tanstack/react-router";
import { afterSignIn, authSearch, SignInLink } from "@/features/account/auth-navigation";
import { CredentialsForm } from "@/features/account/credentials-form";
import { requireInstallation } from "@/features/account/install-status";
import { useAccountSession } from "@/features/account/session";

export const Route = createFileRoute("/(auth)/sign-up")({
  beforeLoad: requireInstallation,
  staticData: { brandPanel: "responsive" },
  validateSearch: authSearch,
  head: () => ({ meta: [{ title: "Create an account | Kipivo" }] }),
  component: SignUp,
});
function SignUp() {
  const search = Route.useSearch();
  const { session } = useAccountSession();
  if (session.status === "signed-in") return <Navigate {...afterSignIn(search)} replace />;
  return (
    <>
      <PageTitle>Create your account</PageTitle>
      <CredentialsForm creating />
      <SignInLink {...search} />
    </>
  );
}
