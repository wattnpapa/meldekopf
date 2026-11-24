/**
 * Herkunft: neu in der Meldekopf-App (Rollenaudit Runde 2, Meldekopf P1-1).
 */
import { beforeEach, describe, expect, it } from "vitest";
import { OrganisationsTyp, PersonalErfassung, SCHEMA_VERSION, jetztZeitpunkt, staerke, type Erfassungsbogen } from "@bos/eeb-format/model";
import { EinsatzArt, einsatzAnlegen, type MeldeEintrag } from "@bos/meldekopf/einsaetze";
import { meldungAufnehmen } from "../eintrag-zeiten";
import { einsaetzeLaden } from "../einsaetze-lesen";
import { geltendeJeEinheit } from "../fassung-vorrang";
import { meldungsNummern } from "../einheiten-tabelle";
import { summiereBoegen } from "../auswertung";
import { handAenderungText } from "../angaben-alter";
import { berichtigbar } from "../einsaetze-ui";
import { berichtigungAblegen, berichtigungTrifftAndere } from "./berichtigung";

function schnell(typ: string, ort = "Oldenburg", gesamt = 9): Erfassungsbogen {
  return {
    schemaVersion: SCHEMA_VERSION,
    stand: jetztZeitpunkt() - 5,
    einheit: {
      organisation: OrganisationsTyp.THW,
      einheitsTyp: { freitext: typ },
      hierarchie: [{ bezeichnung: { freitext: "Ortsverband" }, name: ort }],
    },
    einsatz: { zeitraumVon: 100, zeitraumBis: 101, ortAuftrag: "" },
    personalErfassung: PersonalErfassung.NUR_STAERKE,
    staerkeManuell: { fuehrer: 0, unterfuehrer: 1, mannschaft: gesamt - 1, gesamt },
    personal: [],
    fahrzeuge: [],
  };
}

function lage(einsatzId: string) {
  const s = einsaetzeLaden().find((x) => x.id === einsatzId)!;
  const koepfe = geltendeJeEinheit(s.eintraege);
  return { s, koepfe, gesamt: summiereBoegen(koepfe.map((e) => e.bogen)).staerke.gesamt };
}

describe("Angaben berichtigen", () => {
  let einsatzId = "";
  let fgrN: MeldeEintrag;

  beforeEach(() => {
    localStorage.clear();
    einsatzId = einsatzAnlegen("Hochwasser Hunte", EinsatzArt.EINSATZ).id;
    meldungAufnehmen(einsatzId, schnell("ZTr", "Brake", 4), { quelle: "manuell" });
    fgrN = meldungAufnehmen(einsatzId, schnell("FGr N"), { quelle: "manuell" })!.eintrag;
  });

  it("ändert den Einheitstyp, ohne eine zweite Einheit anzulegen", () => {
    const vorher = lage(einsatzId);
    const nr = meldungsNummern(vorher.s.eintraege).get(fgrN.einheitSchluessel);
    expect(vorher.gesamt).toBe(13);

    const neu = berichtigungAblegen(einsatzId, fgrN, {
      ...fgrN.bogen,
      einheit: { ...fgrN.bogen.einheit, einheitsTyp: { freitext: "FGr E" } },
      fahrzeuge: [{ typ: { freitext: "MLW IV" } }],
    });

    expect(neu).not.toBeNull();
    const nachher = lage(einsatzId);
    // Zwei Einheiten wie vorher, dieselbe Summe, dieselbe Nummer.
    expect(nachher.koepfe).toHaveLength(2);
    expect(nachher.gesamt).toBe(13);
    const kopf = nachher.koepfe.find((e) => e.einheitSchluessel === fgrN.einheitSchluessel)!;
    expect(kopf.bogen.einheit.einheitsTyp.freitext).toBe("FGr E");
    expect(kopf.bogen.fahrzeuge).toHaveLength(1);
    expect(meldungsNummern(nachher.s.eintraege).get(kopf.einheitSchluessel)).toBe(nr);
    expect(handAenderungText(kopf)).toMatch(/^Angaben am Meldekopf berichtigt /);
    // Die bisherige Fassung bleibt in der Historie.
    expect(nachher.s.eintraege.filter((e) => e.einheitSchluessel === fgrN.einheitSchluessel)).toHaveLength(2);
  });

  it("rechnet eine berichtigte Stärke in die Summe", () => {
    berichtigungAblegen(einsatzId, fgrN, { ...fgrN.bogen, staerkeManuell: { fuehrer: 0, unterfuehrer: 1, mannschaft: 5, gesamt: 6 } });
    const { koepfe, gesamt } = lage(einsatzId);
    expect(staerke(koepfe.find((e) => e.einheitSchluessel === fgrN.einheitSchluessel)!.bogen).gesamt).toBe(6);
    expect(gesamt).toBe(10);
  });

  it("legt nichts ab, wenn sich nichts geändert hat", () => {
    expect(berichtigungAblegen(einsatzId, fgrN, fgrN.bogen, fgrN.bogen.stand)).toBeNull();
    expect(lage(einsatzId).s.eintraege).toHaveLength(2);
  });

  it("erkennt, wenn die berichtigten Angaben eine andere Einheit der Lage treffen", () => {
    const { s } = lage(einsatzId);
    const wieZtr = { ...fgrN.bogen, einheit: { ...schnell("ZTr", "Brake").einheit } };
    expect(berichtigungTrifftAndere(s, fgrN, wieZtr)?.bogen.einheit.hierarchie[0]?.name).toBe("Brake");
    expect(berichtigungTrifftAndere(s, fgrN, { ...fgrN.bogen, einheit: { ...fgrN.bogen.einheit, einheitsTyp: { freitext: "FGr E" } } })).toBeUndefined();
    expect(berichtigungTrifftAndere(s, fgrN, fgrN.bogen)).toBeUndefined();
  });

  it("bietet die Berichtigung nur für die eigene Erfassung an", () => {
    expect(berichtigbar(fgrN)).toBe(true);
    expect(berichtigbar({ ...fgrN, quelle: "scan" })).toBe(false);
    expect(berichtigbar({ ...fgrN, teilEtikett: "Teil 1" })).toBe(false);
    expect(berichtigbar({ ...fgrN, bogen: { ...fgrN.bogen, personalErfassung: PersonalErfassung.VOLLSTAENDIG } })).toBe(false);
  });
});
