import { isValidVin, vinRequired } from "@/lib/vin";

// Vollständigkeit eines Inserats. Wird im Formular live angezeigt und beim Speichern
// als quality_score abgelegt; vollständige Inserate stehen in der Suche weiter oben.
export type QualityInput = {
  photos: number; mileage: string; first_registration: string; fuel: string; transmission: string; power_kw: string;
  accident_free: string; defects: string[]; no_known_defects: boolean; color: string; hu_until: string; owners: string;
  features: string[]; description: string; damage_notes: string; vin: string; category: string;
};

export const COMPLETE_FROM = 80;

export function quality(v: QualityInput) {
  const filled = (s: string) => s.trim() !== "";
  const parts: [number, boolean, string][] = [
    [15, v.photos >= 3, "mindestens 3 Fotos"],
    [10, v.photos >= 6, "6 oder mehr Fotos"],
    [10, filled(v.mileage), "Kilometerstand"],
    [10, filled(v.first_registration), "Erstzulassung"],
    [5, filled(v.fuel), "Kraftstoff"],
    [5, filled(v.transmission), "Getriebe"],
    [5, filled(v.power_kw), "Leistung"],
    [10, v.accident_free === "ja" || v.accident_free === "nein", "Unfallfrei ja/nein"],
    [10, v.defects.length > 0 || v.no_known_defects, "Mängelangabe"],
    [3, filled(v.color), "Farbe"],
    [5, filled(v.hu_until), "HU bis"],
    [4, filled(v.owners), "Anzahl Vorbesitzer"],
    [4, v.features.length >= 3, "Ausstattung (mind. 3 Merkmale)"],
    [4, v.description.trim().length >= 40 || v.damage_notes.trim().length >= 20, "Beschreibung"],
  ];
  const score = parts.reduce((a, [p, ok]) => a + (ok ? p : 0), 0);
  const missing = parts.filter(([, ok]) => !ok).map(([, , label]) => label);
  return { score, missing, complete: score >= COMPLETE_FROM };
}

// Pflichtangaben: ohne sie wird ein Inserat nicht veröffentlicht
export function requiredMissing(v: QualityInput) {
  const m: string[] = [];
  if (v.photos < 3) m.push("mindestens 3 Fotos");
  if (vinRequired(v.category) && !isValidVin(v.vin)) m.push("gültige Fahrgestellnummer (17 Zeichen)");
  if (v.mileage.trim() === "") m.push("Kilometerstand");
  if (v.first_registration.trim() === "") m.push("Erstzulassung");
  if (v.accident_free !== "ja" && v.accident_free !== "nein") m.push("Unfallfrei ja oder nein");
  if (v.defects.length === 0 && !v.no_known_defects) m.push("Mängel ankreuzen oder „Keine bekannten Mängel“ bestätigen");
  return m;
}
