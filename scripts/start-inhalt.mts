/**
 * Schreibt den erklärenden Startseiten-Text (src/app/start-inhalt.ts) als
 * statisches HTML in index.html — zwischen die beiden Marken im Start-Gerüst.
 *
 * Herkunft: Erfassungsbogen `scripts/start-inhalt.mts` (Commit f2b77f1), ohne
 * den FAQ-Block.
 *
 * Aufruf: `npm run start-inhalt`
 *
 * Warum erzeugt statt von Hand gepflegt: Derselbe Text muss im ausgelieferten
 * HTML (für Crawler und den ersten Bildaufbau) und in der React-Ansicht (die
 * das Gerüst beim Mount ersetzt) stehen. Zwei Kopien laufen früher oder später
 * auseinander; hier gibt es nur eine Quelle und eine erzeugte Kopie, deren
 * Aktualität src/test/start-inhalt.test.ts prüft.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { MARKE_ANFANG, MARKE_ENDE, startInhaltHtml } from "../src/app/start-inhalt.js";

const DATEI = join(import.meta.dirname, "..", "index.html");
const html = readFileSync(DATEI, "utf8");

/** Ersetzt den Inhalt zwischen zwei Marken; `schluss` ist die Einrückung der Endmarke. */
function ersetzen(quelle: string, anfangsMarke: string, endMarke: string, inhalt: string, schluss: string): string {
  const anfang = quelle.indexOf(anfangsMarke);
  const ende = quelle.indexOf(endMarke);
  if (anfang < 0 || ende < 0 || ende < anfang) {
    throw new Error(`Marken fehlen oder stehen verkehrt in index.html: ${anfangsMarke}`);
  }
  return quelle.slice(0, anfang + anfangsMarke.length) + "\n" + inhalt + "\n" + schluss + quelle.slice(ende);
}

const neu = ersetzen(html, MARKE_ANFANG, MARKE_ENDE, startInhaltHtml(), "      ");

if (neu === html) {
  console.log("index.html ist bereits aktuell.");
} else {
  writeFileSync(DATEI, neu);
  console.log("index.html aktualisiert.");
}
