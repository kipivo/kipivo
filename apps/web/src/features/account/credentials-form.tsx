import { installationRequired } from "@kipivo/auth/errors";
import { Button } from "@kipivo/ui/components/button";
import { PasswordInput } from "@kipivo/ui/components/password-input";
import { Input } from "@kipivo/ui/components/input";
import {
  Field,
  FieldError,
  FieldLabel,
  FieldDescription,
  FieldGroup,
} from "@kipivo/ui/components/field";
import { useState, type ReactNode, type SubmitEvent } from "react";
import { authErrorCode, authErrorStatus, authRequest } from "./auth-client";
import { useAccountSession } from "./session";
import { SetupRequired } from "./setup-required";

function authErrorMessage(error: unknown, creating: boolean) {
  if (creating && authErrorCode(error) === installationRequired) return <SetupRequired />;
  switch (authErrorStatus(error)) {
    case 401:
      return "The email or password is incorrect.";
    case 403:
      return "This request was blocked. Check the Kipivo web address and try again.";
    case 429:
      return "Too many attempts. Wait a moment and try again.";
    case 400:
    case 409:
    case 422:
      return creating
        ? "Could not create this account. Check your details or sign in."
        : "Check your email and password and try again.";
    default:
      return "The account service is temporarily unavailable. Try again.";
  }
}

type CredentialOptions = { creating: boolean; passwordAction?: ReactNode };

export function CredentialFields({ creating, passwordAction }: CredentialOptions) {
  return (
    <FieldGroup>
      {creating && (
        <Field>
          <FieldLabel htmlFor="account-name">Name</FieldLabel>
          <Input
            id="account-name"
            name="name"
            autoComplete="name"
            maxLength={128}
            required
            className="h-10"
          />
        </Field>
      )}
      <Field>
        <FieldLabel htmlFor="account-email">Email</FieldLabel>
        <Input
          id="account-email"
          name="email"
          placeholder="you@example.com"
          type="email"
          autoComplete="email"
          maxLength={254}
          required
          className="h-10"
        />
      </Field>
      <Field>
        <div className="flex items-baseline justify-between gap-2">
          <FieldLabel htmlFor="account-password">Password</FieldLabel>
          {passwordAction}
        </div>
        <PasswordInput
          id="account-password"
          name="password"
          autoComplete={creating ? "new-password" : "current-password"}
          minLength={creating ? 12 : undefined}
          required
          aria-describedby={creating ? "password-requirement" : undefined}
          className="h-10"
        />
        {creating && (
          <FieldDescription id="password-requirement">Use at least 12 characters.</FieldDescription>
        )}
      </Field>
    </FieldGroup>
  );
}

export function CredentialsForm({ creating, passwordAction }: CredentialOptions) {
  const { session, refresh } = useAccountSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ReactNode>();

  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    if (creating && !name) {
      setError("Enter your name.");
      return;
    }
    const credentials = {
      email: String(form.get("email")).trim(),
      password: String(form.get("password")),
    };
    setBusy(true);
    setError(undefined);
    try {
      if (creating) {
        await authRequest("/sign-up/email", { body: { ...credentials, name } });
      } else {
        await authRequest("/sign-in/email", { body: credentials });
      }
      const current = await refresh();
      if (current && current.status !== "signed-in") {
        setError("Could not load your session. Try signing in again.");
      }
    } catch (cause) {
      setError(authErrorMessage(cause, creating));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      method="post"
      key={String(creating)}
      className="mt-7 grid gap-4 [&_input]:h-11 [&_input]:ps-3.5"
      onSubmit={(event) => void submit(event)}
      aria-busy={busy}
    >
      <CredentialFields creating={creating} passwordAction={passwordAction} />
      <FieldError>{error}</FieldError>
      <Button
        type="submit"
        className="mt-1 h-11 w-full"
        disabled={busy || session.status === "loading" || session.status === "signed-in"}
      >
        {busy
          ? creating
            ? "Creating account…"
            : "Signing in…"
          : creating
            ? "Create account"
            : "Sign in"}
      </Button>
    </form>
  );
}
