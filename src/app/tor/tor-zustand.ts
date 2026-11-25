/**
 * Herkunft: neu in der Meldekopf-App.
 *
 * Ist die Tor-Liste (Tippsuche, tor-ansicht.tsx) offen? Ein kleiner Zustand außerhalb der Komponenten, weil zwei Stellen
 * sie öffnen, die einander nicht kennen: „Kennzeichen tippen…" im Scanner (app.tsx) und „Fahrzeuge am Tor…" in der
 * Einsatzansicht. Gezeigt wird sie von der Einsatzansicht.
 */
import { useSyncExternalStore } from "react";

let offen = false;
const horcher = new Set<() => void>();

function setzen(wert: boolean): void {
  if (offen === wert) return;
  offen = wert;
  for (const h of horcher) h();
}

export const torOeffnen = (): void => setzen(true);
export const torSchliessen = (): void => setzen(false);

export function useTorOffen(): boolean {
  return useSyncExternalStore(
    (h) => {
      horcher.add(h);
      return () => void horcher.delete(h);
    },
    () => offen,
    () => false,
  );
}
