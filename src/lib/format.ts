/**
 * Locale-aware formatting helpers. Monetary amounts are integer cents and always in CAD for now;
 * the currency is data, independent from the interface language. `null` means "not available" and is
 * never displayed as zero.
 */

export function formatMoney(cents: number | null, locale: string, options: { compact?: boolean } = {}): string | null {
  if (cents === null) return null;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: options.compact ? 0 : 2,
    minimumFractionDigits: options.compact ? 0 : 2,
    notation: options.compact ? "compact" : "standard",
  }).format(cents / 100);
}

export function formatNumber(value: number, locale: string): string {
  return new Intl.NumberFormat(locale).format(value);
}

export function formatPercent(ratio: number | null, locale: string): string | null {
  if (ratio === null) return null;
  return new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 1 }).format(ratio);
}

/** `YYYY-MM` -> "oct. 2026" / "Oct 2026". Dates are parsed as UTC so the day never shifts. */
export function formatMonth(month: string, locale: string, style: "short" | "long" = "short"): string {
  const [year, monthIndex] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year ?? 1970, (monthIndex ?? 1) - 1, 1));
  return new Intl.DateTimeFormat(locale, { month: style, year: "numeric", timeZone: "UTC" }).format(date);
}
