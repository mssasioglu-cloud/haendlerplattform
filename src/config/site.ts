// Zentrale Einstellungen der Plattform. Name, Preis und Gratisplätze hier ändern.
export const site = {
  name: "HändlerDeal",
  claim: "Die Fahrzeugbörse von Händlern für Händler",
  priceMonthly: 19.9,
  foundingSlots: 100,
  supportEmail: "kontakt@example.de",
  company: {
    name: "[Firmenname eintragen]",
    street: "[Straße und Hausnummer]",
    city: "[PLZ Ort]",
    represented: "[Vertretungsberechtigte Person]",
    register: "[Registergericht und Nummer]",
    vatId: "[USt-IdNr.]",
    phone: "[Telefon]",
  },
} as const;

export const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export function priceLabel() {
  return site.priceMonthly.toLocaleString("de-DE", { style: "currency", currency: "EUR" });
}
