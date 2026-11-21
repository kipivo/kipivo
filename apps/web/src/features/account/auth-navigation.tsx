import { authRequest } from "./auth-client";
import { nativeAuthorization, type NativeAuthorization } from "@kipivo/auth/native";
import { m } from "@kipivo/i18n/messages";
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

type SocialCallbackError =
  | "access_denied"
  | "account_not_linked"
  | "email_not_found"
  | "social_sign_in_failed";

export function socialAuthSearch(
  input: Record<string, unknown>,
): AuthSearch & { error?: SocialCallbackError } {
  const { error } = input;
  const search = authSearch(input);
  switch (error) {
    case "access_denied":
    case "account_not_linked":
    case "email_not_found":
      return { ...search, error };
    default:
      return typeof error === "string" && error
        ? { ...search, error: "social_sign_in_failed" }
        : search;
  }
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
    void authRequest("/email-methods", { signal: abort.signal })
      .then((response) => response.json())
      .then(({ enabled }) => setEnabled(enabled === true))
      .catch(() => {
        if (!abort.signal.aborted) setEnabled(false);
      });
    return () => abort.abort();
  }, []);
  return enabled;
}

export function SignInLink({
  label = m.authBackToSignIn({}, { locale: "en" }),
  ...search
}: AuthSearch & { label?: string }) {
  return (
    <Link
      to="/sign-in"
      search={search}
      className="mt-5 inline-block text-sm underline underline-offset-4"
    >
      {label}
    </Link>
  );
}
