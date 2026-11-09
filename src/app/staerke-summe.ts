/**
 * Herkunft: Erfassungsbogen `src/app/staerke-summe.ts` (Commit 1d7ed5f).
 */
/**
 * Laufende Gesamtzahl im Dialog „Stärke ändern…" (R12-H2): Funkmeldungen kommen als „1 / 1 / 9 / 11"; die Summe steht
 * schon beim Tippen unter den Feldern, nicht erst nach dem Übernehmen auf der Karte.
 */

/** „Gesamt: 11 (bisher 4)" — bei nicht lesbaren Feldern „Gesamt: – (bisher 4)". */
export function staerkeSummeZeile(werte: Record<string, string>, bisher: number): string {
  const teile = ["fuehrer", "unterfuehrer", "mannschaft"].map((n) => (werte[n] ?? "").trim());
  if (teile.some((t) => !/^\d{1,3}$/.test(t))) return `Gesamt: – (bisher ${bisher})`;
  const gesamt = teile.reduce((summe, t) => summe + Number(t), 0);
  return `Gesamt: ${gesamt} (bisher ${bisher})`;
}
