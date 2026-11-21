const formatters = new Map<string, Intl.DateTimeFormat>();

/** Format a run timestamp in the active locale, always in UTC. */
export function formatRunTime(value: string, locale: string): string {
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return "Unknown date";
  let formatter = formatters.get(locale);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "UTC",
    });
    formatters.set(locale, formatter);
  }
  return `${formatter.format(timestamp)} UTC`;
}
