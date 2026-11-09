/**
 * Herkunft: Erfassungsbogen `src/app/zeitraum-eingabe.test.ts` (Commit 1d7ed5f).
 */
import { describe, expect, it } from "vitest";
import { datumAusIso, transportSchemaVersion, zeitraumIsoLesen } from "@bos/eeb-format/model";
import {
  einsatzVorgabe,
  lokalerOffset,
  uhrzeitAus,
  uhrzeitAusIso,
  uhrzeitZuIso,
  UHRZEIT_BIS_VORGABE,
  UHRZEIT_VON_VORGABE,
  zeitraumNachEingabe,
  zeitraumZeitIso,
} from "./zeitraum-eingabe";
import { neuerBogen, pruefpunkte, zeitraumDeutsch, zeitraumVonBis } from "./hilfen";
import { bogenAlsVorlage } from "./vorlagen";
import { bogenBefund } from "./bogen-pruefung";

const tag = datumAusIso("2026-10-29");

describe("Zeitraum mit Uhrzeit als ISO 8601 (Schema 11)", () => {
  it("neue Bögen und Vorlagen sind mit 08:00 bis 18:00 vorbelegt, mit dem Offset des Geräts", () => {
    expect(UHRZEIT_VON_VORGABE).toBe(480);
    expect(UHRZEIT_BIS_VORGABE).toBe(1080);
    const b = neuerBogen();
    const von = zeitraumIsoLesen(b.einsatz.zeitraumVonIso!);
    expect(von).toEqual({ tag: b.einsatz.zeitraumVon, minuten: 480, offsetMinuten: lokalerOffset(b.einsatz.zeitraumVon, 480) });
    expect(uhrzeitAus(b.einsatz.zeitraumBisIso)).toBe(1080);
    expect(transportSchemaVersion(b)).toBe(11);
    expect(uhrzeitAus(bogenAlsVorlage(b).einsatz.zeitraumVonIso)).toBe(480);
  });

  it("schreibt ISO 8601 mit Offset nach RFC 3339", () => {
    expect(zeitraumZeitIso(tag, 480)).toMatch(/^2026-10-29T08:00:00[+-]\d\d:\d\d$/);
  });

  it("wandelt Uhrzeitfelder hin und zurück; leer und Unsinn ergeben keine Uhrzeit", () => {
    expect(uhrzeitZuIso(480)).toBe("08:00");
    expect(uhrzeitZuIso(1439)).toBe("23:59");
    expect(uhrzeitAusIso("18:00")).toBe(1080);
    expect(uhrzeitAusIso("07:05:00")).toBe(425);
    expect(uhrzeitAusIso("")).toBeUndefined();
    expect(uhrzeitAusIso("25:00")).toBeUndefined();
    expect(uhrzeitAus(undefined)).toBeUndefined();
    expect(uhrzeitAus("kaputt")).toBeUndefined();
  });

  it("die Uhrzeit wandert mit dem Tag, wenn das Datum geändert wird", () => {
    const ez = einsatzVorgabe(tag);
    const neu = zeitraumNachEingabe(ez, "von", "2026-11-02", tag);
    expect(neu.zeitraumVonIso).toMatch(/^2026-11-02T08:00:00/);
    expect(neu.zeitraumBisIso).toMatch(/^2026-11-02T18:00:00/);
    const ohne = zeitraumNachEingabe({ zeitraumVon: tag, zeitraumBis: tag }, "bis", "2026-10-30", tag);
    expect(ohne).toEqual({ zeitraumVon: tag, zeitraumBis: tag + 1 });
  });

  it("zeigt den Zeitraum mit Uhrzeit ohne Zeitzone, ältere Bögen ohne Uhrzeit", () => {
    const eintaegig = { einsatz: einsatzVorgabe(tag) };
    expect(zeitraumDeutsch(eintaegig)).toBe("29.10.2026, 08:00–18:00 Uhr");
    expect(zeitraumVonBis(eintaegig)).toBe("29.10.2026, 08:00 – 29.10.2026, 18:00");
    // Ein Bogen aus einer anderen Zeitzone zeigt seine Wandzeit, nicht umgerechnet.
    const fremd = { einsatz: { zeitraumVon: tag, zeitraumBis: tag, zeitraumVonIso: "2026-10-29T08:00:00-05:00", ortAuftrag: "" } };
    expect(zeitraumVonBis(fremd)).toBe("29.10.2026, 08:00 – 29.10.2026");
    const alt = { einsatz: { zeitraumVon: tag, zeitraumBis: tag + 1, ortAuftrag: "" } };
    expect(zeitraumDeutsch(alt)).toBe("29.10.2026 – 30.10.2026");
  });

  it("meldet „bis vor von“ auch am selben Tag über die Uhrzeit", () => {
    const b = neuerBogen();
    b.einsatz = { ...b.einsatz, zeitraumVonIso: zeitraumZeitIso(b.einsatz.zeitraumVon, 18 * 60), zeitraumBisIso: zeitraumZeitIso(b.einsatz.zeitraumBis, 8 * 60) };
    expect(pruefpunkte(b, false).some((p) => p.text.startsWith("Einsatzzeitraum: „bis“ liegt vor „von“"))).toBe(true);
    b.einsatz = einsatzVorgabe(b.einsatz.zeitraumVon);
    expect(pruefpunkte(b, false).some((p) => p.text.includes("„bis“ liegt vor „von“"))).toBe(false);
  });

  it("die Eingangsprüfung verwirft unlesbare Zeitpunkte und richtet den Datumsteil am Tag aus", () => {
    const b = neuerBogen();
    const roh = JSON.parse(JSON.stringify(b));
    roh.einsatz.zeitraumVonIso = "8 Uhr";
    roh.einsatz.zeitraumBisIso = "1999-01-01T18:00:00+01:00";
    expect(bogenBefund(roh).ok).toBe(true);
    expect(roh.einsatz.zeitraumVonIso).toBeUndefined();
    expect(zeitraumIsoLesen(roh.einsatz.zeitraumBisIso)).toEqual({ tag: b.einsatz.zeitraumBis, minuten: 1080, offsetMinuten: 60 });
  });
});
