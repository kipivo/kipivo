import { useLocale } from "@/features/i18n/locale";
import { PageTitle } from "@kipivo/ui/blocks/page";
import { m } from "@kipivo/i18n/messages";
import { Button } from "@kipivo/ui/components/button";
import { Input } from "@kipivo/ui/components/input";
import {
  Field,
  FieldError,
  FieldLabel,
  FieldDescription,
  FieldGroup,
} from "@kipivo/ui/components/field";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type SubmitEvent } from "react";
import { SignInLink } from "@/features/account/auth-navigation";
import { authErrorStatus, authRequest } from "@/features/account/auth-client";
import { requireInstallation } from "@/features/account/install-status";
import { useAccountSession } from "@/features/account/session";

export const Route = createFileRoute("/(auth)/reset-password")({
  beforeLoad: requireInstallation,
  staticData: { languageSwitch: true },
  head: () => ({
    meta: [{ title: m.resetPasswordDocumentTitle() }, { name: "referrer", content: "no-referrer" }],
  }),
  headers: () => ({ "Cache-Control": "no-store" }),
  component: ResetPassword,
});

const errorMessages = {
  mismatch: m.resetPasswordMismatch,
  rateLimited: m.resetPasswordRateLimited,
  failed: m.resetPasswordFailed,
};

function ResetPassword() {
  useLocale();
  const [token, setToken] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<keyof typeof errorMessages>();
  const { refresh } = useAccountSession();
  useEffect(() => {
    const value = window.location.hash.slice(1);
    setToken((previous) => previous ?? value);
    if (value) window.history.replaceState(window.history.state, "", window.location.pathname);
  }, []);
  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || busy) return;
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password"));
    if (password !== form.get("confirm")) {
      setError("mismatch");
      return;
    }
    setBusy(true);
    setError(undefined);
    try {
      await authRequest("/reset-password", { body: { token, newPassword: password } });
      setToken("");
      setDone(true);
      await refresh();
    } catch (cause) {
      setError(authErrorStatus(cause) === 429 ? "rateLimited" : "failed");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageTitle>{done ? m.resetPasswordDoneHeading() : m.resetPasswordHeading()}</PageTitle>
      {done ? (
        <p role="status" className="mt-3">
          {m.resetPasswordDoneMessage()}
        </p>
      ) : token === null ? (
        <p role="status">{m.resetPasswordCheckingLink()}</p>
      ) : !token ? (
        <p role="alert" className="mt-3">
          {m.resetPasswordMissingLink()}
        </p>
      ) : (
        <form method="post" className="mt-6 grid gap-4" onSubmit={submit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="new-password">{m.resetPasswordNewPassword()}</FieldLabel>
              <Input
                id="new-password"
                type="password"
                name="password"
                autoComplete="new-password"
                minLength={12}
                required
                aria-describedby="length"
              />
              <FieldDescription id="length">{m.credentialPasswordRequirement()}</FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="confirm-password">{m.resetPasswordConfirmPassword()}</FieldLabel>
              <Input
                id="confirm-password"
                type="password"
                name="confirm"
                autoComplete="new-password"
                minLength={12}
                required
              />
            </Field>
          </FieldGroup>
          <FieldError>{error ? errorMessages[error]() : null}</FieldError>
          <Button type="submit" disabled={busy}>
            {busy ? m.resetPasswordBusy() : m.resetPasswordSubmit()}
          </Button>
        </form>
      )}
      {!done && (
        <Link to="/forgot-password" className="mt-4 block text-sm underline">
          {m.resetPasswordRequestNewLink()}
        </Link>
      )}
      <SignInLink label={m.authBackToSignIn()} />
    </>
  );
}
