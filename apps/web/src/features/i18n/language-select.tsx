import { NativeSelect, NativeSelectOption } from "@kipivo/ui/components/native-select";
import { useRouter } from "@tanstack/react-router";
import { useSyncExternalStore } from "react";
import { m } from "@kipivo/i18n/messages";
import { cookieName, isLocale, locales } from "@kipivo/i18n/runtime";
import { useLocale, useSetLocale } from "./locale";

const noSubscription = () => () => {};

function storedLocale(): string | null {
  for (const part of document.cookie.split(";")) {
    const [name, value] = part.trim().split("=");
    if (name === cookieName && value) return decodeURIComponent(value);
  }
  return null;
}

function nativeName(code: string): string {
  try {
    return new Intl.DisplayNames([code], { type: "language" }).of(code) ?? code;
  } catch {
    return code;
  }
}

const localeNames = new Map(locales.map((code) => [code, nativeName(code)]));

export function LanguageSelect() {
  const locale = useLocale();
  const setLocale = useSetLocale();
  const router = useRouter();
  // The server can only render the resolved locale; the cookie decides "automatic".
  const value = useSyncExternalStore(
    noSubscription,
    () => storedLocale() ?? "auto",
    () => locale,
  );
  function change(next: string) {
    if (next === "auto") {
      document.cookie = `${cookieName}=; path=/; max-age=0; samesite=lax`;
      window.location.reload();
      return;
    }
    if (!isLocale(next)) return;
    setLocale(next);
    // Route head (titles) is derived outside the React tree, so refresh matches.
    void router.invalidate();
  }
  return (
    <div className="relative w-fit">
      <NativeSelect
        aria-label={m.languageLabel()}
        className="max-w-40 max-sm:w-16 max-sm:[&_select]:text-transparent"
        value={isLocale(value) ? value : "auto"}
        onChange={(event) => change(event.target.value)}
      >
        <NativeSelectOption value="auto">{m.languageAuto()}</NativeSelectOption>
        {locales.map((code) => (
          <NativeSelectOption key={code} value={code} lang={code}>
            {localeNames.get(code)}
          </NativeSelectOption>
        ))}
      </NativeSelect>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 start-2.5 flex items-center text-sm sm:hidden"
      >
        {locale === "en" ? "EN" : "简中"}
      </span>
    </div>
  );
}
