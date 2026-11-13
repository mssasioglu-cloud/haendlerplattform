// Fahrgestellnummer (FIN): Prüfung. Die Plattform fragt selbst keine kostenpflichtigen Daten ab;
// Käufer kopieren die FIN und nutzen ihre eigenen Zugänge für Historie und Ausstattung.

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
