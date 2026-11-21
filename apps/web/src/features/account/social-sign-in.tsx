import { installationRequired } from "@kipivo/auth/errors";
import { GitHubIcon, GoogleIcon } from "@kipivo/icons";
import { Button } from "@kipivo/ui/components/button";
import { FieldError } from "@kipivo/ui/components/field";
import { useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { m } from "@kipivo/i18n/messages";
import { afterSignIn, type AuthSearch, type socialAuthSearch } from "./auth-navigation";
import { authErrorCode, authErrorStatus, authRequest } from "./auth-client";
import { SetupRequired } from "./setup-required";

const providerNames = { google: "Google", github: "GitHub" };
type Provider = keyof typeof providerNames;

const callbackMessages = {
  access_denied: m.socialAccessDenied,
  account_not_linked: m.socialAccountNotLinked,
  email_not_found: m.socialEmailNotFound,
  social_sign_in_failed: m.socialSignInFailed,
} as const;

export function SocialSignIn({
  search,
  returnTo,
  callbackError,
}: {
  search: AuthSearch;
  returnTo: "/sign-in" | "/sign-up";
  callbackError: ReturnType<typeof socialAuthSearch>["error"];
}) {
  const router = useRouter();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<Provider | "setup" | "rateLimited" | null>();

  useEffect(() => {
    const abort = new AbortController();
    void authRequest("/social-methods", { signal: abort.signal })
      .then((response) => response.json())
      .then(({ providers }) => {
        if (Array.isArray(providers))
          setProviders(providers.filter((value) => value === "google" || value === "github"));
      })
      .catch(() => {});
    return () => abort.abort();
  }, []);

  const message =
    error === "setup" ? (
      <SetupRequired />
    ) : error === "rateLimited" ? (
      m.credentialRateLimited()
    ) : error ? (
      m.socialOpenFailed({ provider: providerNames[error] })
    ) : error === undefined && callbackError ? (
      callbackMessages[callbackError]()
    ) : null;
  if (!providers.length && !message) return null;

  async function start(provider: Provider) {
    if (pending) return;
    setError(null);
    setPending(true);
    try {
      const response = await authRequest("/sign-in/social", {
        body: {
          provider,
          callbackURL: router.buildLocation(afterSignIn(search)).href,
          errorCallbackURL: router.buildLocation({ to: returnTo, search }).href,
          disableRedirect: true,
        },
      });
      const { url } = await response.json();
      if (typeof url !== "string" || new URL(url).protocol !== "https:")
        throw new Error("Invalid provider authorization URL.");
      window.location.assign(url);
    } catch (cause) {
      if (authErrorCode(cause) === installationRequired) {
        setError("setup");
        return;
      }
      setError(authErrorStatus(cause) === 429 ? "rateLimited" : provider);
    } finally {
      setPending(false);
    }
  }

  return (
    <div
      className="mt-6 grid gap-2.5"
      role="group"
      aria-label={m.socialLabel()}
      aria-busy={pending}
    >
      {providers.length > 0 && (
        <p className="flex items-center gap-3 text-xs font-medium text-muted-foreground before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">
          {m.socialOr()}
        </p>
      )}
      <FieldError>{message}</FieldError>
      {providers.map((provider) => (
        <Button
          key={provider}
          type="button"
          variant="outline"
          className="h-11 gap-2.5 border-input"
          disabled={pending}
          onClick={() => void start(provider)}
        >
          {provider === "google" ? (
            <GoogleIcon aria-hidden="true" className="size-[18px]" />
          ) : (
            <GitHubIcon aria-hidden="true" className="size-[18px]" />
          )}
          {m.socialContinueWithProvider({ provider: providerNames[provider] })}
        </Button>
      ))}
    </div>
  );
}
