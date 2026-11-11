// Filter der Fahrzeugsuche. Die Schlüssel sind zugleich die URL-Parameter und
// die Felder gespeicherter Suchaufträge.
export const FILTER_KEYS = [
  "kategorie", "marke", "modell", "preis_von", "preis_bis", "km_bis", "ez_von", "ez_bis",
  "kraftstoff", "getriebe", "mwst", "dringend", "plz", "umkreis", "q",
] as const;
export type Filters = Partial<Record<(typeof FILTER_KEYS)[number], string>>;

export function parseFilters(sp: Record<string, string | string[] | undefined>): Filters {
  const f: Filters = {};
  for (const k of FILTER_KEYS) {
    const v = sp[k];
    const s = (Array.isArray(v) ? v[0] : v)?.trim();
    if (s) f[k] = s.slice(0, 80);
  }
  if (f.plz && !/^\d{5}$/.test(f.plz)) delete f.plz;
  if (!f.plz) delete f.umkreis;
  return f;
}

const int = (s?: string) => {
  const n = s ? Number.parseInt(s.replace(/\D/g, ""), 10) : NaN;
  return Number.isFinite(n) ? n : null;
};

export function toRpcParams(f: Filters) {
  return {
    p_category: f.kategorie ?? null,
    p_make: f.marke ?? null,
    p_model: f.modell ?? null,
    p_price_min: int(f.preis_von),
    p_price_max: int(f.preis_bis),
    p_km_max: int(f.km_bis),
    p_year_min: int(f.ez_von),
    p_year_max: int(f.ez_bis),
    p_fuel: f.kraftstoff ?? null,
    p_transmission: f.getriebe ?? null,
    p_vat_type: f.mwst ?? null,
    p_urgent: f.dringend ? true : null,
    p_zip: f.plz ?? null,
    p_radius_km: f.plz ? int(f.umkreis) : null,
    p_q: f.q ?? null,
  };
}

export function filtersToQuery(f: Filters, extra: Record<string, string> = {}) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(f)) if (v) q.set(k, v);
  for (const [k, v] of Object.entries(extra)) if (v) q.set(k, v);
  return q.toString();
}

export function describeFilters(f: Filters) {
  const parts: string[] = [];
  if (f.marke) parts.push(f.marke);
  if (f.modell) parts.push(f.modell);
  if (f.q) parts.push(`„${f.q}“`);
  if (f.preis_bis) parts.push(`bis ${Number(f.preis_bis).toLocaleString("de-DE")} €`);
  if (f.km_bis) parts.push(`bis ${Number(f.km_bis).toLocaleString("de-DE")} km`);
  if (f.ez_von) parts.push(`ab EZ ${f.ez_von}`);
  if (f.kraftstoff) parts.push(f.kraftstoff);
  if (f.plz) parts.push(`${f.umkreis ? f.umkreis + " km um " : ""}${f.plz}`);
  if (f.dringend) parts.push("muss schnell weg");
  return parts.join(", ") || "Alle Fahrzeuge";
}
