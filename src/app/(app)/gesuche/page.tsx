import Link from "next/link";
import { requireAccess } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { MessageForm } from "@/components/ContactForms";
import { setWantedStatus } from "@/app/actions/misc";
import { eur, num, dateDe } from "@/lib/format";
import { CATEGORIES, categoryLabel } from "@/lib/vehicle";

export const metadata = { title: "Suchgesuche" };

export default async function Gesuche({ searchParams }: { searchParams: Promise<{ kategorie?: string; q?: string }> }) {
  const s = await requireAccess();
  const { kategorie, q } = await searchParams;
  const supabase = await createClient();
  let query = supabase.from("wanted_ads").select("*").order("created_at", { ascending: false }).limit(100);
  if (kategorie && CATEGORIES.some((c) => c.value === kategorie)) query = query.eq("category", kategorie);
  if (q?.trim()) {
    const term = q.trim().replace(/[%,()]/g, " ");
    query = query.or(`title.ilike.%${term}%,make.ilike.%${term}%,model.ilike.%${term}%`);
  }
  const { data } = await query;
  const rows = (data ?? []).filter((w) => w.status === "aktiv" || w.dealer_id === s.userId);
  const ids = Array.from(new Set(rows.map((w) => w.dealer_id)));
  const { data: dealers } = ids.length
    ? await supabase.from("dealers").select("id, company_name, city").in("id", ids)
    : { data: [] as { id: string; company_name: string; city: string }[] };
  const dealer = new Map((dealers ?? []).map((d) => [d.id, d]));

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="h1">Suchgesuche</h1>
          <p className="text-sm text-muted">Was Händlerkollegen gerade suchen. Bieten Sie passende Fahrzeuge direkt an.</p>
        </div>
        <Link href="/gesuche/neu" className="btn btn-primary">+ Gesuch einstellen</Link>
      </div>
      <form className="card mb-4 flex flex-wrap items-end gap-3 p-4">
        <div className="min-w-40 flex-1">
          <label className="label" htmlFor="g-q">Suchbegriff</label>
          <input className="input" id="g-q" name="q" defaultValue={q} placeholder="Marke, Modell …" />
        </div>
        <div>
          <label className="label" htmlFor="g-kat">Fahrzeugart</label>
          <select className="input" id="g-kat" name="kategorie" defaultValue={kategorie ?? ""}>
            <option value="">Alle</option>
            {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <button className="btn btn-secondary">Filtern</button>
      </form>
      {rows.length === 0 && <p className="card p-8 text-center text-sm text-muted">Aktuell keine Gesuche.</p>}
      <div className="grid gap-3 md:grid-cols-2">
        {rows.map((w) => {
          const mine = w.dealer_id === s.userId;
          const d = dealer.get(w.dealer_id);
          const specs = [
            categoryLabel(w.category), [w.make, w.model].filter(Boolean).join(" "),
            w.max_price ? `bis ${eur(w.max_price)}` : null, w.max_km ? `bis ${num(w.max_km)} km` : null,
            w.min_year ? `ab EZ ${w.min_year}` : null,
          ].filter(Boolean);
          return (
            <article key={w.id} className="card flex flex-col p-4">
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-semibold">{w.title}</h2>
                {w.status === "erledigt" && <span className="badge bg-line">Erledigt</span>}
              </div>
              <p className="mt-1 flex flex-wrap gap-1.5">
                {specs.map((x) => <span key={x} className="badge bg-brand-50 text-brand-800">{x}</span>)}
              </p>
              {w.description && <p className="mt-2 whitespace-pre-line text-sm">{w.description}</p>}
              <p className="mt-2 text-xs text-muted">
                <Link href={`/haendler/${w.dealer_id}`} className="link">{d?.company_name ?? "Händler"}</Link>
                {d?.city && ` · ${d.city}`} · {dateDe(w.created_at)}
              </p>
              <div className="mt-3 border-t border-line pt-3">
                {mine ? (
                  <div className="flex gap-2">
                    <form action={setWantedStatus}>
                      <input type="hidden" name="id" value={w.id} />
                      <input type="hidden" name="status" value={w.status === "aktiv" ? "erledigt" : "aktiv"} />
                      <button className="btn btn-secondary btn-sm">{w.status === "aktiv" ? "Als erledigt markieren" : "Wieder aktivieren"}</button>
                    </form>
                    <form action={setWantedStatus}>
                      <input type="hidden" name="id" value={w.id} />
                      <input type="hidden" name="delete" value="1" />
                      <button className="btn btn-danger btn-sm">Löschen</button>
                    </form>
                  </div>
                ) : (
                  <details>
                    <summary className="btn btn-secondary btn-sm">Fahrzeug anbieten</summary>
                    <div className="mt-3">
                      <MessageForm wantedId={w.id} placeholder="Ich habe ein passendes Fahrzeug: … (gern mit Link zu Ihrem Inserat)" />
                    </div>
                  </details>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}
