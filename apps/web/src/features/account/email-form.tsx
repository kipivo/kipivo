import { Button } from "@kipivo/ui/components/button";
import { Input } from "@kipivo/ui/components/input";
import { Field, FieldError, FieldLabel } from "@kipivo/ui/components/field";
import { Navigate, useRouter } from "@tanstack/react-router";
import { useState, type SubmitEvent } from "react";
import { afterSignIn, type AuthSearch, useEmailMethods } from "./auth-navigation";
import { errorStatus, accountClient } from "./client";
import { useAccountSession } from "./session";

type Method = "link" | "code" | "reset";
const labels = { link: "Send sign-in link", code: "Send sign-in code", reset: "Send reset link" };
export function EmailForm({ method, ...search }: { method: Method } & AuthSearch) {
  const router = useRouter();
  const enabled = useEmailMethods();
  const { session, refresh } = useAccountSession();
  const [sentTo, setSentTo] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (session.status === "signed-in" && method !== "reset")
    return <Navigate {...afterSignIn(search)} replace />;
  if (!enabled)
    return (
      <p role="status" className="mt-4 text-muted-foreground">
        {enabled === null
          ? "Checking available sign-in methods…"
          : "Email delivery is unavailable. Use password sign-in or contact your administrator."}
      </p>
    );
  const checkingCode = Boolean(sentTo) && method === "code";
  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") ?? "").trim();
    setError("");
    setBusy(true);
    try {
      if (checkingCode) {
        await (
          await accountClient()
        ).auth.emailCodeVerifications.create({ email: sentTo, otp: String(data.get("code")) });
        if ((await refresh())?.status !== "signed-in")
          setError("Could not load your session. Try signing in again.");
      } else {
        if (method === "link")
          await (
            await accountClient()
          ).auth.magicLinks.create({
            email,
            callbackURL: router.buildLocation(afterSignIn(search)).href,
            errorCallbackURL: router.buildLocation({ to: "/magic-link", search }).href,
          });
        else if (method === "reset")
          await (await accountClient()).auth.passwordResets.create({ email });
        else await (await accountClient()).auth.emailCodes.create({ email, type: "sign-in" });
        setSentTo(email);
      }
    } catch (cause) {
      setError(
        errorStatus(cause) === 429
          ? "Too many attempts. Wait a moment and try again."
          : checkingCode
            ? "Could not sign in. Check the code or request a new one."
            : "Could not send your request. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="mt-6 grid gap-4">
      {sentTo && (
        <p role="status" className="text-sm">
          If an account exists for <strong className="break-all">{sentTo}</strong>, check your inbox
          for {method === "code" ? "a six-digit code" : "a link"}.
        </p>
      )}
      {(!sentTo || checkingCode) && (
        <form method="post" onSubmit={submit} className="grid gap-4" aria-busy={busy}>
          {checkingCode ? (
            <Field>
              <FieldLabel htmlFor="email-code">Sign-in code</FieldLabel>
              <Input
                key="code"
                id="email-code"
                name="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                required
              />
            </Field>
          ) : (
            <Field>
              <FieldLabel htmlFor="delivery-email">Email</FieldLabel>
              <Input
                key="email"
                id="delivery-email"
                name="email"
                type="email"
                autoComplete="email"
                required
              />
            </Field>
          )}
          <FieldError>{error}</FieldError>
          <Button disabled={busy} type="submit">
            {busy ? "Please wait…" : checkingCode ? "Verify and sign in" : labels[method]}
          </Button>
        </form>
      )}
      {sentTo && (
        <Button
          variant="outline"
          disabled={busy}
          onClick={() => {
            setSentTo("");
            setError("");
          }}
        >
          Request another {method === "code" ? "code" : "link"}
        </Button>
      )}
    </div>
  );
}
