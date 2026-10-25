/**
 * Schreibt die Kopfnavigation (src/app/kopfnav.ts) als statisches HTML in das
 * Start-Gerüst von index.html und in jede Seite unter public/ — jeweils
 * zwischen die beiden Marken; dazu die Werkzeugzeile (src/app/werkzeuge.ts)
 * in die Fußzeilen der Seiten.
 *
 * Herkunft: Erfassungsbogen `scripts/kopfnav.mts` und der NAV-Teil von
 * `scripts/content-nav.mts` (Commit f2b77f1), hier in einem Skript.
 *
 * Aufruf: `npm run kopfnav`
 *
 * Warum erzeugt statt von Hand gepflegt: Die Leiste steht im ausgelieferten
 * HTML (sie ist das Erste, was Auge und Crawler sehen) und noch einmal in der
 * React-Ansicht, die das Gerüst beim Mount ersetzt. Weichen beide voneinander
 * ab, springt die Seite beim Mount. src/test/kopfnav.test.ts prüft, dass jeder
 * Block aktuell ist.
 */

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { MARKE_ANFANG, MARKE_ENDE, kopfnavHtml } from "../src/app/kopfnav.js";
import { werkzeugeHtml } from "../src/app/werkzeuge.js";

const WURZEL = join(import.meta.dirname, "..");

function ersetzen(quelle: string, anfang: string, ende: string, inhalt: string, schluss: string, datei: string): string {
  const a = quelle.indexOf(anfang);
  const e = quelle.indexOf(ende);
  if (a < 0 || e < a) throw new Error(`Marken fehlen oder stehen verkehrt in ${datei}: ${anfang}`);
  return quelle.slice(0, a + anfang.length) + "\n" + inhalt + "\n" + schluss + quelle.slice(e);
}

function schreiben(pfad: string, neu: string, alt: string): void {
  if (neu === alt) console.log(`${pfad} ist bereits aktuell.`);
  else {
    writeFileSync(pfad, neu);
    console.log(`${pfad} aktualisiert.`);
  }
}

// index.html — Einzug 4: Die Leiste sitzt im Gerüst innerhalb von <div id="app">.
// Hülle `div`: Der Kopfbalken darunter ist der Seitenkopf (siehe NavHuelle).
{
  const pfad = join(WURZEL, "index.html");
  const html = readFileSync(pfad, "utf8");
  schreiben("index.html", ersetzen(html, MARKE_ANFANG, MARKE_ENDE, kopfnavHtml("", "    ", "div"), "    ", "index.html"), html);
}

// public/*.html — Einzug 2, Hülle `header`: dort ist die Leiste der Seitenkopf.
const WERKZEUGE_ANFANG = "<!-- WERKZEUGE:START -->";
const WERKZEUGE_ENDE = "<!-- WERKZEUGE:END -->";
for (const datei of readdirSync(join(WURZEL, "public")).filter((d) => d.endsWith(".html")).sort()) {
  const pfad = join(WURZEL, "public", datei);
  const html = readFileSync(pfad, "utf8");
  if (!html.includes(MARKE_ANFANG)) continue; // Seiten ohne Leiste (404) bleiben, wie sie sind.
  let neu = ersetzen(html, MARKE_ANFANG, MARKE_ENDE, kopfnavHtml(datei, "  ", "header"), "  ", datei);
  if (neu.includes(WERKZEUGE_ANFANG)) {
    // werkzeugeHtml() liefert den Block samt Marken; hier nur den Inhalt dazwischen einsetzen.
    const block = werkzeugeHtml();
    const inhalt = block.slice(block.indexOf(WERKZEUGE_ANFANG) + WERKZEUGE_ANFANG.length, block.indexOf(WERKZEUGE_ENDE)).replace(/^\n|\n\s*$/g, "");
    neu = ersetzen(neu, WERKZEUGE_ANFANG, WERKZEUGE_ENDE, inhalt, "      ", datei);
  }
  schreiben(`public/${datei}`, neu, html);
}
