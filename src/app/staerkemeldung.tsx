/**
 * Herkunft: neu in der Meldekopf-App (Rollenaudit Runde 2, Meldekopf P2-6).
 *
 * Der Dialog „Stärkemeldung": die Lage als eine Zeile zum Vorlesen und Kopieren. Eigene Datei, die einsaetze-ui.tsx
 * erst beim Tippen nachlädt (Startbündel, ADR-003 Aufnahmeregel 5); die Rechnung liegt in lage-zusatz.ts.
 */
import type { Einsatzsammlung } from "@bos/meldekopf/einsaetze";
import { zeigeHinweis } from "@bos/oberflaeche/dialoge";
import { staerkemeldungText } from "./lage-zusatz";

export function staerkemeldungZeigen(einsatz: Einsatzsammlung): Promise<void> {
  const zeile = staerkemeldungText(einsatz.name, einsatz.eintraege, einsatz.art);
  return zeigeHinweis({
    titel: "Stärkemeldung",
    text: (
      <>
        <p className="staerkemeldung-text">{zeile}</p>
        <p className="hinweis">Anwesende Einheiten, Stärke als Führer / Unterführer / Mannschaft // Gesamt, Zeit als DTG. Ohne Namen und Rufnummern.</p>
      </>
    ),
    kopiertext: zeile,
    ok: "Schließen",
  });
}
