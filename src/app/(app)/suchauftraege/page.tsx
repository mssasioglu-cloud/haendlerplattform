import Link from "next/link";
import { requireAccess } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { deleteSearch, toggleSearchNotify } from "@/app/actions/searches";
import { filtersToQuery, describeFilters, type Filters } from "@/lib/filters";
import { dateDe } from "@/lib/format";

export const metadata = { title: "Suchaufträge" };

export default async function Suchauftraege() {
  const s = await requireAccess();
  const supabase = await createClient();
  const { data } = await supabase.from("saved_searches").select("*").eq("dealer_id", s.userId).order("created_at", { ascending: false });
  const rows = data ?? [];
  return (
    <>
      <h1 className="h1">Suchaufträge</h1>
      <p className="mb-5 text-sm text-muted">Sie erhalten eine E-Mail an {s.email}, sobald ein passendes Fahrzeug eingestellt wird.</p>
      {rows.length === 0 && (
        <p className="card p-8 text-center text-sm text-muted">
          Noch keine Suchaufträge. Setzen Sie in der <Link href="/suche" className="font-semibold text-brand-600">Suche</Link> Filter und wählen Sie „Suche speichern“.
        </p>
      )}
      <ul className="space-y-3">
        {rows.map((r) => (
          <li key={r.id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <p className="font-semibold">{describeFilters(r.filters as Filters)}</p>
              <p className="text-xs text-muted">Angelegt am {dateDe(r.created_at)} · E-Mail-Benachrichtigung {r.notify ? "an" : "aus"}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href={`/suche?${filtersToQuery(r.filters as Filters)}`} className="btn btn-primary btn-sm">Treffer ansehen</Link>
              <form action={toggleSearchNotify}>
                <input type="hidden" name="id" value={r.id} />
                <input type="hidden" name="notify" value={r.notify ? "0" : "1"} />
                <button className="btn btn-secondary btn-sm">{r.notify ? "E-Mails pausieren" : "E-Mails aktivieren"}</button>
              </form>
              <form action={deleteSearch}>
                <input type="hidden" name="id" value={r.id} />
                <button className="btn btn-danger btn-sm">Löschen</button>
              </form>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
