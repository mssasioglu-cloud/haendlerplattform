import Link from "next/link";
import { site, priceLabel } from "@/config/site";
import { createClient } from "@/lib/supabase/server";
import { SavingsCalculator } from "@/components/SavingsCalculator";

export const dynamic = "force-dynamic";

const benefits: [string, string][] = [
  ["Unbegrenzt inserieren", "Ein Festpreis im Monat, egal ob 5 oder 500 Fahrzeuge. Keine Kosten pro Inserat."],
  ["Ehrliche Inserate", "Mängel-Checkliste und Pflichtfotos bei jedem Fahrzeug. Sie wissen vor der Anfahrt, was Sie erwartet."],
  ["Immer aktueller Bestand", "Inserate laufen nach 30 Tagen ab, wenn der Händler sie nicht bestätigt. Keine verkauften Karteileichen."],
  ["Nur geprüfte Händler", "Jeder Account wird anhand des Gewerbenachweises von Hand freigeschaltet. Keine Privatkunden."],
  ["Ohne Sachmängelhaftung", "Reiner Handel zwischen Unternehmern. Jedes Inserat trägt den B2B-Hinweis."],
  ["In zwei Minuten online", "Schnell-Formular fürs Handy: Eckdaten, Preis, Fotos. Ausstattung nur, wenn gewünscht."],
  ["Gebote und Direktchat", "Preisvorschläge annehmen, ablehnen oder kontern. Kontakt per Chat, Telefon oder WhatsApp."],
  ["Gesuche und Händlerchat", "Sagen Sie, was Sie suchen, und lassen Sie sich Fahrzeuge anbieten. Dazu Gruppenchats nach Region."],
];

// Beispielzeilen für die Handelsliste im Kopfbereich (reine Illustration)
const sample: [string, string, string, string, boolean][] = [
  ["VW Golf 2.0 TDI", "05/2018 · 98.000 km", "Köln", "11.900", true],
  ["BMW 320d Touring", "03/2017 · 142.000 km", "Düsseldorf", "17.850", false],
  ["Mercedes Sprinter 316", "11/2019 · 121.000 km", "Hamburg", "22.400", false],
  ["Audi A6 Avant 40 TDI", "09/2019 · 88.000 km", "München", "24.900", true],
  ["Ford Transit Custom", "02/2020 · 76.000 km", "Leipzig", "18.300", false],
];

export default async function Home() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("founding_slots_left", { p_total: site.foundingSlots });
  const left = typeof data === "number" ? data : site.foundingSlots;

  return (
    <>
      <section className="bg-brand-800 text-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 pb-14 pt-10 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:pb-20 lg:pt-16">
          <div>
            <p className="eyebrow text-accent">Fahrzeugbörse · nur für Gewerbetreibende</p>
            <h1 className="mt-4 font-display text-5xl font-extrabold uppercase leading-[0.95] tracking-wide sm:text-7xl">
              Von Händler<br />zu Händler.<br /><span className="text-accent">Schnell weg.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base text-brand-200 sm:text-lg">
              Inzahlungnahmen und Standuhren direkt an Kollegen verkaufen: unbegrenzt inserieren
              für {priceLabel()} im Monat statt mehrerer tausend Euro auf Endkundenportalen.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/registrieren" className="btn btn-primary px-6 py-3 text-base">Jetzt kostenlos registrieren</Link>
              <Link href="/preise" className="btn btn-ghost px-6 py-3 text-base">Preise ansehen</Link>
            </div>
            <dl className="mt-9 flex flex-wrap gap-x-10 gap-y-4 border-t border-white/10 pt-6">
              <div>
                <dt className="eyebrow text-brand-200">Gründerplätze frei</dt>
                <dd className="price mt-1 text-4xl text-accent">{left}<span className="text-xl text-brand-200"> / {site.foundingSlots}</span></dd>
              </div>
              <div>
                <dt className="eyebrow text-brand-200">Pro Monat</dt>
                <dd className="price mt-1 text-4xl">{priceLabel()}</dd>
              </div>
              <div>
                <dt className="eyebrow text-brand-200">Inserate</dt>
                <dd className="price mt-1 text-4xl">Unbegrenzt</dd>
              </div>
            </dl>
          </div>

          <div aria-hidden className="relative">
            <div className="hatch absolute -right-2 -top-2 h-full w-full rounded-lg opacity-90" />
            <div className="relative overflow-hidden rounded-lg border border-white/10 bg-brand-900">
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
                <span className="eyebrow text-brand-200">Handelsliste · Beispiel</span>
                <span className="flex items-center gap-1.5 font-mono text-[11px] text-accent">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent" /> LIVE
                </span>
              </div>
              <ul>
                {sample.map(([car, meta, city, price, urgent]) => (
                  <li key={car} className="flex items-center justify-between gap-3 border-b border-white/5 px-4 py-3 last:border-0">
                    <div className="min-w-0">
                      <p className="truncate font-display text-lg font-semibold uppercase leading-tight tracking-wide">{car}</p>
                      <p className="truncate font-mono text-[11px] text-brand-200">{meta} · {city}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      {urgent && <span className="badge hidden bg-urgent text-white sm:inline-flex">Muss weg</span>}
                      <span className="price text-2xl text-accent">{price} €</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
        <div className="hatch h-2" aria-hidden />
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-14">
        <p className="eyebrow">Ersparnisrechner</p>
        <h2 className="mb-6 mt-2 font-display text-4xl font-extrabold uppercase leading-none tracking-wide">Was bleibt bei Ihnen hängen?</h2>
        <SavingsCalculator priceMonthly={site.priceMonthly} />
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <p className="eyebrow">Warum Händler wechseln</p>
        <h2 className="mt-2 font-display text-4xl font-extrabold uppercase leading-none tracking-wide">Ein Werkzeug, kein Schaufenster</h2>
        <dl className="mt-8 grid gap-x-10 sm:grid-cols-2">
          {benefits.map(([t, d]) => (
            <div key={t} className="flex gap-4 border-t border-brand-200 py-5">
              <span className="mt-1.5 h-3 w-3 shrink-0 bg-accent" aria-hidden />
              <div>
                <dt className="h2">{t}</dt>
                <dd className="mt-1 text-sm text-muted">{d}</dd>
              </div>
            </div>
          ))}
        </dl>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <p className="eyebrow">So funktioniert es</p>
          <h2 className="mt-2 font-display text-4xl font-extrabold uppercase leading-none tracking-wide">In drei Schritten im Handel</h2>
          <ol className="mt-8 grid gap-6 md:grid-cols-3">
            {[
              ["Registrieren", "Firmendaten eintragen und Gewerbenachweis hochladen."],
              ["Freischaltung", "Wir prüfen den Nachweis und schalten Ihren Account frei."],
              ["Handeln", "Fahrzeuge einstellen, suchen, bieten und direkt mit Kollegen abschließen."],
            ].map(([t, d], i) => (
              <li key={t} className="border-l-4 border-accent pl-4">
                <span className="price block text-5xl text-brand-200">{i + 1}</span>
                <p className="h2 mt-2">{t}</p>
                <p className="mt-1 text-sm text-muted">{d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="bg-accent">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-5 px-4 py-10 md:flex-row md:items-center">
          <div>
            <h2 className="font-display text-4xl font-extrabold uppercase leading-none tracking-wide">Noch {left} von {site.foundingSlots} Gratisplätzen</h2>
            <p className="mt-2 max-w-xl text-sm">
              Die ersten {site.foundingSlots} freigeschalteten Händler nutzen {site.name} dauerhaft kostenlos.
            </p>
          </div>
          <Link href="/registrieren" className="btn btn-dark px-6 py-3 text-base">Händler-Account anlegen</Link>
        </div>
      </section>
    </>
  );
}
