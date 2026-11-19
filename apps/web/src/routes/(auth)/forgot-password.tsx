import { PageTitle } from "@kipivo/ui/blocks/page";
import { createFileRoute } from "@tanstack/react-router";
import { authSearch, SignInLink } from "@/features/account/auth-navigation";
import { EmailForm } from "@/features/account/email-form";
import { requireInstallation } from "@/features/account/install-status";

export const Route = createFileRoute("/(auth)/forgot-password")({
  beforeLoad: requireInstallation,
  validateSearch: authSearch,
  head: () => ({ meta: [{ title: "Forgot your password? | Kipivo" }] }),
  component: Screen,
});
function Screen() {
  const search = Route.useSearch();
  return (
    <>
      <PageTitle>Forgot your password?</PageTitle>
      <p className="mt-2 text-sm text-muted-foreground">
        Enter your account email to request a password reset link.
      </p>
      <EmailForm method="reset" {...search} />
      <SignInLink {...search} />
    </>
  );
}
