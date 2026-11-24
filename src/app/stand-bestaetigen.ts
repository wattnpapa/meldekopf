/**
 * Herkunft: neu in der Meldekopf-App (Rollenaudit Runde 2, Bereitstellungsraum P2-5).
 *
 * „Stand bestätigen" an der Karte: Im Bereitstellungsraum stehen Einheiten planmäßig stundenlang. Nach einer Stunde
 * trug jede Karte dauerhaft „⚠ Stand vor …", ohne Weg zu sagen „nachgefragt, die Angaben stimmen noch". Eigene Datei,
 * die einsaetze-ui.tsx erst beim Tippen nachlädt (Startbündel, ADR-003 Aufnahmeregel 5).
 */
import type { MeldeEintrag } from "@bos/meldekopf/einsaetze";
import { einsaetzeLaden as kernEinsaetzeLaden, einsaetzePapierkorb as kernEinsaetzePapierkorb } from "@bos/meldekopf/einsaetze";
import { sammlungenSchreiben } from "./eintrag-zeiten";
import { angabenBestaetigt } from "./angaben-alter";

function alleSammlungen() {
  return [...kernEinsaetzeLaden(), ...kernEinsaetzePapierkorb()];
}

/**
 * „Stand bestätigen" an der Karte: Die geltende Fassung `eintragId` gilt ab jetzt als frisch bestätigt, mit Vermerk und
 * Uhrzeit im Verlauf der Einheit. `vorher` gibt die Angaben davor zurück, damit „Rückgängig" sie wiederherstellen kann;
 * `null`, wenn der Eintrag fehlt.
 */
export function standBestaetigen(einsatzId: string, eintragId: string, jetzt = Date.now()): { vorher: MeldeEintrag["angaben"] } | null {
  const liste = alleSammlungen();
  const e = liste.find((x) => x.id === einsatzId)?.eintraege.find((x) => x.id === eintragId);
  if (!e) return null;
  const vorher = e.angaben ? { ...e.angaben } : undefined;
  e.angaben = angabenBestaetigt(e, jetzt);
  (e.vermerke ??= []).push({ zeit: jetzt, text: "Stand bestätigt: Angaben stimmen noch" });
  sammlungenSchreiben(liste);
  return { vorher };
}

/** Nimmt „Stand bestätigen" zurück: die Angaben davor und ohne den Vermerk. */
export function standBestaetigungZurueck(einsatzId: string, eintragId: string, vorher: MeldeEintrag["angaben"]): boolean {
  const liste = alleSammlungen();
  const e = liste.find((x) => x.id === einsatzId)?.eintraege.find((x) => x.id === eintragId);
  if (!e) return false;
  if (vorher) e.angaben = vorher;
  else delete e.angaben;
  const i = e.vermerke?.map((v) => v.text).lastIndexOf("Stand bestätigt: Angaben stimmen noch") ?? -1;
  if (i >= 0) e.vermerke!.splice(i, 1);
  sammlungenSchreiben(liste);
  return true;
}
