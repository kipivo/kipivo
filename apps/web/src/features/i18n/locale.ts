import { createLocale } from "@kipivo/i18n";
import { getLocale, setLocale } from "@kipivo/i18n/runtime";

/** One binding per app; every screen shares the same locale state. */
export const { LocaleProvider, useLocale, useSetLocale } = createLocale({ getLocale, setLocale });
