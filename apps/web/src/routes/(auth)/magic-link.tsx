import { PageTitle } from "@kipivo/ui/blocks/page";
import { createFileRoute } from "@tanstack/react-router";
import { authSearch, SignInLink } from "@/features/account/auth-navigation";
import { EmailForm } from "@/features/account/email-form";
import { requireInstallation } from "@/features/account/install-status";

export const Route = createFileRoute("/(auth)/magic-link")({
  beforeLoad: requireInstallation,
  validateSearch: (input) => ({ ...authSearch(input), ...(input.error ? { failed: true } : {}) }),
  head: () => ({ meta: [{ title: "Sign in by email link | Kipivo" }] }),
  component: Screen,
});
function Screen() {
  const { failed, ...search } = Route.useSearch();
  return (
    <>
      <PageTitle>Sign in by email link</PageTitle>
      <p className="mt-2 text-sm text-muted-foreground">
        We’ll email you a one-time sign-in link. You won’t need your password.
      </p>
      {failed && (
        <p role="alert" className="mt-4 text-destructive">
          This sign-in link is invalid or expired. Request a new one below.
        </p>
      )}
      <EmailForm method="link" {...search} />
      <SignInLink {...search} />
    </>
  );
}
