/**
 * Herkunft: neu in der Meldekopf-App. Abgleich gelesener und getippter Kennzeichen am Tor.
 */
import { describe, expect, it } from "vitest";
import { kennzeichenSchluessel, type TorFahrzeug } from "./fahrzeug-stand";
import { abstandImText, erkennungAuswerten, kennzeichenAehnlich, torSuche } from "./kennzeichen-abgleich";

const BEKANNT = ["THW81234", "THW81284", "OLFW2041", "GOAB123", "#1"];

describe("Kennzeichen als Schlüssel", () => {
  it("lässt Strich, Leerzeichen und Kleinschreibung weg und faltet Umlaute", () => {
    expect(kennzeichenSchluessel("THW-81234")).toBe("THW81234");
    expect(kennzeichenSchluessel(" gö-ab 123 ")).toBe("GOAB123");
    expect(kennzeichenSchluessel("MÜ·X 9")).toBe("MUX9");
  });
});

describe("Abstand eines Kennzeichens zum gelesenen Text", () => {
  it("ist null, wenn es wörtlich im Text steht, gleich was davor und dahinter steht", () => {
    expect(abstandImText("THW81234", "DTHW81234X")).toBe(0);
  });
  it("lässt typische Verwechslungen der Texterkennung billig durchgehen", () => {
    expect(abstandImText("OLFW2041", "0LFW2O41")).toBeCloseTo(0.6);
    expect(abstandImText("THW81234", "THWB1234")).toBeCloseTo(0.3);
  });
  it("zählt ein fehlendes, überzähliges oder falsches Zeichen voll", () => {
    expect(abstandImText("THW81234", "THW8134")).toBe(1);
    expect(abstandImText("GOAB123", "GO8AB123")).toBe(1);
    expect(abstandImText("THW81234", "THW81934")).toBe(1);
  });
});

describe("Auswertung einer Lesung der Kamera", () => {
  it("findet das wörtlich gelesene Kennzeichen eindeutig", () => {
    expect(erkennungAuswerten("D THW 81234\n", BEKANNT)).toEqual({ treffer: ["THW81234"], abstand: 0 });
  });
  it("findet ein Kennzeichen trotz mitgelesener Plakette und verwechselter Zeichen", () => {
    expect(erkennungAuswerten("G0 8 AB 123", BEKANNT).treffer).toEqual(["GOAB123"]);
    expect(erkennungAuswerten("0L FW 2O41", BEKANNT).treffer).toEqual(["OLFW2041"]);
  });
  it("nennt beide, wenn die Lesung auf zwei ähnliche Kennzeichen gleich gut passt", () => {
    // Die vierte Ziffer ist nicht zu lesen: 81234 und 81284 liegen gleich nah.
    expect(erkennungAuswerten("THW 812 4", BEKANNT).treffer.sort()).toEqual(["THW81234", "THW81284"]);
  });
  it("findet nichts in fremdem Text und in zu kurzen Lesungen", () => {
    expect(erkennungAuswerten("TECHNISCHES HILFSWERK", BEKANNT).treffer).toEqual([]);
    expect(erkennungAuswerten("THW", BEKANNT).treffer).toEqual([]);
    expect(erkennungAuswerten("", BEKANNT).treffer).toEqual([]);
    expect(erkennungAuswerten("B MW 4711", BEKANNT).treffer).toEqual([]);
  });
  it("nimmt das längere Kennzeichen, wenn das kürzere darin steckt", () => {
    expect(erkennungAuswerten("OL A 123", ["OLA12", "OLA123"]).treffer).toEqual(["OLA123"]);
    expect(erkennungAuswerten("OL A 12", ["OLA12", "OLA123"]).treffer).toContain("OLA12");
  });
  it("gleicht Fahrzeuge ohne Kennzeichen nie ab", () => {
    expect(erkennungAuswerten("#1 1111", ["#1"]).treffer).toEqual([]);
  });
});

// Was die Texterkennung am 2026-11-26 im Feldversuch aus dem Foto eines THW-Lkw (THW-84588, Schild ein Fünftel der
// Rahmenbreite, Aufschrift „THW" und Funkrufnummer daneben) las, in drei Bildgrößen.
const FELD = [
  "C I 7 A A CS 3 F G NL N5 THEW LD LL 3 F9 8 HTHN84588 8 TS 2 S TE AS SS YR",
  "EE Y SS A 4 THW I8 CT HTHN84588 S55 NAM J",
  "AN ANY3 7 4 R K 1S A NL 14 GG2 NC REET THW L W9 THH84588 EB AWA CN B 2 E TY F SS W 4 C PN UID 2",
];

describe("Lesungen aus dem Feldversuch", () => {
  it("findet das THW-Kennzeichen an seinen Ziffern, auch wenn die Buchstaben davor falsch gelesen sind", () => {
    for (const text of FELD) expect(erkennungAuswerten(text, ["THW84588", "THW81234", "OLFW2041"])).toEqual({ treffer: ["THW84588"], abstand: 0.5 });
  });
  it("hält zwei THW-Kennzeichen auseinander, die sich in einer Ziffer unterscheiden", () => {
    expect(erkennungAuswerten(FELD[1]!, ["THW84588", "THW84589"]).treffer).toEqual(["THW84588"]);
  });
  it("nennt, was nach einem Kennzeichen aussieht, auch wenn es zu keinem Fahrzeug passt", () => {
    expect(erkennungAuswerten(FELD[1]!, ["THW81234", "OLFW2041"]).treffer).toEqual([]);
    expect(kennzeichenAehnlich(FELD[1]!)).toBe("HTHN84588");
    expect(kennzeichenAehnlich(FELD[2]!)).toBe("THH84588");
    expect(kennzeichenAehnlich("I BTHW 34588 B")).toBe("BTHW 34588");
    expect(kennzeichenAehnlich("OL FW 2041")).toBe("FW 2041");
  });
  it("hält einen QR-Code, Aufschriften und einzelne Zahlen nicht für ein Kennzeichen", () => {
    expect(kennzeichenAehnlich("TECHNISCHES HILFSWERK 37 46")).toBe("");
    expect(kennzeichenAehnlich("EE Y SS A 4 THW I8 CT S55 NAM J")).toBe("");
    expect(kennzeichenAehnlich("")).toBe("");
  });
});

function fahrzeug(kennzeichen: string, einheit: string, typ: string, unterwegsSeit: number | null = null): TorFahrzeug {
  return { eintragId: "m", einheitSchluessel: einheit, einheit, schluessel: kennzeichenSchluessel(kennzeichen) || "#1", kennzeichen, typ, funkruf: "", unterwegsSeit, zurueckAm: null };
}

describe("Tippsuche am Tor", () => {
  const liste = [
    fahrzeug("THW-81234", "THW Oldenburg FGr K", "MTW"),
    fahrzeug("OL-FW 2341", "FF Wardenburg", "LF"),
    fahrzeug("THW-82345", "THW Oldenburg FGr K", "LKW", 1000),
    fahrzeug("", "DLRG Wardenburg", "Boot"),
  ];
  it("stellt Kennzeichen, die auf die Eingabe enden, vor solche, die sie nur enthalten", () => {
    expect(torSuche("234", liste).map((f) => f.kennzeichen)).toEqual(["THW-81234", "OL-FW 2341", "THW-82345"]);
  });
  it("findet über Einheit und Typ, auch mehrere Wörter, und Fahrzeuge ohne Kennzeichen", () => {
    expect(torSuche("wardenburg", liste).map((f) => f.typ)).toEqual(["LF", "Boot"]);
    expect(torSuche("oldenburg lkw", liste).map((f) => f.kennzeichen)).toEqual(["THW-82345"]);
  });
  it("zeigt ohne Eingabe alle, die unterwegs sind, zuerst", () => {
    expect(torSuche(" ", liste).map((f) => f.kennzeichen)).toEqual(["THW-82345", "THW-81234", "OL-FW 2341", ""]);
  });
  it("findet nichts, wenn nichts passt", () => {
    expect(torSuche("999", liste)).toEqual([]);
  });
});
