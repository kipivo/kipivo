import { createLocale } from "@kipivo/i18n";
import { getLocale as getRuntimeLocale, setLocale as setRuntimeLocale } from "@kipivo/i18n/runtime";
import { clearAutoPreference, forgetResolvedLocale, isAutoPreference } from "./preference";

// Paraglide remembers the first resolved locale by writing the cookie. In automatic
// mode that would pin the browser language, so drop the remembered value before the
// runtime resolves, and again after the runtime persists it during the first read.
if (isAutoPreference()) forgetResolvedLocale();

/**
 * The generated runtime persists the first resolved locale into the cookie. While
 * automatic mode is active, drop that write so the browser keeps deciding.
 */
export function getLocale() {
  const locale = getRuntimeLocale();
  if (isAutoPreference()) forgetResolvedLocale();
  return locale;
}

function setLocale(
  locale: Parameters<typeof setRuntimeLocale>[0],
  options?: Parameters<typeof setRuntimeLocale>[1],
) {
  clearAutoPreference();
  setRuntimeLocale(locale, options);
}

/** One binding per app; every screen shares the same locale state. */
export const { LocaleProvider, useLocale, useSetLocale } = createLocale({
  getLocale,
  setLocale,
});
