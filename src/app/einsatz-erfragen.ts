/**
 * Neue Einsatz-Sammlung erfragen und anlegen: Name, Art und Ort in einem
 * Dialog. Rückgabe null = abgebrochen.
 *
 * Herkunft: Erfassungsbogen `src/app/app.tsx` (Commit 441811c),
 * `einsatzErfragen` und `ART_WAHL`. Eigenes Modul, weil Startseite und
 * Eingänge (Bogen ohne passende Sammlung, Datei ohne Sammlung) dasselbe fragen.
 */

import { EinsatzArt, einsatzAnlegen, type Einsatzsammlung } from "@bos/meldekopf/einsaetze";
import { frageFelder, zeigeHinweis } from "@bos/oberflaeche/dialoge";
import { ART_LABEL } from "./einsaetze-ui";
import { SpeicherVollFehler, istSpeicherVoll } from "./eintrag-zeiten";
import { fehlerText } from "./nachladen";

const ART_WAHL = Object.entries(ART_LABEL).map(([wert, label]) => ({ wert, label }));

/**
 * Neue Sammlung erfragen und anlegen (Erfassungsbogen `einsatzErfragen`).
 * Voller Speicher: der Dialog schloss, und es gab weder Sammlung noch Meldung
 * — nur einen Fehler in der Konsole (Audit Runde 2, R2-O2). Deshalb sagt es
 * die App.
 */
export async function einsatzErfragen(): Promise<Einsatzsammlung | null> {
  const werte = await frageFelder({
    titel: "Neue Einsatz-Sammlung anlegen",
    hinweis: "Die Sammelmappe des Meldekopfs für eintreffende Bögen — mit Stärke-Summen über alle anwesenden Einheiten.",
    ok: "Einsatz anlegen",
    felder: [
      { name: "name", label: "Name", platzhalter: "z. B. Hochwasser Weser" },
      { name: "art", label: "Art", auswahl: ART_WAHL },
      { name: "ort", label: "Ort / Auftrag (optional)", optional: true, platzhalter: "z. B. Deichabschnitt Nord" },
    ],
  });
  if (!werte) return null;
  try {
    return einsatzAnlegen(werte.name!, Number(werte.art) as EinsatzArt, werte.ort);
  } catch (e) {
    await zeigeHinweis({
      titel: "Sammlung nicht angelegt",
      text: istSpeicherVoll(e) ? new SpeicherVollFehler(e).message : fehlerText(e),
    });
    return null;
  }
}
