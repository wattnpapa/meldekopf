/**
 * Herkunft: Erfassungsbogen `src/app/runde12-hilfen-frist.test.ts` (Commit 1d7ed5f).
 */
import { describe, expect, it } from "vitest";
import { DATENSCHUTZFRIST_TAGE, datenschutzfristAbgelaufen } from "@bos/eeb-format/datenschutzfrist";
import { MINUTEN_JE_TAG } from "@bos/eeb-format/model";
import { bogenAnonymisiert, stempelQuelleSetzen } from "../hilfen";

// hilfen.ts rechnet die Frist selbst nach (kein Import von datenschutzfrist: Startbündel, ADR-003 Aufnahmeregel 5).
describe("bogenAnonymisiert", () => {
  it("stimmt mit datenschutzfristAbgelaufen überein", () => {
    const stand = 1_000_000;
    const ende = stand + DATENSCHUTZFRIST_TAGE * MINUTEN_JE_TAG;
    for (const uebung of [false, true]) {
      for (const jetzt of [stand, ende - 1, ende, ende + 1]) {
        stempelQuelleSetzen(() => jetzt);
        expect(bogenAnonymisiert({ uebung, stand })).toBe(datenschutzfristAbgelaufen({ uebung, stand }, jetzt));
      }
    }
  });
});
