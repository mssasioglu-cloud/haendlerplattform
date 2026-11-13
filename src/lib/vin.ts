// Fahrgestellnummer (FIN): Prüfung und Verweise auf Dienste, die Händler ohnehin nutzen.
// Die Plattform fragt selbst keine kostenpflichtigen Daten ab; sie reicht die FIN nur weiter.

// 17 Zeichen, ohne I, O und Q (Verwechslungsgefahr mit 1 und 0)
export const VIN_PATTERN = "[A-HJ-NPR-Za-hj-npr-z0-9]{17}";
export function normalizeVin(s: string) {
  return s.replace(/[\s-]/g, "").toUpperCase();
}
export function isValidVin(s: string) {
  return /^[A-HJ-NPR-Z0-9]{17}$/.test(normalizeVin(s));
}

// Fahrzeugarten, bei denen die FIN Pflicht ist
export function vinRequired(category: string) {
  return category !== "sonstiges";
}

// Dienste für Historie und Ausstattung. Hier lassen sich weitere eintragen oder Partner-Parameter ergänzen.
// "prefill": Der Dienst übernimmt die FIN aus dem Link. Sonst wird die FIN beim Klick kopiert.
export const VIN_TOOLS: { name: string; hint: string; prefill: boolean; url: (vin: string) => string }[] = [
  { name: "carVertical", hint: "Historie, Schäden, Kilometerstände", prefill: true,
    url: (vin) => `https://www.carvertical.com/de/precheck?vin=${encodeURIComponent(vin)}` },
  { name: "autoDNA", hint: "Historie und Datenbankabgleich", prefill: false, url: () => "https://www.autodna.de/" },
];
