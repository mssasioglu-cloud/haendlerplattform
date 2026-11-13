import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAccess } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Gallery } from "@/components/Gallery";
import { MessageForm, OfferForm, ReportForm } from "@/components/ContactForms";
import { FavoriteButton } from "@/components/FavoriteButton";
import { Stars } from "@/components/Stars";
import { setListingStatus, toggleUrgent, deleteListing, extendListing } from "@/app/actions/listings";
import { eur, km, monthYear, ps, prices, imageUrl, whatsappLink, dateDe, absoluteUrl, standzeit, priceDrop, daysLeft } from "@/lib/format";
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
  const { data: responseHours } = await supabase.rpc("dealer_response_hours", { p_dealer: l.dealer_id });
  const drop = priceDrop(l);
  const expired = daysLeft(l.expires_at) <= 0;
  const shareUrl = absoluteUrl(`/a/${l.id}`);
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
          <Link href="/suche" className="text-sm link">← Zur Suche</Link>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="eyebrow">{categoryLabel(l.category)} · {l.zip} {l.city}</span>
            {l.urgent && <span className="badge bg-urgent text-white">Muss schnell weg</span>}
            {l.status !== "aktiv" && <span className="badge bg-ink text-white capitalize">{l.status}</span>}
          </div>
          <h1 className="mt-1 font-display text-4xl font-extrabold uppercase leading-none tracking-wide sm:text-5xl">{title}</h1>
        </div>

        <dl className="grid grid-cols-2 overflow-hidden rounded-lg bg-brand-800 text-white sm:grid-cols-4">
          {([
            ["Kilometer", l.mileage != null ? km(l.mileage) : "–"],
            ["Erstzulassung", l.first_registration ? monthYear(l.first_registration) : "–"],
            ["Leistung", l.power_kw != null ? `${l.power_kw} kW` : "–"],
            ["Online", standzeit(l.created_at)],
          ] as const).map(([k, v]) => (
            <div key={k} className="border-b border-r border-white/10 px-4 py-3 sm:border-b-0">
              <dt className="eyebrow text-brand-200">{k}</dt>
              <dd className="price mt-1 text-2xl">{v}</dd>
            </div>
          ))}
        </dl>

        <Gallery images={(imgs ?? []).map((i) => imageUrl(i.path)!)} alt={title} />

        <section className="card p-5">
          <h2 className="h2 mb-3">Fahrzeugdaten</h2>
          <dl className="grid grid-cols-1 gap-x-8 text-sm sm:grid-cols-2">
            {facts.filter(([, v]) => v).map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 border-b border-line py-2">
                <dt className="text-muted">{k}</dt>
                <dd className="num text-right font-medium">{v}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="card p-5">
          <h2 className="h2 mb-2">Mängel und Schäden</h2>
          {l.defects?.length > 0 ? (
            <ul className="mb-2 flex flex-wrap gap-1.5">
              {l.defects.map((d) => <li key={d} className="badge bg-urgent-bg text-urgent">{d}</li>)}
            </ul>
          ) : l.no_known_defects ? (
            <p className="badge mb-2 bg-emerald-100 text-emerald-800">Laut Händler keine bekannten Mängel</p>
          ) : null}
          <p className="whitespace-pre-line text-sm">
            {l.damage_notes || (l.defects?.length || l.no_known_defects ? "" : "Vom Händler wurden keine Mängel angegeben.")}
          </p>
        </section>

        {l.features.length > 0 && (
          <section className="card p-5">
            <h2 className="h2 mb-3">Ausstattung</h2>
            <ul className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm sm:grid-cols-3">
              {l.features.map((f) => <li key={f} className="flex gap-2"><span className="font-bold text-accent-600" aria-hidden>✓</span>{f}</li>)}
            </ul>
          </section>
        )}

        {l.description && (
          <section className="card p-5">
            <h2 className="h2 mb-2">Beschreibung</h2>
            <p className="whitespace-pre-line text-sm">{l.description}</p>
          </section>
        )}

        <p className="notice notice-info">{B2B_NOTICE}</p>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-28 lg:self-start">
        <div className="card overflow-hidden">
          <div className="bg-brand-800 px-5 py-4 text-white">
            <p className="eyebrow text-brand-200">Händlerpreis</p>
            <p className="price mt-1 text-5xl text-accent">{eur(p.gross)}</p>
            {drop != null && (
              <p className="num mt-1.5 text-sm font-semibold text-emerald-300">▼ −{eur(drop)} seit {dateDe(l.price_changed_at)} (vorher {eur(l.previous_price_gross)})</p>
            )}
            {p.net != null
              ? <p className="mt-1.5 text-sm text-brand-200">{eur(p.net)} netto · {VAT_LABEL.ausweisbar}</p>
              : <p className="mt-1.5 text-sm text-brand-200">{VAT_LABEL.differenz}, MwSt. nicht ausweisbar</p>}
          </div>
          <div className="hatch h-1.5" aria-hidden />
          <div className="px-5 py-3 text-xs text-muted">
            Eingestellt am {dateDe(l.created_at)}
            {!mine && <div className="mt-2"><FavoriteButton listingId={l.id} initial={!!fav} withLabel /></div>}
          </div>
        </div>

        {d && (
          <div className="card p-5">
            <p className="eyebrow mb-1">Anbieter</p>
            <Link href={`/haendler/${d.id}`} className="link">{d.company_name}</Link>
            <p className="text-sm text-muted">{d.contact_name} · {d.zip} {d.city}</p>
            <div className="mt-1"><Stars value={rating} count={reviews?.length ?? 0} /></div>
            {typeof responseHours === "number" && (
              <p className="mt-1 text-xs text-muted">Antwortet meist innerhalb von {responseHours < 1 ? "einer Stunde" : `${Math.ceil(responseHours)} Stunden`}</p>
            )}
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
            <p className={`num text-xs ${expired ? "font-semibold text-urgent" : "text-muted"}`}>
              {expired ? "Abgelaufen: für andere nicht mehr sichtbar." : `Läuft in ${daysLeft(l.expires_at)} Tagen ab.`}
            </p>
            <form action={extendListing}>
              <input type="hidden" name="id" value={l.id} />
              <button className="btn btn-secondary w-full">30 Tage verlängern</button>
            </form>
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

        <div className="card p-5">
          <p className="eyebrow mb-2">Weitergeben</p>
          <a href={`https://wa.me/?text=${encodeURIComponent(`${title}, EZ ${l.first_registration ? monthYear(l.first_registration) : "–"}, ${l.mileage != null ? km(l.mileage) : ""} – ${shareUrl}`)}`}
            target="_blank" rel="noopener noreferrer" className="btn btn-secondary w-full">Per WhatsApp teilen</a>
          <p className="mt-2 text-xs text-muted">
            Der Link zeigt Foto und Eckdaten. Preis und Händler sieht nur, wer als Händler angemeldet ist.
          </p>
        </div>
      </aside>
    </div>
  );
}
