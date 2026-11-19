import { accountClient, errorStatus } from "@/features/account/client";
import { PageTitle } from "@kipivo/ui/blocks/page";
import {
  nativeAuthorization,
  nativeClients,
  readNativeCode,
  type NativeAuthorization,
} from "@kipivo/auth/native";
import { Button, buttonVariants } from "@kipivo/ui/components/button";
import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useState } from "react";
import { requireInstallation } from "@/features/account/install-status";
import { useAccountSession } from "@/features/account/session";

export const Route = createFileRoute("/(auth)/authorize")({
  beforeLoad: requireInstallation,
  validateSearch: (input: Record<string, unknown>) =>
    nativeAuthorization.safeParse(input).data ?? {},
  head: () => ({
    meta: [{ title: "Authorize an app | Kipivo" }, { name: "referrer", content: "no-referrer" }],
  }),
  headers: () => ({
    "Content-Security-Policy": "frame-ancestors 'none'",
    "Cache-Control": "no-store",
  }),
  component: AuthorizeRoute,
});

function AuthorizeRoute() {
  const request = nativeAuthorization.safeParse(Route.useSearch());
  if (!request.success)
    return <p role="alert">This sign-in request is invalid. Start again from the app.</p>;
  return <Authorization key={JSON.stringify(request.data)} request={request.data} />;
}

function Authorization({ request }: { request: NativeAuthorization }) {
  const { session, refresh } = useAccountSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [callback, setCallback] = useState("");
  const { name } = nativeClients[request.client_id];

  async function approve() {
    if (busy || session.status !== "signed-in") return;
    setBusy(true);
    setError("");
    try {
      const { callback: url } = await (
        await accountClient()
      ).auth.native.authorizations.create({ ...request, account_id: session.account.id });
      if (typeof url !== "string" || !readNativeCode(url, request))
        throw new Error("Invalid callback");
      setCallback(url);
      window.location.assign(url);
    } catch (cause) {
      if (errorStatus(cause) === 401 || errorStatus(cause) === 409) await refresh();
      setError("Could not authorize the app. Check your account and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageTitle>Sign in to {name}</PageTitle>
      {callback ? (
        <div className="mt-4 grid gap-4">
          <p>
            Return to the app to finish signing in. If the link expires, start again from the app.
          </p>
          <a className={buttonVariants()} href={callback}>
            Open {name}
          </a>
        </div>
      ) : session.status === "signed-out" ? (
        <Navigate to="/sign-in" search={{ authorize: request }} replace />
      ) : session.status === "signed-in" ? (
        <div className="mt-4 grid gap-4">
          <p>
            Allow {name} to sign in as{" "}
            <strong className="break-all">{session.account.email}</strong>? Only continue if you
            started this request in the app.
          </p>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <Button onClick={() => void approve()} disabled={busy}>
            {busy ? "Authorizing…" : "Authorize app"}
          </Button>
          <Link to="/" className={buttonVariants({ variant: "ghost" })}>
            Cancel
          </Link>
        </div>
      ) : (
        <p role="status" className="mt-4">
          {session.status === "loading"
            ? "Checking your account…"
            : "The account service is unavailable. Try again later."}
        </p>
      )}
    </>
  );
}
