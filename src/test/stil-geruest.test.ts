/**
 * Der Stilblock der index.html ist von Hand zusammengesetzt (eigene Regeln,
 * Token aus @bos/oberflaeche, übernommene Regeln des Erfassungsbogens). Eine
 * fehlende Klammer bricht dabei nichts sichtbar ab: Der Browser hängt alles
 * Folgende in die offene Regel. So lagen beim Einsetzen der Schnellerfassung
 * die Kennfarben der Anzeigemodi in einem fremden Block, und erst die Prüfung
 * „hebt sich jeder Text ab" im dunklen Modus fiel auf. Hier fällt es früher auf.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const html = readFileSync(join(import.meta.dirname, "../../index.html"), "utf8");

function stilBloecke(text: string): string[] {
  return [...text.matchAll(/<style>([\s\S]*?)<\/style>/g)].map((m) => m[1]!);
}

describe("Stilblock der index.html", () => {
  it("schließt jeden Kommentar", () => {
    for (const css of stilBloecke(html)) {
      expect(css.split("/*").length).toBe(css.split("*/").length);
    }
  });

  it("schließt jede Klammer, und keine schließt zu früh", () => {
    for (const css of stilBloecke(html)) {
      const ohneKommentare = css.replace(/\/\*[\s\S]*?\*\//g, "");
      let tiefe = 0;
      for (const zeichen of ohneKommentare) {
        if (zeichen === "{") tiefe++;
        if (zeichen === "}") tiefe--;
        expect(tiefe).toBeGreaterThanOrEqual(0);
      }
      expect(tiefe).toBe(0);
    }
  });
});
