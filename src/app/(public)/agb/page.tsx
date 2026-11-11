import { site, priceLabel } from "@/config/site";
import { DraftBanner } from "@/components/DraftBanner";

export const metadata = { title: "AGB" };

export default function Agb() {
  return (
    <div className="prose-legal mx-auto max-w-3xl px-4 py-12">
      <h1 className="h1 mb-4">Allgemeine Geschäftsbedingungen</h1>
      <DraftBanner />
      <h2>§ 1 Geltungsbereich und Vertragspartner</h2>
      <p>
        Diese Bedingungen gelten für die Nutzung der Online-Plattform {site.name} (nachfolgend „Plattform“),
        betrieben von {site.company.name} (nachfolgend „Betreiber“). Die Plattform richtet sich ausschließlich an
        Unternehmer im Sinne des § 14 BGB. Verbraucher im Sinne des § 13 BGB sind von der Nutzung ausgeschlossen.
      </p>
      <h2>§ 2 Leistung der Plattform</h2>
      <p>
        Der Betreiber stellt einen Online-Marktplatz bereit, auf dem gewerbliche Fahrzeughändler Fahrzeuge
        inserieren, suchen und miteinander in Kontakt treten können. Der Betreiber ist nicht Verkäufer, Käufer
        oder Vermittler im Sinne eines Maklervertrags und wird nicht Partei der zwischen Nutzern geschlossenen
        Verträge. Für Inhalt, Richtigkeit und Rechtmäßigkeit der Inserate ist allein der inserierende Nutzer
        verantwortlich.
      </p>
      <h2>§ 3 Registrierung und Freischaltung</h2>
      <ul>
        <li>Die Registrierung setzt den Nachweis einer gewerblichen Tätigkeit voraus (z. B. Gewerbeanmeldung, Handelsregisterauszug).</li>
        <li>Der Betreiber prüft die Angaben und entscheidet über die Freischaltung. Ein Anspruch auf Freischaltung besteht nicht.</li>
        <li>Der Nutzer versichert, bei jeder Nutzung der Plattform ausschließlich in Ausübung seiner gewerblichen oder selbständigen beruflichen Tätigkeit zu handeln.</li>
        <li>Zugangsdaten sind geheim zu halten. Änderungen der Firmendaten sind unverzüglich mitzuteilen.</li>
      </ul>
      <h2>§ 4 Preise und Zahlung</h2>
      <ul>
        <li>Die Nutzung kostet {priceLabel()} pro Monat zuzüglich gesetzlicher Umsatzsteuer und umfasst eine unbegrenzte Anzahl an Inseraten.</li>
        <li>Die ersten {site.foundingSlots} freigeschalteten Nutzer („Gründerplätze“) nutzen die Plattform dauerhaft kostenfrei, solange der Account besteht und nicht wegen Verstößen gesperrt wird.</li>
        <li>Die Abrechnung erfolgt monatlich im Voraus über den Zahlungsdienstleister Stripe.</li>
      </ul>
      <h2>§ 5 Laufzeit und Kündigung</h2>
      <p>
        Das Abonnement läuft auf unbestimmte Zeit und kann jederzeit zum Ende des laufenden Abrechnungsmonats
        gekündigt werden. Das Recht zur außerordentlichen Kündigung bleibt unberührt.
      </p>
      <h2>§ 6 Pflichten der Nutzer</h2>
      <ul>
        <li>Inserate müssen wahrheitsgemäß sein. Bekannte Mängel, Unfallschäden und die Besteuerungsart sind anzugeben.</li>
        <li>Es dürfen nur Fahrzeuge angeboten werden, über die der Nutzer verfügen darf.</li>
        <li>Verkaufte Fahrzeuge sind unverzüglich als verkauft zu kennzeichnen oder zu entfernen.</li>
        <li>Beleidigende, rechtswidrige oder werbliche Inhalte ohne Fahrzeugbezug sind in Chats und Gesuchen untersagt.</li>
      </ul>
      <h2>§ 7 Verträge zwischen Nutzern, Gewährleistung</h2>
      <p>
        Kaufverträge kommen ausschließlich zwischen den beteiligten Nutzern zustande. Die Nutzer vereinbaren
        ihre Vertragsbedingungen selbst. Soweit Inserate den Hinweis „Verkauf unter Ausschluss der
        Sachmängelhaftung“ tragen, handelt es sich um ein Angebot des jeweiligen Verkäufers gegenüber
        Unternehmern. Ein solcher Ausschluss gilt nach dem Gesetz nicht bei arglistig verschwiegenen Mängeln und
        nicht, soweit eine Beschaffenheitsgarantie übernommen wurde. Ein über die Plattform angenommenes Gebot
        dokumentiert die Preiseinigung; den Kaufvertrag schließen die Nutzer anschließend untereinander.
      </p>
      <h2>§ 8 Sperrung</h2>
      <p>
        Der Betreiber kann Inserate entfernen und Accounts vorübergehend oder dauerhaft sperren, wenn konkrete
        Anhaltspunkte für einen Verstoß gegen diese Bedingungen oder geltendes Recht vorliegen.
      </p>
      <h2>§ 9 Haftung des Betreibers</h2>
      <p>
        Der Betreiber haftet unbeschränkt bei Vorsatz und grober Fahrlässigkeit sowie bei Verletzung von Leben,
        Körper und Gesundheit. Bei leicht fahrlässiger Verletzung wesentlicher Vertragspflichten ist die Haftung
        auf den vertragstypischen, vorhersehbaren Schaden begrenzt. Im Übrigen ist die Haftung ausgeschlossen.
        Der Betreiber übernimmt keine Gewähr für die Bonität der Nutzer oder die Beschaffenheit der Fahrzeuge.
      </p>
      <h2>§ 10 Schlussbestimmungen</h2>
      <p>
        Es gilt deutsches Recht unter Ausschluss des UN-Kaufrechts. Gerichtsstand ist, soweit zulässig, der Sitz
        des Betreibers. Sollten einzelne Bestimmungen unwirksam sein, bleibt der Vertrag im Übrigen wirksam.
      </p>
    </div>
  );
}
