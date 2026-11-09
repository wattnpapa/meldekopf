/**
 * Neue Einsatz-Sammlung erfragen und anlegen: Name, Art und Ort in einem
 * Dialog. Rückgabe null = abgebrochen.
 *
 * Herkunft: Erfassungsbogen `src/app/app.tsx` (Commit 1d7ed5f),
 * `einsatzErfragen`, `ART_WAHL` und `SAMMLUNG_GESPERRT_TEXT`. Eigenes Modul,
 * weil Startseite und Eingänge (Bogen ohne passende Sammlung, Datei ohne
 * Sammlung) dasselbe fragen. Der Satz zum eigenen Bogen im Hinweis entfällt:
 * Den gibt es nur im Erfassungsbogen.
 */

import { EinsatzArt, einsatzAnlegen, type Einsatzsammlung } from "@bos/meldekopf/einsaetze";
import { frageFelder, frageWahl, zeigeHinweis } from "@bos/oberflaeche/dialoge";
import { ART_LABEL } from "./einsaetze-konstanten";
import { einsaetzeLaden } from "./einsaetze-lesen";
import { anzahlEinheiten } from "./einheiten-tabelle";
import { SpeicherVollFehler, istSpeicherVoll } from "./eintrag-zeiten";
import { fehlerText } from "./nachladen";
import { browserSpeicherhuelle } from "./speicher-browser";

const ART_WAHL = Object.entries(ART_LABEL).map(([wert, label]) => ({ wert, label }));

/** „Einsatz anlegen" bei gesperrtem Browser-Speicher: Grund und Ausweg dort, wo getippt wurde (R18-O1). */
export const SAMMLUNG_GESPERRT_TEXT =
  "Dieser Browser lässt die App gerade nichts speichern (privates Fenster oder Datenschutz-Einstellung). Eine Sammlung ginge beim Schließen verloren. " +
  "Ein normales Fenster öffnen oder Speichern für diese Seite erlauben.";

/**
 * Neue Sammlung erfragen und anlegen (Erfassungsbogen `einsatzErfragen`).
 * Voller Speicher: der Dialog schloss, und es gab weder Sammlung noch Meldung
 * — nur einen Fehler in der Konsole (Audit Runde 2, R2-O2). Deshalb sagt es
 * die App. Gibt es den Namen schon, liefert „Vorhandene öffnen" die
 * vorhandene Sammlung zurück (R11-K3).
 */
export async function einsatzErfragen(artVorgabe?: EinsatzArt): Promise<Einsatzsammlung | null> {
  // Lässt der Browser nichts speichern (privates Fenster), entstünde keine Sammlung: Das sagt schon der Tipp auf
  // „Neue Einsatz-Sammlung…", bevor ein Name getippt wird (R18-O1).
  if (browserSpeicherhuelle() === null) {
    await zeigeHinweis({ titel: "Sammlung nicht angelegt", text: SAMMLUNG_GESPERRT_TEXT });
    return null;
  }
  const werte = await frageFelder({
    titel: "Neue Einsatz-Sammlung anlegen",
    hinweis: "Die Sammelmappe des Meldekopfs für eintreffende Bögen — mit Stärke-Summen über alle anwesenden Einheiten.",
    ok: "Einsatz anlegen",
    felder: [
      { name: "name", label: "Name", platzhalter: "z. B. Hochwasser Weser" },
      { name: "art", label: "Art", auswahl: ART_WAHL, vorgabe: artVorgabe != null ? String(artVorgabe) : undefined },
      { name: "ort", label: "Ort / Auftrag (optional)", optional: true, platzhalter: "z. B. Deichabschnitt Nord" },
    ],
  });
  if (!werte) return null;
  // Gleicher Name wie eine vorhandene Sammlung: einmal fragen, statt stumm eine zweite anzulegen, die danach
  // nur an der Zeit zu unterscheiden ist (R11-K3).
  const gleichnamig = einsaetzeLaden()
    .filter((x) => x.name.trim().toLowerCase() === (werte.name ?? "").trim().toLowerCase())
    .sort((a, b) => b.geaendert - a.geaendert);
  if (gleichnamig.length > 0) {
    const vorhanden = gleichnamig[0]!;
    const wahl = await frageWahl({
      titel: "Diese Sammlung gibt es schon",
      text: `„${vorhanden.name}“ gibt es schon (${anzahlEinheiten(vorhanden.eintraege)}${vorhanden.ort ? `, ${vorhanden.ort}` : ""}). Die vorhandene öffnen oder trotzdem eine zweite anlegen?`,
      wege: [
        { wert: "oeffnen", label: "Vorhandene öffnen" },
        { wert: "neu", label: "Trotzdem neu anlegen" },
      ],
    });
    if (wahl === null) return null;
    if (wahl === "oeffnen") return vorhanden;
  }
  let s: Einsatzsammlung;
  try {
    s = einsatzAnlegen(werte.name!, Number(werte.art) as EinsatzArt, werte.ort);
  } catch (e) {
    await zeigeHinweis({
      titel: "Sammlung nicht angelegt",
      text: istSpeicherVoll(e) ? new SpeicherVollFehler(e).message : fehlerText(e),
    });
    return null;
  }
  // Schreiben still gescheitert (Speicher gesperrt, nicht voll)? Dann liegt die Sammlung nicht im Speicher (R18-O1).
  if (!einsaetzeLaden().some((x) => x.id === s.id)) {
    await zeigeHinweis({ titel: "Sammlung nicht angelegt", text: SAMMLUNG_GESPERRT_TEXT });
    return null;
  }
  return s;
}
