/**
 * Herkunft: Erfassungsbogen `src/app/minuten-takt.ts` (Commit 1d7ed5f).
 */
/**
 * Minutentakt für Altersangaben („gerade eben", „vor 4 Min", „älter als 1 Std").
 *
 * R14-O1: Die Einsatzansicht rechnete das Alter bei jedem Zeichnen mit `Date.now()` neu, zeichnete aber nur bei einer
 * Berührung. Ein Gerät, das offen am Meldekopf liegt, zeigte nach Stunden ohne neue Meldung weiter „gerade eben" und
 * keine Warnmarke. Der Hook zeichnet die Ansicht jede Minute neu und zusätzlich, wenn die App wieder sichtbar wird
 * (Telefon entsperrt, Tab gewechselt) oder wieder Fokus bekommt.
 */

import { useEffect, useState } from "react";

/** Takt der Altersangaben. */
export const ALTERSTAKT_MS = 60_000;

/** Zeichnet die Komponente jede Minute und bei Rückkehr in die App neu; liefert die Uhrzeit des letzten Takts. */
export function useMinutenTakt(): number {
  const [jetzt, setJetzt] = useState(() => Date.now());
  useEffect(() => {
    const neu = () => setJetzt(Date.now());
    const uhr = setInterval(neu, ALTERSTAKT_MS);
    const beiSicht = () => {
      if (document.visibilityState !== "hidden") neu();
    };
    document.addEventListener("visibilitychange", beiSicht);
    window.addEventListener("focus", neu);
    return () => {
      clearInterval(uhr);
      document.removeEventListener("visibilitychange", beiSicht);
      window.removeEventListener("focus", neu);
    };
  }, []);
  return jetzt;
}
