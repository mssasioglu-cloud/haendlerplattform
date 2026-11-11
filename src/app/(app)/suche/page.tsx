import Link from "next/link";
import { requireAccess } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ListingCard } from "@/components/ListingCard";
import { SearchFilters } from "@/components/SearchFilters";
import { SaveSearchButton } from "@/components/SaveSearchButton";
import { parseFilters, toRpcParams, filtersToQuery, describeFilters } from "@/lib/filters";
import type { ListingCard as Card } from "@/lib/types";

export const metadata = { title: "Fahrzeugsuche" };
const PAGE_SIZE = 20;
const SORTS = [
  ["neu", "Neueste zuerst"], ["preis_auf", "Preis aufsteigend"], ["preis_ab", "Preis absteigend"],
  ["km", "Kilometerstand"], ["naehe", "Entfernung"],
];

export default async function Suche({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const s = await requireAccess();
  const sp = await searchParams;
  const filters = parseFilters(sp);
  const sortRaw = typeof sp.sort === "string" ? sp.sort : "neu";
  const sort = SORTS.some(([v]) => v === sortRaw) && (sortRaw !== "naehe" || filters.plz) ? sortRaw : "neu";
  const page = Math.max(1, Number.parseInt(typeof sp.seite === "string" ? sp.seite : "1", 10) || 1);

  const supabase = await createClient();
  const [{ data, error }, { data: favs }] = await Promise.all([
    supabase.rpc("search_listings", { ...toRpcParams(filters), p_sort: sort, p_limit: PAGE_SIZE, p_offset: (page - 1) * PAGE_SIZE }),
    supabase.from("favorites").select("listing_id").eq("dealer_id", s.userId),
  ]);
  const rows = (data ?? []) as Card[];
  const total = rows[0]?.total_count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const favSet = new Set((favs ?? []).map((f) => f.listing_id));
  const link = (p: number) => `/suche?${filtersToQuery(filters, { sort, seite: String(p) })}`;

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <aside><SearchFilters filters={filters} sort={sort} /></aside>
      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="h1">{total.toLocaleString("de-DE")} {total === 1 ? "Fahrzeug" : "Fahrzeuge"}</h1>
            <p className="text-sm text-muted">{describeFilters(filters)}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <SaveSearchButton filters={filters} suggestedName={describeFilters(filters)} />
            <form className="flex items-center gap-2">
              {Object.entries(filters).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
              <label htmlFor="sort" className="sr-only">Sortierung</label>
              <select id="sort" name="sort" defaultValue={sort} className="input w-auto py-2">
                {SORTS.filter(([v]) => v !== "naehe" || filters.plz).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              <button className="btn btn-secondary">Sortieren</button>
            </form>
          </div>
        </div>
        {error && <p className="notice notice-error">Die Suche konnte nicht ausgeführt werden.</p>}
        {!error && rows.length === 0 && (
          <div className="card p-8 text-center">
            <p className="font-semibold">Keine Fahrzeuge zu diesen Filtern.</p>
            <p className="mt-1 text-sm text-muted">
              Speichern Sie die Suche als Suchauftrag oder stellen Sie ein <Link href="/gesuche/neu" className="font-semibold text-brand-600">Gesuch</Link> ein.
            </p>
          </div>
        )}
        <div className="space-y-3">
          {rows.map((l) => <ListingCard key={l.id} l={l} isFavorite={favSet.has(l.id)} />)}
        </div>
        {pages > 1 && (
          <nav className="mt-6 flex items-center justify-center gap-3 text-sm" aria-label="Seiten">
            {page > 1 ? <Link href={link(page - 1)} className="btn btn-secondary">Zurück</Link> : <span />}
            <span className="text-muted">Seite {page} von {pages}</span>
            {page < pages ? <Link href={link(page + 1)} className="btn btn-secondary">Weiter</Link> : <span />}
          </nav>
        )}
      </section>
    </div>
  );
}
