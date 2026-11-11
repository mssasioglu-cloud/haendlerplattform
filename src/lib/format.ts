import { siteUrl } from "@/config/site";
import { publicStorageBase } from "@/lib/supabase/shared";

export const eur = (n: number | null | undefined) =>
  n == null ? "–" : n.toLocaleString("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
export const num = (n: number | null | undefined) => (n == null ? "–" : n.toLocaleString("de-DE"));
export const km = (n: number | null | undefined) => (n == null ? "–" : `${num(n)} km`);

export function monthYear(d: string | null | undefined) {
  if (!d) return "–";
  const [y, m] = d.split("-");
  return `${m}/${y}`;
}
export function dateDe(d: string | null | undefined) {
  if (!d) return "–";
  return new Date(d).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Berlin" });
}
export function dateTimeDe(d: string | null | undefined) {
  if (!d) return "–";
  return new Date(d).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" });
}
export function ps(kw: number | null | undefined) {
  if (kw == null) return "–";
  return `${kw} kW (${Math.round(kw * 1.35962)} PS)`;
}

export function imageUrl(path: string | null | undefined) {
  if (!path) return null;
  return `${publicStorageBase}/storage/v1/object/public/fahrzeugbilder/${path}`;
}

// Netto- und Bruttopreis aus den Inseratsdaten
export function prices(l: { price: number; vat_type: string; price_is_net: boolean }) {
  if (l.vat_type !== "ausweisbar") return { gross: l.price, net: null as number | null };
  return l.price_is_net
    ? { gross: Math.round(l.price * 1.19), net: l.price }
    : { gross: l.price, net: Math.round(l.price / 1.19) };
}

export function whatsappLink(numberRaw: string, text: string) {
  let n = numberRaw.replace(/[^\d+]/g, "");
  if (n.startsWith("00")) n = n.slice(2);
  else if (n.startsWith("+")) n = n.slice(1);
  else if (n.startsWith("0")) n = "49" + n.slice(1);
  return `https://wa.me/${n}?text=${encodeURIComponent(text)}`;
}

export const absoluteUrl = (path: string) => `${siteUrl.replace(/\/$/, "")}${path}`;
