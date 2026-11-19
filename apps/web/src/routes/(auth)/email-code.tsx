import { PageTitle } from "@kipivo/ui/blocks/page";
import { createFileRoute } from "@tanstack/react-router";
import { authSearch, SignInLink } from "@/features/account/auth-navigation";
import { EmailForm } from "@/features/account/email-form";
import { requireInstallation } from "@/features/account/install-status";

export const Route = createFileRoute("/(auth)/email-code")({
  beforeLoad: requireInstallation,
  validateSearch: authSearch,
  head: () => ({ meta: [{ title: "Sign in with a code | Kipivo" }] }),
  component: Screen,
});
function Screen() {
  const search = Route.useSearch();
  return (
    <>
      <PageTitle>Sign in with a code</PageTitle>
      <p className="mt-2 text-sm text-muted-foreground">
        Use the email address on your account. The six-digit code expires in five minutes.
      </p>
      <EmailForm method="code" {...search} />
      <SignInLink {...search} />
    </>
  );
}
