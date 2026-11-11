import { site } from "@/config/site";
import { DraftBanner } from "@/components/DraftBanner";

export const metadata = { title: "Datenschutz" };

export default function Datenschutz() {
  return (
    <div className="prose-legal mx-auto max-w-3xl px-4 py-12">
      <h1 className="h1 mb-4">Datenschutzerklärung</h1>
      <DraftBanner />
      <h2>1. Verantwortlicher</h2>
      <p>{site.company.name}, {site.company.street}, {site.company.city}. E-Mail: {site.supportEmail}</p>
      <h2>2. Welche Daten wir verarbeiten</h2>
      <ul>
        <li>Account-Daten: E-Mail-Adresse, Passwort (verschlüsselt gespeichert).</li>
        <li>Firmendaten: Firma, Ansprechpartner, Anschrift, Telefon, WhatsApp-Nummer, USt-IdNr., Gewerbenachweis.</li>
        <li>Inhalte: Inserate, Fotos, Nachrichten, Gebote, Gesuche, Chatbeiträge, Bewertungen.</li>
        <li>Zahlungsdaten: werden direkt vom Zahlungsdienstleister verarbeitet; wir speichern nur Kunden- und Abo-Kennungen sowie den Abo-Status.</li>
        <li>Technische Daten: IP-Adresse und Zugriffszeitpunkte in Server-Protokollen.</li>
      </ul>
      <h2>3. Zwecke und Rechtsgrundlagen</h2>
      <p>
        Bereitstellung der Plattform und Durchführung des Nutzungsvertrags (Art. 6 Abs. 1 lit. b DSGVO), Prüfung
        der Gewerbeeigenschaft und Missbrauchsvermeidung (Art. 6 Abs. 1 lit. f DSGVO) sowie Erfüllung
        gesetzlicher Aufbewahrungspflichten (Art. 6 Abs. 1 lit. c DSGVO).
      </p>
      <h2>4. Sichtbarkeit für andere Nutzer</h2>
      <p>
        Firma, Ansprechpartner, Ort, Telefon- und WhatsApp-Nummer sowie Inserate, Gesuche, Chatbeiträge und
        Bewertungen sind für andere freigeschaltete Händler sichtbar. Gewerbenachweis, USt-IdNr. und
        E-Mail-Adresse sind nur für Sie und die Plattform-Administration einsehbar.
      </p>
      <h2>5. Auftragsverarbeiter</h2>
      <ul>
        <li>Supabase (Datenbank, Anmeldung, Dateiablage), Serverstandort Frankfurt am Main.</li>
        <li>Vercel (Hosting der Website).</li>
        <li>Stripe Payments Europe Ltd. (Zahlungsabwicklung).</li>
        <li>Resend (Versand von Benachrichtigungs-E-Mails).</li>
      </ul>
      <p>[Angaben zu Drittlandübermittlungen und abgeschlossenen Auftragsverarbeitungsverträgen ergänzen.]</p>
      <h2>6. Cookies</h2>
      <p>
        Wir setzen ausschließlich technisch notwendige Cookies ein, um Sie angemeldet zu halten. Es findet kein
        Tracking zu Werbezwecken statt.
      </p>
      <h2>7. Speicherdauer</h2>
      <p>
        Wir speichern Ihre Daten, solange Ihr Account besteht. Nach Löschung des Accounts werden die Daten
        gelöscht, soweit keine gesetzlichen Aufbewahrungspflichten entgegenstehen.
      </p>
      <h2>8. Ihre Rechte</h2>
      <p>
        Sie haben das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung,
        Datenübertragbarkeit und Widerspruch sowie das Recht, sich bei einer Datenschutzaufsichtsbehörde zu
        beschweren. Wenden Sie sich dazu an {site.supportEmail}.
      </p>
    </div>
  );
}
