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
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="h1">Ein Preis. Alles drin.</h1>
      <p className="mt-2 text-muted">Keine Kosten pro Inserat, keine Pakete, keine Mindestlaufzeit.</p>
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <div className="card border-brand-500 p-6">
          <p className="text-sm font-semibold text-urgent">Gründerplatz</p>
          <p className="mt-2 text-4xl font-bold">0 €</p>
          <p className="text-sm text-muted">dauerhaft, für die ersten {site.foundingSlots} freigeschalteten Händler</p>
          <Link href="/registrieren" className="btn btn-primary mt-5 w-full">Gratisplatz sichern</Link>
        </div>
        <div className="card p-6">
          <p className="text-sm font-semibold text-muted">Händler-Flatrate</p>
          <p className="mt-2 text-4xl font-bold">{priceLabel()}</p>
          <p className="text-sm text-muted">pro Monat zzgl. MwSt., ab Händler {site.foundingSlots + 1}</p>
          <Link href="/registrieren" className="btn btn-secondary mt-5 w-full">Registrieren</Link>
        </div>
      </div>
      <div className="card mt-6 p-6">
        <h2 className="font-semibold">In beiden Fällen enthalten</h2>
        <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          {included.map((i) => (
            <li key={i} className="flex gap-2"><span className="text-brand-600" aria-hidden>✓</span>{i}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
