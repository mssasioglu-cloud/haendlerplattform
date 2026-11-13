import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { adminSetDealerStatus, adminResolveReport } from "@/app/actions/misc";
import { site } from "@/config/site";
import { dateTimeDe } from "@/lib/format";
import type { Dealer, DealerPrivate } from "@/lib/types";
import { DemoPanel } from "./DemoPanel";

export const metadata = { title: "Admin" };
// Das Laden der Demodaten legt Konten an und lädt Fotos hoch; dafür etwas mehr Laufzeit erlauben.
export const maxDuration = 60;

const STATUS_CLS: Record<string, string> = {
  ausstehend: "bg-amber-100 text-amber-900", freigegeben: "bg-emerald-100 text-emerald-800",
  abgelehnt: "bg-red-100 text-red-800", gesperrt: "bg-red-100 text-red-800",
};

export default async function Admin({ searchParams }: { searchParams: Promise<{ ansicht?: string }> }) {
  await requireAdmin();
  const { ansicht = "freigaben" } = await searchParams;
  const supabase = await createClient();
  const admin = createAdminClient();

  const [{ data: dealersRaw }, { data: privRaw }, { data: reports }, { count: listingCount }] = await Promise.all([
    supabase.from("dealers").select("*").order("created_at", { ascending: false }).limit(1000),
    supabase.from("dealer_private").select("*").limit(1000),
    supabase.from("reports").select("*, listings(make, model)").eq("resolved", false).order("created_at", { ascending: false }),
    supabase.from("listings").select("id", { count: "exact", head: true }).eq("status", "aktiv"),
  ]);
  const dealers = (dealersRaw ?? []) as Dealer[];
  const priv = new Map(((privRaw ?? []) as DealerPrivate[]).map((p) => [p.dealer_id, p]));
  const pending = dealers.filter((d) => d.status === "ausstehend");
  const shown = ansicht === "haendler" ? dealers : pending;

  // Zeitlich begrenzte Links zu den Gewerbenachweisen (privater Bucket)
  const links = new Map<string, string>();
  await Promise.all(shown.slice(0, 100).map(async (d) => {
    const path = priv.get(d.id)?.license_path;
    if (!path) return;
    const { data } = await admin.storage.from("gewerbescheine").createSignedUrl(path, 600);
    if (data?.signedUrl) links.set(d.id, data.signedUrl);
  }));

  const demoDealers = [...priv.values()].filter((p) => p.email.endsWith("@demo.haendlerdeal.invalid")).length;
  const founding = dealers.filter((d) => d.is_founding).length;
  const tabs = [["freigaben", `Freigaben (${pending.length})`], ["haendler", `Alle Händler (${dealers.length})`], ["meldungen", `Meldungen (${reports?.length ?? 0})`]];

  return (
    <>
      <h1 className="h1">Administration</h1>
      <dl className="my-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Freigegebene Händler", dealers.filter((d) => d.status === "freigegeben").length],
          ["Wartend", pending.length],
          ["Gründerplätze vergeben", `${founding} / ${site.foundingSlots}`],
          ["Aktive Inserate", listingCount ?? 0],
        ].map(([k, v]) => (
          <div key={k} className="card p-4">
            <dt className="eyebrow">{k}</dt>
            <dd className="price mt-1 text-3xl">{v}</dd>
          </div>
        ))}
      </dl>
      <DemoPanel demoDealers={demoDealers} />
      <nav className="mb-4 flex gap-2 overflow-x-auto">
        {tabs.map(([k, l]) => (
          <Link key={k} href={`/admin?ansicht=${k}`} className={`btn btn-sm ${ansicht === k ? "btn-primary" : "btn-secondary"}`}>{l}</Link>
        ))}
      </nav>

      {ansicht === "meldungen" ? (
        <div className="space-y-3">
          {!reports?.length && <p className="card p-8 text-center text-sm text-muted">Keine offenen Meldungen.</p>}
          {(reports ?? []).map((r) => {
            const car = r.listings as unknown as { make: string; model: string } | null;
            return (
              <div key={r.id} className="card p-4">
                <Link href={`/inserat/${r.listing_id}`} className="link">{car ? `${car.make} ${car.model}` : "Inserat"}</Link>
                <p className="mt-1 text-sm">{r.reason}</p>
                <p className="mt-1 text-xs text-muted">{dateTimeDe(r.created_at)}</p>
                <div className="mt-3 flex gap-2">
                  <form action={adminResolveReport}>
                    <input type="hidden" name="id" value={r.id} />
                    <button className="btn btn-secondary btn-sm">Erledigt, Inserat bleibt</button>
                  </form>
                  <form action={adminResolveReport}>
                    <input type="hidden" name="id" value={r.id} />
                    <input type="hidden" name="listing_id" value={r.listing_id} />
                    <input type="hidden" name="deactivate" value="1" />
                    <button className="btn btn-danger btn-sm">Inserat deaktivieren</button>
                  </form>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-3">
          {shown.length === 0 && <p className="card p-8 text-center text-sm text-muted">Keine offenen Freigaben.</p>}
          {shown.map((d) => {
            const p = priv.get(d.id);
            return (
              <div key={d.id} className="card p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{d.company_name}</p>
                    <p className="text-sm text-muted">{d.contact_name} · {d.street}, {d.zip} {d.city}</p>
                    <p className="text-sm text-muted">{p?.email} · Tel. {d.phone} · USt-IdNr. {p?.vat_id || "keine Angabe"}</p>
                    <p className="text-xs text-muted">Registriert {dateTimeDe(d.created_at)}{d.is_founding && ` · Gründerplatz Nr. ${d.founding_number}`}{p?.subscription_status && ` · Abo: ${p.subscription_status}`}</p>
                  </div>
                  <span className={`badge capitalize ${STATUS_CLS[d.status]}`}>{d.status}</span>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {links.get(d.id)
                    ? <a href={links.get(d.id)} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">Gewerbenachweis öffnen</a>
                    : <span className="text-xs text-red-700">Kein Gewerbenachweis</span>}
                  {d.status !== "freigegeben" && (
                    <form action={adminSetDealerStatus}>
                      <input type="hidden" name="id" value={d.id} />
                      <input type="hidden" name="status" value="freigegeben" />
                      <button className="btn btn-primary btn-sm">Freigeben</button>
                    </form>
                  )}
                  {!d.is_admin && (
                    <form action={adminSetDealerStatus} className="flex flex-wrap items-center gap-2">
                      <input type="hidden" name="id" value={d.id} />
                      <input type="hidden" name="status" value={d.status === "freigegeben" ? "gesperrt" : "abgelehnt"} />
                      <label htmlFor={`reason-${d.id}`} className="sr-only">Begründung</label>
                      <input id={`reason-${d.id}`} name="reason" placeholder="Begründung (optional)" className="input w-56 py-1.5" maxLength={300} />
                      <button className="btn btn-danger btn-sm">{d.status === "freigegeben" ? "Sperren" : "Ablehnen"}</button>
                    </form>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
