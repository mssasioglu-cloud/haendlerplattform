import { site } from "@/config/site";
import { DraftBanner } from "@/components/DraftBanner";

export const metadata = { title: "Impressum" };

export default function Impressum() {
  const c = site.company;
  return (
    <div className="prose-legal mx-auto max-w-3xl px-4 py-12">
      <h1 className="h1 mb-4">Impressum</h1>
      <DraftBanner />
      <h2>Angaben gemäß § 5 DDG</h2>
      <p>{c.name}<br />{c.street}<br />{c.city}</p>
      <p>Vertreten durch: {c.represented}</p>
      <h2>Kontakt</h2>
      <p>Telefon: {c.phone}<br />E-Mail: {site.supportEmail}</p>
      <h2>Registereintrag</h2>
      <p>{c.register}</p>
      <h2>Umsatzsteuer-ID</h2>
      <p>Umsatzsteuer-Identifikationsnummer gemäß § 27a UStG: {c.vatId}</p>
      <h2>Hinweis zur Plattform</h2>
      <p>
        {site.name} richtet sich ausschließlich an Unternehmer im Sinne des § 14 BGB. Die Plattform vermittelt
        lediglich den Kontakt zwischen Händlern und wird nicht Partei der zwischen ihnen geschlossenen Kaufverträge.
      </p>
    </div>
  );
}
