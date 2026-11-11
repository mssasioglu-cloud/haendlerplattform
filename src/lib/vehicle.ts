export const CATEGORIES = [
  { value: "pkw", label: "Pkw" },
  { value: "transporter", label: "Transporter / Nutzfahrzeug" },
  { value: "motorrad", label: "Motorrad" },
  { value: "wohnmobil", label: "Wohnmobil / Wohnwagen" },
  { value: "lkw", label: "Lkw" },
  { value: "sonstiges", label: "Sonstiges" },
] as const;

export const FUELS = ["Benzin", "Diesel", "Elektro", "Hybrid", "Plug-in-Hybrid", "Autogas (LPG)", "Erdgas (CNG)", "Sonstige"];
export const TRANSMISSIONS = ["Schaltgetriebe", "Automatik", "Halbautomatik"];
export const COLORS = ["Schwarz", "Grau", "Silber", "Weiß", "Blau", "Rot", "Grün", "Braun", "Beige", "Gelb", "Orange", "Gold", "Violett", "Sonstige"];

export const MAKES: Record<string, string[]> = {
  pkw: ["Alfa Romeo", "Audi", "BMW", "BYD", "Chevrolet", "Citroën", "Cupra", "Dacia", "Fiat", "Ford", "Honda", "Hyundai", "Jaguar", "Jeep", "Kia", "Land Rover", "Lexus", "Mazda", "Mercedes-Benz", "MG", "Mini", "Mitsubishi", "Nissan", "Opel", "Peugeot", "Polestar", "Porsche", "Renault", "Seat", "Skoda", "Smart", "Subaru", "Suzuki", "Tesla", "Toyota", "Volkswagen", "Volvo"],
  transporter: ["Citroën", "Fiat", "Ford", "Iveco", "MAN", "Mercedes-Benz", "Nissan", "Opel", "Peugeot", "Renault", "Toyota", "Volkswagen"],
  motorrad: ["Aprilia", "BMW", "Ducati", "Harley-Davidson", "Honda", "Kawasaki", "KTM", "Piaggio", "Suzuki", "Triumph", "Vespa", "Yamaha"],
  wohnmobil: ["Adria", "Bürstner", "Carado", "Carthago", "Dethleffs", "Fendt", "Hobby", "Hymer", "Knaus", "Pössl", "Sunlight", "Weinsberg"],
  lkw: ["DAF", "Iveco", "MAN", "Mercedes-Benz", "Renault", "Scania", "Volvo"],
  sonstiges: [],
};
export const ALL_MAKES = Array.from(new Set(Object.values(MAKES).flat())).sort((a, b) => a.localeCompare(b, "de"));

export const FEATURES: Record<string, string[]> = {
  Komfort: ["Klimaanlage", "Klimaautomatik", "Sitzheizung", "Lederausstattung", "Tempomat", "Abstandstempomat", "Standheizung", "Elektr. Sitze", "Panoramadach", "Schiebedach", "Keyless Go", "Elektr. Heckklappe"],
  Multimedia: ["Navigationssystem", "Apple CarPlay / Android Auto", "Bluetooth", "Head-up-Display", "Soundsystem", "Digitales Cockpit"],
  Sicherheit: ["Einparkhilfe", "Rückfahrkamera", "360°-Kamera", "Spurhalteassistent", "Totwinkelassistent", "Notbremsassistent", "LED-Scheinwerfer", "Xenon", "Isofix"],
  Sonstiges: ["Anhängerkupplung", "Allrad", "Leichtmetallfelgen", "Winterreifen", "8-fach bereift", "Sportpaket", "Nichtraucherfahrzeug", "Scheckheftgepflegt"],
};

// Zusatzfelder je Fahrzeugart (werden im JSON-Feld "extra" gespeichert)
export const EXTRA_FIELDS: Record<string, { key: string; label: string; unit?: string }[]> = {
  pkw: [{ key: "tueren", label: "Türen" }, { key: "sitze", label: "Sitzplätze" }],
  transporter: [{ key: "aufbau", label: "Aufbau (z. B. Kasten, Pritsche)" }, { key: "nutzlast", label: "Nutzlast", unit: "kg" }, { key: "gesamtgewicht", label: "Zul. Gesamtgewicht", unit: "kg" }],
  motorrad: [{ key: "hubraum", label: "Hubraum", unit: "ccm" }, { key: "typ", label: "Typ (z. B. Naked, Enduro)" }],
  wohnmobil: [{ key: "schlafplaetze", label: "Schlafplätze" }, { key: "laenge", label: "Länge", unit: "m" }, { key: "gesamtgewicht", label: "Zul. Gesamtgewicht", unit: "kg" }],
  lkw: [{ key: "aufbau", label: "Aufbau" }, { key: "achsen", label: "Achsen" }, { key: "gesamtgewicht", label: "Zul. Gesamtgewicht", unit: "kg" }],
  sonstiges: [],
};

export const VAT_LABEL: Record<string, string> = {
  ausweisbar: "MwSt. ausweisbar",
  differenz: "Differenzbesteuert (§ 25a UStG)",
};

export const B2B_NOTICE =
  "Verkauf ausschließlich an Gewerbetreibende (Unternehmer i. S. d. § 14 BGB) unter Ausschluss der Sachmängelhaftung.";

export function categoryLabel(v: string | null | undefined) {
  return CATEGORIES.find((c) => c.value === v)?.label ?? "";
}
