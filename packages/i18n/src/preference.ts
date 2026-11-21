import { cookieMaxAge, cookieName, setLocale, type Locale } from "@kipivo/i18n/runtime";

/**
 * Marks "use the browser language". While it is set, a remembered locale cookie
 * stays ignored on the server and is dropped on the client, so automatic mode
 * keeps following the browser instead of pinning the first resolved language.
 */
export const AUTO_COOKIE = "locale-auto";

export function hasCookie(header: string, name: string): boolean {
  return header.split(";").some((part) => part.trim().startsWith(`${name}=`));
}

export function removeCookie(header: string, name: string): string {
  return header
    .split(";")
    .map((part) => part.trim())
    .filter((part) => part.length > 0 && !part.startsWith(`${name}=`))
    .join("; ");
}

function readCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  for (const part of document.cookie.split(";")) {
    const [key, value] = part.trim().split("=");
    if (key === name && value) return decodeURIComponent(value);
  }
  return undefined;
}

function writeCookie(name: string, value: string, maxAge: number) {
  document.cookie = `${name}=${value}; path=/; max-age=${maxAge}; samesite=lax`;
}

function deleteCookie(name: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; path=/; max-age=0; samesite=lax`;
}

export function readLocalePreference(): string | undefined {
  return readCookie(cookieName);
}

export function isAutoPreference(): boolean {
  return readCookie(AUTO_COOKIE) === "1";
}

export function setAutoPreference(): void {
  writeCookie(AUTO_COOKIE, "1", cookieMaxAge);
  deleteCookie(cookieName);
}

export function setLocalePreference(locale: Locale): void {
  deleteCookie(AUTO_COOKIE);
  setLocale(locale, { reload: false });
}

export function forgetResolvedLocale(): void {
  deleteCookie(cookieName);
}
