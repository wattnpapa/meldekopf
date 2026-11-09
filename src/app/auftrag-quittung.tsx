/**
 * Herkunft: Erfassungsbogen `src/app/auftrag-quittung.tsx` (Commit 1d7ed5f).
 */
/**
 * Quittung „Auftrag gesetzt" mit „Rückgängig" (R15-W3). Eigenes Modul, das die Einsatzansicht per `lazy` nachlädt
 * (Startbündel, ADR-003). Es importiert bewusst nichts aus dem Speicher-Kern (ein Import von `eintrag-zeiten` verschob
 * die Bündelgrenzen und ließ das Startbündel um 40 KB wachsen): Die Ansicht reicht die Schreibfunktion herein.
 */
import { DaumenQuittung } from "@bos/oberflaeche/daumen-quittung";
import { zeigeHinweis } from "@bos/oberflaeche/dialoge";
import type { AuftragGesetzt } from "./einsaetze-ui";

export default function AuftragQuittung(props: {
  a: AuftragGesetzt;
  einsatzId: string;
  /** `notizSetzen` der Ansicht. */
  setzen: (einsatzId: string, eintragId: string, notiz: string) => void;
  /** Quittung zu: mit Auskunftstext, wenn zurückgenommen wurde. */
  fertig: (zurueckText?: string) => void;
}) {
  const { a, einsatzId, setzen, fertig } = props;
  const nr = a.nummer != null ? `Nr. ${a.nummer} ` : "";
  function zurueck() {
    try {
      setzen(einsatzId, a.eintragId, a.vorher);
      fertig(`Auftrag zurückgenommen: ${nr}„${a.name}".`);
    } catch (e) {
      void zeigeHinweis({ titel: "Rückgängig", text: e instanceof Error ? e.message : String(e) });
      fertig();
    }
  }
  return (
    <DaumenQuittung prellschutz onRueckgaengig={zurueck} rueckgaengigName="Auftrag rückgängig machen" onSchliessen={() => fertig()}>
      <strong>{a.nachher ? "Auftrag gesetzt" : "Auftrag entfernt"}:</strong> {nr}„{a.name}"
      {a.nachher ? ` — ${a.nachher.length > 60 ? `${a.nachher.slice(0, 57)}…` : a.nachher}` : ""}
    </DaumenQuittung>
  );
}
