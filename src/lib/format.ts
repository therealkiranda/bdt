import type { ApiImage, PackageCard } from "@/src/api";

/** Money arrives as a decimal string ("129000.00"). Format for display only; never do arithmetic on it. */
export function formatMoney(amount: string | number | null | undefined, currency: string | null | undefined): string {
  if (amount === null || amount === undefined || amount === "") return "";
  const n = typeof amount === "number" ? amount : parseFloat(amount);
  if (!Number.isFinite(n)) return String(amount);
  const txt = n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  const c = currency || "";
  if (c === "USD") return `$${txt}`;
  if (c === "EUR") return `€${txt}`;
  if (c === "GBP") return `£${txt}`;
  return `${c} ${txt}`.trim();
}

export function formatDuration(d: { days: number; nights: number } | null | undefined): string {
  if (!d || !d.days) return "";
  return d.nights > 0 ? `${d.days} days / ${d.nights} nights` : `${d.days} ${d.days === 1 ? "day" : "days"}`;
}

/** "2026-11-14" -> "14 Nov 2026". Travel dates are plain dates, not instants, so don't pass them through Date timezone math. */
export function formatDate(ymd: string | null | undefined): string {
  if (!ymd) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(ymd);
  if (!m) return ymd;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${parseInt(m[3], 10)} ${months[parseInt(m[2], 10) - 1]} ${m[1]}`;
}

export function formatDateRange(a: string | null | undefined, b: string | null | undefined): string {
  if (a && b && a !== b) return `${formatDate(a)} – ${formatDate(b)}`;
  return formatDate(a ?? b);
}

/** ISO 8601 instant -> local date and time. */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function imageUri(img: ApiImage | null | undefined, size: "small" | "medium" | "large" = "medium"): string | undefined {
  return img ? img[size] : undefined;
}

export function packageImage(p: Pick<PackageCard, "image">, size: "small" | "medium" | "large" = "medium") {
  return imageUri(p.image, size);
}

export function toTitle(s: string) {
  return s.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}
