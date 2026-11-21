import { languageNames } from "@kipivo/i18n/languages";
import { m } from "@kipivo/i18n/messages";
import { isLocale, locales, type Locale } from "@kipivo/i18n/runtime";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@kipivo/ui/components/select";
import { useRouter } from "@tanstack/react-router";
import { useSyncExternalStore } from "react";
import { useLocale, useSetLocale } from "./locale";
import { readLocalePreference, setAutoPreference } from "./preference";

const noSubscription = () => () => {};

export function LanguageSelect() {
  const locale = useLocale();
  const setLocale = useSetLocale();
  const router = useRouter();
  // The server can only render the resolved locale; the marker decides "automatic".
  const preference = useSyncExternalStore(noSubscription, readLocalePreference, () => locale);
  const value = isLocale(preference) ? preference : "auto";

  function change(next: Locale | "auto" | null) {
    if (next === null || next === value) return;
    if (next === "auto") {
      setAutoPreference();
      window.location.reload();
      return;
    }
    setLocale(next);
    // Route head (titles) is derived outside the React tree, so refresh matches.
    void router.invalidate();
  }

  return (
    <Select<Locale | "auto"> value={value} onValueChange={change}>
      <SelectTrigger aria-label={m.languageLabel()}>
        <SelectValue>
          <span className="max-sm:sr-only" lang={value === "auto" ? locale : value}>
            {value === "auto" ? m.languageAuto() : languageNames[value].full}
          </span>
          <span aria-hidden="true" className="sm:hidden" lang={locale}>
            {languageNames[locale].short}
          </span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent align="end" alignItemWithTrigger={false} className="w-max">
        <SelectGroup>
          <SelectItem value="auto">{m.languageAuto()}</SelectItem>
          {locales.map((code) => (
            <SelectItem key={code} value={code} lang={code}>
              {languageNames[code].full}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
