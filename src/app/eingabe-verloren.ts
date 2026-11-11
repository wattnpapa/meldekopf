/**
 * Herkunft: Erfassungsbogen `src/app/eingabe-verloren.ts` (Commit 1d7ed5f).
 */
/**
 * Eine Einheit verschwindet aus der Liste (in einem anderen Fenster entfernt), während auf ihrer Karte Text
 * eingetippt, aber noch nicht gespeichert war (R12-O1). Die Karte und das Feld sind dann weg; der Hinweis nennt die
 * Einheit und gibt den Text wieder, damit er an anderer Stelle neu eingetragen werden kann.
 */

export interface OffeneEingabe {
  /** Entwurf des Auftrags/der Notiz; `null` = Feld nicht offen. */
  notiz: string | null;
}

/** Satz für den Hinweis; leer, wenn nichts eingetippt war. */
export function verloreneEingabeText(einheit: string, e: OffeneEingabe): string {
  const teile: string[] = [];
  if (e.notiz != null && e.notiz.trim()) teile.push(`Auftrag/Notiz „${e.notiz.trim()}"`);
  if (teile.length === 0) return "";
  return `Die Einheit „${einheit}" wurde in einem anderen Fenster entfernt — deine Eingabe ${teile.join(" und ")} wurde nicht gespeichert.`;
}
