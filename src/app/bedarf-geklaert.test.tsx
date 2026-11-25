/**
 * Herkunft: neu in der Meldekopf-App. Sofortbedarf als geklärt abhaken, Prüfhinweise zur Kenntnis nehmen.
 * Als .tsx, weil die Sammlung im localStorage liegt (Testprojekt mit jsdom).
 */
import { beforeEach, describe, expect, it } from "vitest";
import { OrganisationsTyp, PersonalErfassung, SCHEMA_VERSION, jetztZeitpunkt, type Erfassungsbogen } from "@bos/eeb-format/model";
import { EinsatzArt, MeldeStatus, einsaetzeLaden as kernEinsaetzeLaden, einsatzAnlegen, type MeldeEintrag } from "@bos/meldekopf/einsaetze";
import { bedarfGeklaertAm, bedarfKlaeren, hinweiseGesehen, hinweiseQuittieren, offeneHinweise } from "./bedarf-geklaert";
import { bedarfMarken, bedarfOffen, offenText, passtZuBedarfsfilter } from "./einheiten-tabelle";
import { bedarfKurz } from "./lagetafel";
import { sammlungenSchreiben } from "./eintrag-zeiten";
import { einsaetzeLaden } from "./einsaetze-lesen";

function bogen(diesel: number, ruhezeit = true): Erfassungsbogen {
  return {
    schemaVersion: SCHEMA_VERSION,
    stand: jetztZeitpunkt(),
    einheit: { organisation: OrganisationsTyp.THW, einheitsTyp: { freitext: "B" }, hierarchie: [{ bezeichnung: { freitext: "Ort" }, name: "Rathenow" }] },
    einsatz: { zeitraumVon: 0, zeitraumBis: 0, ortAuftrag: "" },
    personalErfassung: PersonalErfassung.NUR_STAERKE,
    staerkeManuell: { fuehrer: 0, unterfuehrer: 2, mannschaft: 7, gesamt: 9 },
    personal: [],
    fahrzeuge: [],
    sofortbedarf: { ruhezeitErforderlich: ruhezeit, unterbringung: false, verpflegungPersonen: 9, dieselLiter: diesel, benzinLiter: 0, gemischLiter: 0 },
  } as Erfassungsbogen;
}

function eintrag(id: string, b: Erfassungsbogen, empfangenAm: number): MeldeEintrag {
  return { id, einheitSchluessel: "e1", empfangenAm, quelle: "manuell", status: MeldeStatus.ANWESEND, bogen: b };
}

/** Legt einen Einsatz mit den Einträgen an und gibt seine ID zurück. */
function einsatzMit(eintraege: MeldeEintrag[]): string {
  const s = einsatzAnlegen("Hochwasser", EinsatzArt.EINSATZ);
  const liste = kernEinsaetzeLaden();
  liste.find((x) => x.id === s.id)!.eintraege = eintraege;
  sammlungenSchreiben(liste);
  return s.id;
}

const geladen = (id: string) => einsaetzeLaden().find((x) => x.id === id)!.eintraege;
const erster = (id: string) => geladen(id)[0]!;
const marke = (b: Erfassungsbogen, art: string) => bedarfMarken(b).find((m) => m.art === art)!;

/** Zeiten nahe der Gegenwart: Eine Sammlung, die seit 90 Tagen ruht, räumt sich selbst auf. */
const T = Date.now() - 60_000;

beforeEach(() => localStorage.clear());

describe("Sofortbedarf als geklärt abhaken", () => {
  it("hakt einen Bedarf ab, schreibt den Vermerk und nimmt den Haken wieder zurück", () => {
    const b = bogen(400);
    const id = einsatzMit([eintrag("m1", b, T + 1000)]);
    expect(bedarfGeklaertAm(erster(id), marke(b, "ruhezeit"), geladen(id))).toBeNull();

    expect(bedarfKlaeren(id, "m1", marke(b, "ruhezeit"), true, T + 5000)).toBe(true);
    let alle = geladen(id);
    expect(bedarfGeklaertAm(alle[0]!, marke(b, "ruhezeit"), alle)).toBe(T + 5000);
    expect(bedarfGeklaertAm(alle[0]!, marke(b, "diesel"), alle)).toBeNull();
    expect(alle[0]!.vermerke?.map((v) => v.text)).toEqual(["Bedarf geklärt: Ruhezeit"]);

    bedarfKlaeren(id, "m1", marke(b, "ruhezeit"), false, T + 6000);
    alle = geladen(id);
    expect(bedarfGeklaertAm(alle[0]!, marke(b, "ruhezeit"), alle)).toBeNull();
    expect(alle[0]!.bedarfGeklaert).toBeUndefined();
    expect(alle[0]!.vermerke?.map((v) => v.text)).toEqual(["Bedarf geklärt: Ruhezeit", "Bedarf wieder offen: Ruhezeit"]);
  });

  it("gilt über eine Folgemeldung mit gleichem Wert weiter und ist bei anderem Wert wieder offen", () => {
    const alt = bogen(400);
    const id = einsatzMit([eintrag("m1", alt, T + 1000)]);
    bedarfKlaeren(id, "m1", marke(alt, "diesel"), true, T + 2000);
    bedarfKlaeren(id, "m1", marke(alt, "ruhezeit"), true, T + 2000);

    const neu = bogen(600);
    const liste = kernEinsaetzeLaden();
    liste.find((x) => x.id === id)!.eintraege.push(eintrag("m2", neu, T + 3000));
    sammlungenSchreiben(liste);
    const alle = geladen(id);
    const kopf = alle.find((e) => e.id === "m2")!;
    expect(bedarfGeklaertAm(kopf, marke(neu, "ruhezeit"), alle)).toBe(T + 2000);
    expect(bedarfGeklaertAm(kopf, marke(neu, "diesel"), alle)).toBeNull();
  });

  it("nimmt geklärten Bedarf aus dem Filter „dringend“, lässt ihn aber im Sprung aus den Kopfzahlen", () => {
    const b = bogen(0);
    const id = einsatzMit([eintrag("m1", b, T + 1000)]);
    expect(passtZuBedarfsfilter(erster(id), "dringend", geladen(id))).toBe(true);
    bedarfKlaeren(id, "m1", marke(b, "ruhezeit"));
    const alle = geladen(id);
    expect(passtZuBedarfsfilter(alle[0]!, "dringend", alle)).toBe(false);
    expect(passtZuBedarfsfilter(alle[0]!, "ruhezeit", alle)).toBe(true);
  });

  it("zählt neben den Kopfzahlen, was noch offen ist, und nimmt Geklärtes von der Tafel", () => {
    const b = bogen(0);
    const id = einsatzMit([eintrag("m1", b, T + 1000), { ...eintrag("m2", bogen(0), T + 1000), einheitSchluessel: "e2" }]);
    expect(bedarfOffen(geladen(id), EinsatzArt.EINSATZ)).toEqual({ ruhezeit: 2, unterbringung: 0 });
    expect(offenText(2, 2)).toBe("");
    expect(bedarfKurz(erster(id), geladen(id))).toEqual(["Ruhezeit"]);

    bedarfKlaeren(id, "m1", marke(b, "ruhezeit"));
    const alle = geladen(id);
    expect(bedarfOffen(alle, EinsatzArt.EINSATZ).ruhezeit).toBe(1);
    expect(offenText(1, 2)).toBe("davon 1 offen");
    expect(offenText(0, 2)).toBe("alle geklärt");
    expect(bedarfKurz(alle[0]!, alle)).toEqual([]);
    expect(bedarfKurz(alle[1]!, alle)).toEqual(["Ruhezeit"]);
  });

  it("meldet einen fehlenden Eintrag, ohne zu schreiben", () => {
    const id = einsatzMit([]);
    expect(bedarfKlaeren(id, "fehlt", { art: "ruhezeit", lang: "Ruhezeit" })).toBe(false);
    expect(hinweiseQuittieren(id, "fehlt", ["x"])).toBe(false);
  });
});

describe("Prüfhinweise zur Kenntnis nehmen", () => {
  const punkte = [{ text: "Funkrufname fehlt" }, { text: "Sitzplätze fehlen: 4" }];

  it("zählt gesehene Hinweise nicht mehr als offen, einen neuen aber schon", () => {
    const id = einsatzMit([eintrag("m1", bogen(0), T + 1000)]);
    expect(offeneHinweise(punkte, erster(id), geladen(id))).toHaveLength(2);

    hinweiseQuittieren(id, "m1", punkte.map((p) => p.text), true, T + 4000);
    const alle = geladen(id);
    expect(offeneHinweise(punkte, alle[0]!, alle)).toEqual([]);
    expect(hinweiseGesehen(alle[0]!, alle).am).toBe(T + 4000);
    expect(offeneHinweise([...punkte, { text: "Erreichbarkeit fehlt" }], alle[0]!, alle).map((p) => p.text)).toEqual(["Erreichbarkeit fehlt"]);
    expect(alle[0]!.vermerke?.slice(-1)[0]?.text).toBe("Hinweise zur Kenntnis genommen (2)");
  });

  it("zeigt nach „Wieder zeigen“ alle Hinweise wieder", () => {
    const id = einsatzMit([eintrag("m1", bogen(0), T + 1000)]);
    hinweiseQuittieren(id, "m1", punkte.map((p) => p.text));
    hinweiseQuittieren(id, "m1", [], false);
    const alle = geladen(id);
    expect(offeneHinweise(punkte, alle[0]!, alle)).toHaveLength(2);
    expect(alle[0]!.hinweiseGesehen).toBeUndefined();
  });
});
