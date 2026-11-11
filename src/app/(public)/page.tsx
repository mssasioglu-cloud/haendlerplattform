import Link from "next/link";
import { site, priceLabel } from "@/config/site";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const benefits = [
  { t: "Unbegrenzt inserieren", d: "Ein Festpreis im Monat, egal ob 5 oder 500 Fahrzeuge. Keine Kosten pro Inserat." },
  { t: "Nur geprüfte Händler", d: "Jeder Account wird anhand des Gewerbenachweises von Hand freigeschaltet. Keine Privatkunden." },
  { t: "Ohne Sachmängelhaftung", d: "Reiner Handel zwischen Unternehmern. Jedes Inserat trägt den B2B-Hinweis." },
  { t: "In 2 Minuten online", d: "Schnell-Formular fürs Handy: Eckdaten, Preis, Fotos, fertig. Ausstattung nur wenn gewünscht." },
  { t: "Gebote und Direktchat", d: "Preisvorschläge annehmen, ablehnen oder kontern. Kontakt per Chat, Telefon oder WhatsApp." },
  { t: "Suchgesuche und Händlerchat", d: "Sagen Sie, was Sie suchen, und lassen Sie sich Fahrzeuge anbieten. Dazu Gruppenchats nach Region." },
];

export default async function Home() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("founding_slots_left", { p_total: site.foundingSlots });
  const left = typeof data === "number" ? data : site.foundingSlots;

  return (
    <>
      <section className="bg-brand-800 text-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-14 md:grid-cols-[1.3fr_1fr] md:py-20">
          <div>
            <p className="mb-3 inline-block rounded-full bg-white/10 px-3 py-1 text-xs font-semibold">
              Nur für Gewerbetreibende
            </p>
            <h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-5xl">
              Inzahlungnahmen schnell an Händlerkollegen verkaufen.
            </h1>
            <p className="mt-4 max-w-xl text-base text-brand-100 sm:text-lg">
              {site.name} ist die Fahrzeugbörse von Händlern für Händler: unbegrenzt inserieren für{" "}
              {priceLabel()} im Monat statt mehrerer tausend Euro auf Endkundenportalen.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/registrieren" className="btn bg-white px-5 py-3 text-brand-800 hover:bg-brand-50">
                Jetzt kostenlos registrieren
              </Link>
              <Link href="/preise" className="btn border border-white/30 px-5 py-3 text-white hover:bg-white/10">
                Preise ansehen
              </Link>
            </div>
          </div>
          <div className="self-center rounded-2xl bg-white p-6 text-ink shadow-xl">
            <p className="text-sm font-semibold text-urgent">Gründerangebot</p>
            <p className="mt-1 text-4xl font-bold tabular-nums">
              {left} <span className="text-lg font-semibold text-muted">von {site.foundingSlots}</span>
            </p>
            <p className="mt-1 text-sm text-muted">Gratisplätzen sind noch frei.</p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-brand-100" aria-hidden>
              <div className="h-full bg-brand-600" style={{ width: `${((site.foundingSlots - left) / site.foundingSlots) * 100}%` }} />
            </div>
            <p className="mt-4 text-sm">
              Die ersten {site.foundingSlots} freigeschalteten Händler nutzen {site.name} dauerhaft kostenlos.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="h1">Warum Händler wechseln</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {benefits.map((b) => (
            <div key={b.t} className="card p-5">
              <h3 className="font-semibold">{b.t}</h3>
              <p className="mt-1 text-sm text-muted">{b.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-line bg-white">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <h2 className="h1">So funktioniert es</h2>
          <ol className="mt-6 grid gap-4 md:grid-cols-3">
            {[
              ["1", "Registrieren", "Firmendaten eintragen und Gewerbenachweis hochladen."],
              ["2", "Freischaltung", "Wir prüfen den Nachweis und schalten Ihren Account frei."],
              ["3", "Handeln", "Fahrzeuge einstellen, suchen, bieten und direkt mit Kollegen abschließen."],
            ].map(([n, t, d]) => (
              <li key={n} className="flex gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-600 font-bold text-white">{n}</span>
                <div>
                  <p className="font-semibold">{t}</p>
                  <p className="text-sm text-muted">{d}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-8">
            <Link href="/registrieren" className="btn btn-primary px-5 py-3">Händler-Account anlegen</Link>
          </div>
        </div>
      </section>
    </>
  );
}
