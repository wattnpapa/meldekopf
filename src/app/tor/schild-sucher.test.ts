/**
 * Herkunft: neu in der Meldekopf-App. Der Schild-Sucher an gezeichneten Graubildern: Schriftzeile auf hellem Grund
 * zwischen ruhigen Flächen und einzelnen Kanten.
 */
import { describe, expect, it } from "vitest";
import { kontrastSpreizen, schildKandidaten } from "./schild-sucher";

const B = 320;
const H = 240;

/** Graubild mit einer Grundhelligkeit. */
function bild(grund = 90): Uint8Array {
  return new Uint8Array(B * H).fill(grund);
}

function flaeche(g: Uint8Array, x0: number, y0: number, x1: number, y1: number, wert: number): void {
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) g[y * B + x] = wert;
}

/** Ein „Schild": helle Fläche mit dunklen senkrechten Strichen wie Schrift, mit einer Lücke für die Plaketten. */
function schild(g: Uint8Array, x0: number, y0: number, breite: number, hoehe: number, luecke = true): void {
  flaeche(g, x0, y0, x0 + breite, y0 + hoehe, 235);
  for (let x = x0 + 6; x < x0 + breite - 6; x += 5) {
    const mitte = x0 + breite * 0.4;
    if (luecke && x > mitte - 7 && x < mitte + 7) continue;
    flaeche(g, x, y0 + 4, x + 2, y0 + hoehe - 4, 20);
  }
}

describe("Schild-Sucher", () => {
  it("findet die Schriftzeile auf hellem Grund als einen Kasten, über die Lücke der Plaketten hinweg", () => {
    const g = bild();
    schild(g, 110, 120, 96, 22);
    const k = schildKandidaten(g, B, H);
    expect(k.length).toBeGreaterThan(0);
    const bester = k[0]!;
    expect(bester.x).toBeGreaterThanOrEqual(100);
    expect(bester.x + bester.breite).toBeLessThanOrEqual(216);
    expect(bester.breite).toBeGreaterThan(70);
    expect(bester.y).toBeGreaterThanOrEqual(116);
    expect(bester.y + bester.hoehe).toBeLessThanOrEqual(146);
  });

  it("stellt das helle Schild vor eine gleich dichte Zeile auf dunklem Grund", () => {
    const g = bild(60);
    schild(g, 30, 40, 96, 22);
    // Dieselben Striche, aber hell auf dunkel und ohne helle Fläche (Aufschrift am Fahrzeug).
    for (let x = 180; x < 270; x += 5) flaeche(g, x, 160, x + 2, 178, 140);
    const k = schildKandidaten(g, B, H);
    expect(k.length).toBeGreaterThanOrEqual(2);
    expect(k[0]!.y).toBeLessThan(80);
  });

  it("hält ruhige Flächen, einzelne Kanten und hohe schmale Muster nicht für ein Schild", () => {
    const g = bild();
    flaeche(g, 40, 30, 200, 90, 220); // helle Fläche: zwei Kanten, keine Schrift
    flaeche(g, 250, 0, 252, H, 10); // Fensterholm
    for (let x = 20; x < 36; x += 5) flaeche(g, x, 100, x + 2, 230, 10); // hohes schmales Gitter
    expect(schildKandidaten(g, B, H)).toEqual([]);
    expect(schildKandidaten(bild(), B, H)).toEqual([]);
  });

  it("liefert höchstens die gewünschte Zahl und nichts bei zu kleinem Bild", () => {
    const g = bild();
    for (let i = 0; i < 5; i++) schild(g, 20 + (i % 2) * 150, 10 + i * 44, 96, 22, false);
    expect(schildKandidaten(g, B, H, 2)).toHaveLength(2);
    expect(schildKandidaten(new Uint8Array(40), 10, 4)).toEqual([]);
  });
});

describe("Kontrast spreizen", () => {
  it("zieht ein flaues Bild auf den vollen Umfang und macht es grau", () => {
    const d = new Uint8ClampedArray(400 * 4);
    for (let i = 0; i < 400; i++) {
      const g = i < 200 ? 100 : 140;
      d.set([g, g + 10, g - 10, 255], i * 4);
    }
    kontrastSpreizen(d);
    expect([d[0], d[1], d[2], d[3]]).toEqual([0, 0, 0, 255]);
    expect([d[399 * 4], d[399 * 4 + 1], d[399 * 4 + 2]]).toEqual([255, 255, 255]);
  });
  it("lässt ein einfarbiges Bild ohne Absturz durch", () => {
    const d = new Uint8ClampedArray(16).fill(128);
    kontrastSpreizen(d);
    expect(d[0]).toBe(d[4]);
  });
});
