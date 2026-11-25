/**
 * Herkunft: neu in der Meldekopf-App. Abgleich gelesener und getippter Kennzeichen am Tor.
 */
import { describe, expect, it } from "vitest";
import { kennzeichenSchluessel, type TorFahrzeug } from "./fahrzeug-stand";
import { abstandImText, erkennungAuswerten, torSuche } from "./kennzeichen-abgleich";

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
