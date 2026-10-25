/**
 * Die angefangene Schnellerfassung im Entwurf: gehört sie zu dieser Sammlung,
 * und darf eine neue sie ersetzen? Eigenes kleines Modul, weil app.tsx es beim
 * Start braucht, die Schnellerfassung selbst aber erst auf Knopfdruck lädt.
 *
 * Herkunft: Erfassungsbogen `src/app/app.tsx` (Commit 441811c), die Rückfrage
 * „Angefangene Erfassung" in `manuellInEinsatz` (R2-E1); hier nur noch mit dem
 * Weg „ersetzen", weil das Fortsetzen über dieselbe Sammlung von selbst geht.
 */
import { frageJaNein } from "@bos/oberflaeche/dialoge";
import { einheitAnzeigename } from "../hilfen";
import { einsaetzeLaden } from "../einsaetze-lesen";
import { entwurfLaden, type Entwurf } from "../entwurf";

/** Die angefangene Erfassung für genau diese Sammlung, sonst null. */
export function erfassungFuer(einsatzId: string, e: Entwurf | null = entwurfLaden()): Entwurf | null {
  return e?.fremd?.einsatzId === einsatzId ? e : null;
}

/**
 * Darf eine neue Erfassung den gespeicherten Entwurf ersetzen? Ein eigener
 * Bogen kann hier nur aus einer eingespielten Sicherung des Erfassungsbogens
 * stammen; er verschwindet nicht still. Eine angefangene Erfassung für eine
 * andere Sammlung auch nicht (R2-E1).
 */
export async function entwurfPlatzFrei(einsatzId: string): Promise<boolean> {
  const e = entwurfLaden();
  if (!e || erfassungFuer(einsatzId, e)) return true;
  const name = einheitAnzeigename(e.bogen.einheit) || "(noch ohne Namen)";
  const fremdeSammlung = e.fremd?.einsatzId ? einsaetzeLaden().find((s) => s.id === e.fremd!.einsatzId) : undefined;
  return frageJaNein({
    titel: "Angefangene Erfassung ersetzen?",
    text: fremdeSammlung
      ? `Für „${fremdeSammlung.name}" ist „${name}" angefangen, aber noch nicht übernommen. Eine neue Erfassung ersetzt sie.`
      : `Auf dem Gerät liegt ein angefangener Bogen „${name}" (aus einer Datensicherung des Erfassungsbogens). Eine neue Erfassung ersetzt ihn.`,
    ok: "Ersetzen und neu erfassen",
    gefahr: true,
    fokus: "abbruch",
  });
}
