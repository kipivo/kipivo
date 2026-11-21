import { useLocale } from "@/features/i18n/locale";
import { PageTitle } from "@kipivo/ui/blocks/page";
import { m } from "@kipivo/i18n/messages";
import { createFileRoute } from "@tanstack/react-router";
import { authSearch, SignInLink } from "@/features/account/auth-navigation";
import { EmailForm } from "@/features/account/email-form";
import { requireInstallation } from "@/features/account/install-status";

export const Route = createFileRoute("/(auth)/forgot-password")({
  beforeLoad: requireInstallation,
  staticData: { languageSwitch: true },
  validateSearch: authSearch,
  head: () => ({ meta: [{ title: m.forgotPasswordDocumentTitle() }] }),
  component: Screen,
});
function Screen() {
  useLocale();
  const search = Route.useSearch();
  return (
    <>
      <PageTitle>{m.forgotPasswordHeading()}</PageTitle>
      <p className="mt-2 text-sm text-muted-foreground">{m.forgotPasswordIntro()}</p>
      <EmailForm method="reset" {...search} />
      <SignInLink {...search} label={m.authBackToSignIn()} />
    </>
  );
}
