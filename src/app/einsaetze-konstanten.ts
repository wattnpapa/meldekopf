/**
 * Herkunft: Erfassungsbogen `src/app/einsaetze-konstanten.ts` (Commit 1d7ed5f).
 */
/**
 * Kleine Festwerte der Einsatzansicht, die auch das Startbündel braucht.
 * Die Ansicht selbst (einsaetze-ui.tsx) wird nachgeladen; damit sie nicht
 * wegen zwei Konstanten ins Startbündel zurückgezogen wird, stehen diese hier
 * und werden von dort wieder ausgeführt.
 */

import { EinsatzArt } from "@bos/meldekopf/einsaetze";

/** Ereignis, mit dem die Startseite den Papierkorb der Einsätze öffnen lässt (R20-O5). */
export const PAPIERKORB_OEFFNEN = "eeb:papierkorb-oeffnen";

export const ART_LABEL: Record<EinsatzArt, string> = {
  [EinsatzArt.EINSATZ]: "Einsatz",
  [EinsatzArt.UEBUNG]: "Übung",
  [EinsatzArt.VERANSTALTUNG]: "Veranstaltung",
};

/**
 * Die Arten als Auswahl für die Dialoge „Neue Einsatz-Sammlung anlegen" und „Einsatz bearbeiten". Im Erfassungsbogen
 * stand die Liste in `app.tsx` neben `einsatzErfragen`; hier braucht sie auch die Einsatzansicht (Art nachträglich
 * ändern, neu im Meldekopf).
 */
export const ART_WAHL: { wert: string; label: string }[] = Object.entries(ART_LABEL).map(([wert, label]) => ({ wert, label }));
