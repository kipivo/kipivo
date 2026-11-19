import { accountClient } from "./client";
import { nativeAuthorization, type NativeAuthorization } from "@kipivo/auth/native";
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export type AuthSearch = {
  next?: "/admin" | "/admin/accounts" | "/settings" | "/workbench";
  authorize?: NativeAuthorization;
};
export function authSearch({ next, authorize }: Record<string, unknown>): AuthSearch {
  const native = nativeAuthorization.safeParse(authorize);
  if (native.success) return { authorize: native.data };
  return next === "/admin" ||
    next === "/admin/accounts" ||
    next === "/settings" ||
    next === "/workbench"
    ? { next }
    : {};
}

export function afterSignIn({ next, authorize }: AuthSearch) {
  return authorize
    ? { to: "/authorize" as const, search: authorize }
    : { to: next ?? ("/" as const) };
}

export function useEmailMethods() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  useEffect(() => {
    const abort = new AbortController();
    void accountClient()
      .then((client) => client.auth.emailMethods(undefined, { signal: abort.signal }))
      .then((result) => result.enabled)
      .then(setEnabled)
      .catch(() => {
        if (!abort.signal.aborted) setEnabled(false);
      });
    return () => abort.abort();
  }, []);
  return enabled;
}

export function SignInLink(search: AuthSearch) {
  return (
    <Link
      to="/sign-in"
      search={search}
      className="mt-5 inline-block text-sm underline underline-offset-4"
    >
      Back to sign in
    </Link>
  );
}
