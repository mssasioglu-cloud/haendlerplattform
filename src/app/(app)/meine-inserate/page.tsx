import Link from "next/link";
import { requireAccess } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { setListingStatus, toggleUrgent, extendListing } from "@/app/actions/listings";
import { eur, km, monthYear, imageUrl, dateDe, daysLeft } from "@/lib/format";
import { COMPLETE_FROM } from "@/lib/quality";

export const metadata = { title: "Meine Inserate" };

export default async function MeineInserate() {
  const s = await requireAccess();
  const supabase = await createClient();
  const { data } = await supabase.from("listings")
    .select("id, make, model, variant, price_gross, mileage, first_registration, status, urgent, created_at, expires_at, quality_score, listing_images(path, position)")
    .eq("dealer_id", s.userId).order("created_at", { ascending: false });
  const rows = data ?? [];
  const active = rows.filter((r) => r.status === "aktiv" && daysLeft(r.expires_at) > 0).length;

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="h1">Meine Inserate</h1>
          <p className="text-sm text-muted">{rows.length} gesamt, {active} aktiv</p>
        </div>
        <Link href="/inserieren" className="btn btn-primary">+ Fahrzeug inserieren</Link>
      </div>
      {rows.length === 0 && (
        <div className="card p-8 text-center">
          <p className="font-semibold">Sie haben noch kein Fahrzeug eingestellt.</p>
          <p className="mt-1 text-sm text-muted">Das Schnell-Formular dauert etwa zwei Minuten.</p>
        </div>
      )}
      <div className="space-y-3">
        {rows.map((r) => {
          const cover = [...(r.listing_images ?? [])].sort((a, b) => a.position - b.position)[0]?.path;
          return (
            <div key={r.id} className="card flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
              <Link href={`/inserat/${r.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                <span className="block h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-brand-50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {cover && <img src={imageUrl(cover)!} alt="" className="h-full w-full object-cover" />}
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{r.make} {r.model} {r.variant}</span>
                  <span className="block text-sm text-muted">
                    {eur(r.price_gross)} · {km(r.mileage)} · EZ {monthYear(r.first_registration)} · seit {dateDe(r.created_at)}
                  </span>
                  <span className="mt-1 flex flex-wrap gap-1.5">
                    <span className={`badge capitalize ${r.status === "aktiv" ? "bg-emerald-100 text-emerald-800" : "bg-line text-ink"}`}>{r.status}</span>
                    {r.urgent && <span className="badge bg-urgent-bg text-urgent">Muss schnell weg</span>}
                    {r.status === "aktiv" && (daysLeft(r.expires_at) <= 0
                      ? <span className="badge bg-urgent text-white">Abgelaufen</span>
                      : <span className={`badge ${daysLeft(r.expires_at) <= 5 ? "bg-urgent-bg text-urgent" : "bg-brand-100 text-ink"}`}>läuft in {daysLeft(r.expires_at)} Tagen ab</span>)}
                    <span className={`badge ${r.quality_score >= COMPLETE_FROM ? "bg-emerald-100 text-emerald-800" : "bg-brand-100 text-ink"}`}>{r.quality_score} % vollständig</span>
                  </span>
                </span>
              </Link>
              <div className="flex flex-wrap gap-2">
                <Link href={`/inserat/${r.id}/bearbeiten`} className="btn btn-secondary btn-sm">Bearbeiten</Link>
                <form action={toggleUrgent}>
                  <input type="hidden" name="id" value={r.id} />
                  <input type="hidden" name="urgent" value={r.urgent ? "0" : "1"} />
                  <button className="btn btn-secondary btn-sm">{r.urgent ? "Nicht mehr dringend" : "Dringend"}</button>
                </form>
                {r.status === "aktiv" && daysLeft(r.expires_at) <= 10 && (
                  <form action={extendListing}>
                    <input type="hidden" name="id" value={r.id} />
                    <button className="btn btn-primary btn-sm">30 Tage verlängern</button>
                  </form>
                )}
                <form action={setListingStatus}>
                  <input type="hidden" name="id" value={r.id} />
                  <input type="hidden" name="status" value={r.status === "verkauft" ? "aktiv" : "verkauft"} />
                  <button className="btn btn-secondary btn-sm">{r.status === "verkauft" ? "Wieder aktivieren" : "Verkauft"}</button>
                </form>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
