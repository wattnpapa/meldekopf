import { describe, it, expect } from "vitest";
import { neuerBogen, pruefpunkte, zeitraumDeutsch, zeitraumVonBis } from "./hilfen";
import { lueckeKurz } from "./einheiten-tabelle";
import { zeitraumLeer, zeitraumNachEingabe } from "./zeitraum-eingabe";

describe("Einsatzzeitraum nicht angegeben (Tag 0 an beiden Enden, Beispielbögen des Erfassungsbogens)", () => {
  const leer = () => {
    const b = neuerBogen();
    b.einsatz = { zeitraumVon: 0, zeitraumBis: 0, ortAuftrag: "" };
    return b;
  };

  it("steht nicht als 01.01.2020 da", () => {
    expect(zeitraumLeer(leer().einsatz)).toBe(true);
    expect(zeitraumVonBis(leer())).toBe("");
    expect(zeitraumDeutsch(leer())).toBe("nicht angegeben");
  });

  it("meldet „Zeitraum fehlt“ statt „vorbei“ oder „Jahr prüfen“", () => {
    const kurz = pruefpunkte(leer(), true, 2500).map((p) => lueckeKurz(p.text));
    expect(kurz).toContain("Zeitraum fehlt");
    expect(kurz).not.toContain("Zeitraum vorbei");
    expect(kurz).not.toContain("Zeitraum: Jahr prüfen");
  });

  it("das erste eingetragene Datum gilt für beide Enden", () => {
    const z = zeitraumNachEingabe(leer().einsatz, "bis", "2026-11-13", 2500);
    expect(z.zeitraumVon).toBe(z.zeitraumBis);
    expect(zeitraumLeer(z)).toBe(false);
  });
});
