import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAccess } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Gallery } from "@/components/Gallery";
import { MessageForm, OfferForm, ReportForm } from "@/components/ContactForms";
import { FavoriteButton } from "@/components/FavoriteButton";
import { Stars } from "@/components/Stars";
import { setListingStatus, toggleUrgent, deleteListing } from "@/app/actions/listings";
import { eur, km, monthYear, ps, prices, imageUrl, whatsappLink, dateDe, absoluteUrl } from "@/lib/format";
import { VAT_LABEL, B2B_NOTICE, EXTRA_FIELDS, categoryLabel } from "@/lib/vehicle";
import type { Listing, Dealer } from "@/lib/types";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("listings").select("make, model").eq("id", id).maybeSingle();
  return { title: data ? `${data.make} ${data.model}` : "Inserat" };
}

const yesNo = (b: boolean | null) => (b == null ? null : b ? "Ja" : "Nein");

export default async function Inserat({ params }: { params: Promise<{ id: string }> }) {
  const s = await requireAccess();
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("listings").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const l = data as Listing;
  const mine = l.dealer_id === s.userId;

  const [{ data: imgs }, { data: dealer }, { data: reviews }, { data: fav }, { data: myOffer }] = await Promise.all([
    supabase.from("listing_images").select("path").eq("listing_id", id).order("position"),
    supabase.from("dealers").select("*").eq("id", l.dealer_id).maybeSingle(),
    supabase.from("reviews").select("rating").eq("dealer_id", l.dealer_id),
    supabase.from("favorites").select("listing_id").eq("dealer_id", s.userId).eq("listing_id", id).maybeSingle(),
    supabase.from("offers").select("amount, counter_amount, status").eq("listing_id", id).eq("buyer_id", s.userId)
      .in("status", ["offen", "gegenangebot", "angenommen"]).order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const d = dealer as Dealer | null;
  const p = prices(l);
  const title = `${l.make} ${l.model}${l.variant ? " " + l.variant : ""}`;
  const rating = reviews?.length ? reviews.reduce((a, r) => a + r.rating, 0) / reviews.length : null;

  const facts: [string, string | null][] = [
    ["Fahrzeugart", categoryLabel(l.category)],
    ["Erstzulassung", l.first_registration ? monthYear(l.first_registration) : null],
    ["Kilometerstand", l.mileage != null ? km(l.mileage) : null],
    ["Kraftstoff", l.fuel],
    ["Getriebe", l.transmission],
    ["Leistung", l.power_kw != null ? ps(l.power_kw) : null],
    ["Farbe", l.color],
    ["HU bis", l.hu_until ? monthYear(l.hu_until) : null],
    ["Vorbesitzer", l.owners != null ? String(l.owners) : null],
    ["Unfallfrei", yesNo(l.accident_free)],
    ["Scheckheftgepflegt", yesNo(l.service_history)],
    ["Fahrbereit", l.roadworthy ? "Ja" : "Nein"],
    ["FIN", l.vin],
    ...(EXTRA_FIELDS[l.category] ?? []).map((f): [string, string | null] =>
      [f.label.split(" (")[0], l.extra?.[f.key] ? `${l.extra[f.key]}${f.unit ? " " + f.unit : ""}` : null]),
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="min-w-0 space-y-5">
        <div>
          <Link href="/suche" className="text-sm text-brand-600">← Zur Suche</Link>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {l.urgent && <span className="badge bg-urgent text-white">Muss schnell weg</span>}
            {l.status !== "aktiv" && <span className="badge bg-ink text-white capitalize">{l.status}</span>}
          </div>
          <h1 className="h1 mt-1">{title}</h1>
          <p className="text-sm text-muted">{l.zip} {l.city} · eingestellt am {dateDe(l.created_at)}</p>
        </div>

        <Gallery images={(imgs ?? []).map((i) => imageUrl(i.path)!)} alt={title} />

        <section className="card p-5">
          <h2 className="mb-3 font-semibold">Fahrzeugdaten</h2>
          <dl className="grid grid-cols-1 gap-x-8 text-sm sm:grid-cols-2">
            {facts.filter(([, v]) => v).map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 border-b border-line py-2">
                <dt className="text-muted">{k}</dt>
                <dd className="text-right font-medium">{v}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="card p-5">
          <h2 className="mb-2 font-semibold">Mängel und Schäden</h2>
          <p className="whitespace-pre-line text-sm">{l.damage_notes || "Vom Händler wurden keine Mängel angegeben."}</p>
        </section>

        {l.features.length > 0 && (
          <section className="card p-5">
            <h2 className="mb-3 font-semibold">Ausstattung</h2>
            <ul className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm sm:grid-cols-3">
              {l.features.map((f) => <li key={f} className="flex gap-2"><span className="text-brand-600" aria-hidden>✓</span>{f}</li>)}
            </ul>
          </section>
        )}

        {l.description && (
          <section className="card p-5">
            <h2 className="mb-2 font-semibold">Beschreibung</h2>
            <p className="whitespace-pre-line text-sm">{l.description}</p>
          </section>
        )}

        <p className="notice notice-info">{B2B_NOTICE}</p>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-28 lg:self-start">
        <div className="card p-5">
          <p className="text-3xl font-bold tabular-nums">{eur(p.gross)}</p>
          {p.net != null
            ? <p className="text-sm text-muted">{eur(p.net)} netto · {VAT_LABEL.ausweisbar}</p>
            : <p className="text-sm text-muted">{VAT_LABEL.differenz}, MwSt. nicht ausweisbar</p>}
          {!mine && <div className="mt-3"><FavoriteButton listingId={l.id} initial={!!fav} withLabel /></div>}
        </div>

        {d && (
          <div className="card p-5">
            <p className="text-xs font-semibold text-muted">Anbieter</p>
            <Link href={`/haendler/${d.id}`} className="font-semibold text-brand-700 hover:underline">{d.company_name}</Link>
            <p className="text-sm text-muted">{d.contact_name} · {d.zip} {d.city}</p>
            <div className="mt-1"><Stars value={rating} count={reviews?.length ?? 0} /></div>
            {!mine && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                {d.phone && <a href={`tel:${d.phone.replace(/[^\d+]/g, "")}`} className="btn btn-secondary">Anrufen</a>}
                {d.whatsapp && (
                  <a href={whatsappLink(d.whatsapp, `Hallo, ich interessiere mich für Ihren ${title}: ${absoluteUrl(`/inserat/${l.id}`)}`)}
                    target="_blank" rel="noopener noreferrer" className="btn btn-secondary">WhatsApp</a>
                )}
              </div>
            )}
            {!mine && d.phone && <p className="mt-2 text-sm text-muted">Tel. {d.phone}</p>}
          </div>
        )}

        {mine ? (
          <div className="card space-y-2 p-5">
            <p className="font-semibold">Ihr Inserat</p>
            <Link href={`/inserat/${l.id}/bearbeiten`} className="btn btn-primary w-full">Bearbeiten</Link>
            <form action={toggleUrgent}>
              <input type="hidden" name="id" value={l.id} />
              <input type="hidden" name="urgent" value={l.urgent ? "0" : "1"} />
              <button className="btn btn-secondary w-full">{l.urgent ? "„Muss schnell weg“ entfernen" : "Als „Muss schnell weg“ markieren"}</button>
            </form>
            <div className="grid grid-cols-3 gap-2">
              {(["aktiv", "reserviert", "verkauft"] as const).map((st) => (
                <form key={st} action={setListingStatus}>
                  <input type="hidden" name="id" value={l.id} />
                  <input type="hidden" name="status" value={st} />
                  <button className={`btn btn-sm w-full capitalize ${l.status === st ? "btn-primary" : "btn-secondary"}`} disabled={l.status === st}>{st}</button>
                </form>
              ))}
            </div>
            <form action={deleteListing}>
              <input type="hidden" name="id" value={l.id} />
              <button className="btn btn-danger w-full">Inserat löschen</button>
            </form>
          </div>
        ) : (
          <>
            <div className="card p-5"><MessageForm listingId={l.id} /></div>
            <div className="card p-5">
              {myOffer && (
                <p className="notice notice-info mb-3">
                  Ihr Gebot: {eur(myOffer.amount)} ({myOffer.status === "gegenangebot" ? `Gegenangebot ${eur(myOffer.counter_amount)}` : myOffer.status}).{" "}
                  <Link href="/gebote" className="font-semibold underline">Zu den Geboten</Link>
                </p>
              )}
              <OfferForm listingId={l.id} />
            </div>
            <ReportForm listingId={l.id} />
          </>
        )}
      </aside>
    </div>
  );
}
