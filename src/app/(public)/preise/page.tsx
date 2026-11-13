import Link from "next/link";
import { site, priceLabel } from "@/config/site";

export const metadata = { title: "Preise" };

export default function Preise() {
  const included = [
    "Unbegrenzt viele Inserate in allen Fahrzeugarten",
    "Suche mit Umkreis, Filtern und Suchaufträgen per E-Mail",
    "Direktchat, Gebote und Gegenangebote",
    "Suchgesuche-Board und Händler-Gruppenchats",
    "Händlerprofil mit Bewertungen",
    "Monatlich kündbar",
  ];
  return (
    <>
      <section className="bg-brand-800 text-white">
        <div className="mx-auto max-w-4xl px-4 pb-24 pt-12">
          <p className="eyebrow text-accent">Preise</p>
          <h1 className="mt-3 font-display text-5xl font-extrabold uppercase leading-none tracking-wide sm:text-6xl">Ein Preis. Alles drin.</h1>
          <p className="mt-3 text-brand-200">Keine Kosten pro Inserat, keine Pakete, keine Mindestlaufzeit.</p>
        </div>
      </section>
      <div className="mx-auto -mt-16 max-w-4xl px-4 pb-14">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="card border-2 border-accent p-6">
            <p className="eyebrow">Gründerplatz</p>
            <p className="price mt-3 text-6xl">0 €</p>
            <p className="mt-2 text-sm text-muted">dauerhaft, für die ersten {site.foundingSlots} freigeschalteten Händler</p>
            <Link href="/registrieren" className="btn btn-primary mt-5 w-full py-3">Gratisplatz sichern</Link>
          </div>
          <div className="card p-6">
            <p className="eyebrow">Händler-Flatrate</p>
            <p className="price mt-3 text-6xl">{priceLabel()}</p>
            <p className="mt-2 text-sm text-muted">pro Monat zzgl. MwSt., ab Händler {site.foundingSlots + 1}</p>
            <Link href="/registrieren" className="btn btn-dark mt-5 w-full py-3">Registrieren</Link>
          </div>
        </div>
        <div className="card mt-4 p-6">
          <h2 className="h2">In beiden Fällen enthalten</h2>
          <ul className="mt-4 grid gap-2.5 text-sm sm:grid-cols-2">
            {included.map((i) => (
              <li key={i} className="flex gap-2.5"><span className="mt-1.5 h-2.5 w-2.5 shrink-0 bg-accent" aria-hidden />{i}</li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}
