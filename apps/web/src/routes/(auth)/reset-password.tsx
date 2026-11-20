import { PageTitle } from "@kipivo/ui/blocks/page";
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
  head: () => ({
    meta: [{ title: "Reset password | Kipivo" }, { name: "referrer", content: "no-referrer" }],
  }),
  headers: () => ({ "Cache-Control": "no-store" }),
  component: ResetPassword,
});
function ResetPassword() {
  const [token, setToken] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
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
      setError("The passwords do not match.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await authRequest("/reset-password", { body: { token, newPassword: password } });
      setToken("");
      setDone(true);
      await refresh();
    } catch (cause) {
      setError(
        authErrorStatus(cause) === 429
          ? "Too many attempts. Try again later."
          : "Could not reset your password. Try again or request a new link.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageTitle>{done ? "Password updated" : "Choose a new password"}</PageTitle>
      {done ? (
        <p role="status" className="mt-3">
          Sign in with your new password.
        </p>
      ) : token === null ? (
        <p role="status">Checking the reset link…</p>
      ) : !token ? (
        <p role="alert" className="mt-3">
          Open the reset link from your email, or request a new one.
        </p>
      ) : (
        <form method="post" className="mt-6 grid gap-4" onSubmit={submit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="new-password">New password</FieldLabel>
              <Input
                id="new-password"
                type="password"
                name="password"
                autoComplete="new-password"
                minLength={12}
                required
                aria-describedby="length"
              />
              <FieldDescription id="length">Use at least 12 characters.</FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="confirm-password">Confirm new password</FieldLabel>
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
          <FieldError>{error}</FieldError>
          <Button type="submit" disabled={busy}>
            {busy ? "Updating…" : "Update password"}
          </Button>
        </form>
      )}
      {!done && (
        <Link to="/forgot-password" className="mt-4 block text-sm underline">
          Request a new reset link
        </Link>
      )}
      <SignInLink />
    </>
  );
}
