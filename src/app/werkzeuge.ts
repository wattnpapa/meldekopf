/**
 * Die Werkzeugzeile — die EINE Quelle für die Querverweise auf die Werkzeuge
 * desselben Autors, ganz unten in jeder Fußzeile.
 *
 * Herkunft: Erfassungsbogen `src/app/werkzeuge.ts` (Commit f2b77f1). Geändert:
 * der Meldekopf steht selbst in der Reihe (seine Adresse kommt aus
 * adressen.ts); der Erfassungsbogen zieht die Zeile in Phase 7 nach.
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

import { BASIS_URL, DOMAIN, ERFASSUNGSBOGEN_URL } from "./adressen";

export interface Werkzeug {
  href: string;
  label: string;
}

export const WERKZEUGE: readonly Werkzeug[] = [
  { href: ERFASSUNGSBOGEN_URL, label: "erfassungsbogen.app" },
  { href: BASIS_URL, label: DOMAIN },
  { href: "https://fmbauplaner.app/", label: "fmbauplaner.app" },
  { href: "https://nachrichtenvordruck.app/", label: "nachrichtenvordruck.app" },
  { href: "https://sprechfunk-uebung.de/", label: "sprechfunk-uebung.de" },
];

export const WERKZEUGE_TITEL = "Weitere Werkzeuge";

/** Statisches Markup für die Seiten unter public/ (ohne Laufzeit-Skript). */
export function werkzeugeHtml(): string {
  const eintraege = WERKZEUGE.map((w) => `<a href="${w.href}">${w.label}</a>`).join(
    '\n        <span class="werkzeuge-trenner" aria-hidden="true">·</span>\n        ',
  );
  return `<!-- WERKZEUGE:START -->
      <nav class="werkzeuge" aria-label="${WERKZEUGE_TITEL}">
        ${eintraege}
      </nav>
      <!-- WERKZEUGE:END -->`;
}
