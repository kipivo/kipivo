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
import { m } from "@kipivo/i18n/messages";
import { authErrorCode, authErrorStatus, authRequest } from "./auth-client";
import { useAccountSession } from "./session";
import { SetupRequired } from "./setup-required";

function authErrorKey(error: unknown, creating: boolean) {
  if (creating && authErrorCode(error) === installationRequired) return "setup";
  switch (authErrorStatus(error)) {
    case 401:
      return "invalid";
    case 403:
      return "blocked";
    case 429:
      return "rateLimited";
    case 400:
    case 409:
    case 422:
      return creating ? "cannotCreate" : "checkDetails";
    default:
      return "unavailable";
  }
}

/** Message functions read the locale on call, so the map can live at module scope. */
const errorMessages = {
  invalid: m.credentialInvalid,
  blocked: m.credentialBlocked,
  rateLimited: m.credentialRateLimited,
  cannotCreate: m.credentialCannotCreate,
  checkDetails: m.credentialCheckDetails,
  unavailable: m.credentialUnavailable,
  session: m.credentialSession,
  invalidName: m.credentialInvalidName,
} as const;

type CredentialError = keyof typeof errorMessages;
type CredentialOptions = { creating: boolean; passwordAction?: ReactNode };

export function CredentialFields({ creating, passwordAction }: CredentialOptions) {
  return (
    <FieldGroup>
      {creating && (
        <Field>
          <FieldLabel htmlFor="account-name">{m.credentialName()}</FieldLabel>
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
        <FieldLabel htmlFor="account-email">{m.credentialEmail()}</FieldLabel>
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
          <FieldLabel htmlFor="account-password">{m.credentialPassword()}</FieldLabel>
          {passwordAction}
        </div>
        <PasswordInput
          visibilityLabels={{ show: m.credentialShowPassword(), hide: m.credentialHidePassword() }}
          id="account-password"
          name="password"
          autoComplete={creating ? "new-password" : "current-password"}
          minLength={creating ? 12 : undefined}
          required
          aria-describedby={creating ? "password-requirement" : undefined}
          className="h-10"
        />
        {creating && (
          <FieldDescription id="password-requirement">
            {m.credentialPasswordRequirement()}
          </FieldDescription>
        )}
      </Field>
    </FieldGroup>
  );
}

export function CredentialsForm({ creating, passwordAction }: CredentialOptions) {
  const { session, refresh } = useAccountSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<CredentialError | "setup">();

  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    if (creating && !name) {
      setError("invalidName");
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
        setError("session");
      }
    } catch (cause) {
      setError(authErrorKey(cause, creating));
    } finally {
      setBusy(false);
    }
  }

  const label = busy
    ? creating
      ? m.credentialCreating()
      : m.credentialBusy()
    : creating
      ? m.credentialCreate()
      : m.credentialSubmit();

  return (
    <form
      method="post"
      key={String(creating)}
      className="mt-7 grid gap-4 [&_input]:h-11 [&_input]:ps-3.5"
      onSubmit={(event) => void submit(event)}
      aria-busy={busy}
    >
      <CredentialFields creating={creating} passwordAction={passwordAction} />
      <FieldError>
        {error === "setup" ? SetupRequired() : error ? errorMessages[error]() : null}
      </FieldError>
      <Button
        type="submit"
        className="mt-1 h-11 w-full"
        disabled={busy || session.status === "loading" || session.status === "signed-in"}
      >
        {label}
      </Button>
    </form>
  );
}
