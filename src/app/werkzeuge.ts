/**
 * Die Werkzeugzeile — die EINE Quelle für die Querverweise auf die Werkzeuge
 * desselben Autors, ganz unten in jeder Fußzeile.
 *
 * Herkunft: Erfassungsbogen `src/app/werkzeuge.ts` (Commit f2b77f1). Geändert:
 * der Meldekopf steht selbst in der Reihe (seine Adresse kommt aus
 * adressen.ts); der Erfassungsbogen zieht die Zeile in Phase 7 nach. Seit
 * Phase 1 liegt das Markup in `@bos/oberflaeche/werkzeuge`; hier bleibt die
 * Liste dieser App.
 *
 * Zwei Fassungen entstehen daraus:
 *   - die React-Fassung in der App-Fußzeile (`Werkzeugzeile` in fusszeile.tsx),
 *   - der statische Block `<!-- WERKZEUGE:START -->` … `<!-- WERKZEUGE:END -->`
 *     in jeder Fußzeile unter `public/` (scripts/kopfnav.mts).
 *
 * Alle stehen in fester Reihenfolge, das eigene Projekt eingeschlossen: Die
 * Zeile ist auf allen Seiten dieselbe. Linktext ist die Domain in
 * Kleinbuchstaben — sie sagt, wohin der Link führt, und ist zugleich der Name.
 *
 * Der Mittelpunkt ist ein eigenes Element mit `aria-hidden`, nicht Teil des
 * Links: sonst würde er mit unterstrichen, gehörte zur Trefferfläche und würde
 * vorgelesen.
 */

import { type Werkzeug, WERKZEUGE_TITEL, werkzeugeHtml as werkzeugeHtmlAus } from "@bos/oberflaeche/werkzeuge";
import { BASIS_URL, DOMAIN, ERFASSUNGSBOGEN_URL } from "./adressen";

export { WERKZEUGE_TITEL, type Werkzeug };

export const WERKZEUGE: readonly Werkzeug[] = [
  { href: ERFASSUNGSBOGEN_URL, label: "erfassungsbogen.app" },
  { href: BASIS_URL, label: DOMAIN },
  { href: "https://fmbauplaner.app/", label: "fmbauplaner.app" },
  { href: "https://nachrichtenvordruck.app/", label: "nachrichtenvordruck.app" },
  { href: "https://sprechfunk-uebung.de/", label: "sprechfunk-uebung.de" },
];

/** Statisches Markup für die Seiten unter public/ (ohne Laufzeit-Skript). */
export function werkzeugeHtml(): string {
  return werkzeugeHtmlAus(WERKZEUGE);
}
