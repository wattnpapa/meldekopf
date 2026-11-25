/**
 * Herkunft: neu in der Meldekopf-App. Fahrzeuge am Tor: raus, zurück, Rückgängig, Folgemeldung, Abgleich zweier Geräte.
 * Als .tsx, weil die Sammlung im localStorage liegt (Testprojekt mit jsdom).
 */
import { beforeEach, describe, expect, it } from "vitest";
import { OrganisationsTyp, PersonalErfassung, SCHEMA_VERSION, jetztZeitpunkt, staerke, type Erfassungsbogen } from "@bos/eeb-format/model";
import { EinsatzArt, MeldeStatus, einsaetzeLaden as kernEinsaetzeLaden, einsatzAnlegen, type MeldeEintrag } from "@bos/meldekopf/einsaetze";
import { aggregiere } from "../auswertung";
import { einsaetzeLaden } from "../einsaetze-lesen";
import { sammlungenSchreiben } from "../eintrag-zeiten";
import { einsatzAbgleichen } from "../weitergabe/einsatz-abgleich";
import { fahrzeugBewegen, fahrzeugBewegungZurueck, fahrzeugeDerEinheit, fahrzeugStandVereint, torFahrzeuge, unterwegsText } from "./fahrzeug-stand";

function bogen(kennzeichen: (string | undefined)[]): Erfassungsbogen {
  return {
    schemaVersion: SCHEMA_VERSION,
    stand: jetztZeitpunkt(),
    einheit: { organisation: OrganisationsTyp.THW, einheitsTyp: { freitext: "B" }, hierarchie: [{ bezeichnung: { freitext: "Ort" }, name: "Rathenow" }] },
    einsatz: { zeitraumVon: 0, zeitraumBis: 0, ortAuftrag: "" },
    personalErfassung: PersonalErfassung.NUR_STAERKE,
    staerkeManuell: { fuehrer: 0, unterfuehrer: 2, mannschaft: 7, gesamt: 9 },
    personal: [],
    fahrzeuge: kennzeichen.map((k) => ({ typ: { freitext: "MTW" }, ...(k ? { kennzeichen: k } : {}) })),
    sofortbedarf: { ruhezeitErforderlich: false, unterbringung: false, verpflegungPersonen: 0, dieselLiter: 0, benzinLiter: 0, gemischLiter: 0 },
  } as Erfassungsbogen;
}

function eintrag(id: string, b: Erfassungsbogen, empfangenAm: number, einheit = "e1"): MeldeEintrag {
  return { id, einheitSchluessel: einheit, empfangenAm, quelle: "manuell", status: MeldeStatus.ANWESEND, bogen: b };
}

function einsatzMit(eintraege: MeldeEintrag[]): string {
  const s = einsatzAnlegen("Hochwasser", EinsatzArt.EINSATZ);
  const liste = kernEinsaetzeLaden();
  liste.find((x) => x.id === s.id)!.eintraege = eintraege;
  sammlungenSchreiben(liste);
  return s.id;
}

const sammlung = (id: string) => einsaetzeLaden().find((x) => x.id === id)!;
const uhr = (ms: number) => `t${ms}`;
/** Zeiten nahe der Gegenwart: Eine Sammlung, die seit 90 Tagen ruht, räumt sich selbst auf. */
const T = Date.now() - 60_000;

beforeEach(() => localStorage.clear());

describe("Fahrzeuge am Tor", () => {
  it("vermerkt raus und zurück mit Uhrzeit im Verlauf und lässt die Stärke unberührt", () => {
    const id = einsatzMit([eintrag("m1", bogen(["THW-81234", "THW-81284"]), T)]);
    const vorher = aggregiere(sammlung(id).eintraege, EinsatzArt.EINSATZ);

    expect(fahrzeugBewegen(id, "m1", "THW81234", true, T + 1000)).not.toBeNull();
    let f = torFahrzeuge(sammlung(id));
    expect(f.map((x) => x.unterwegsSeit)).toEqual([T + 1000, null]);
    expect(unterwegsText(f, uhr)).toBe(`1 von 2 Fahrzeugen unterwegs: MTW THW-81234 seit t${T + 1000}`);

    fahrzeugBewegen(id, "m1", "THW81234", false, T + 2000);
    f = torFahrzeuge(sammlung(id));
    expect(f[0]).toMatchObject({ unterwegsSeit: null, zurueckAm: T + 2000 });
    expect(unterwegsText(f, uhr)).toBe("");
    expect(sammlung(id).eintraege[0]!.vermerke?.map((v) => v.text)).toEqual(["Fahrzeug MTW THW-81234: fährt raus", "Fahrzeug MTW THW-81234: ist zurück"]);

    const nachher = aggregiere(sammlung(id).eintraege, EinsatzArt.EINSATZ);
    expect(nachher.staerke).toEqual(vorher.staerke);
    expect(nachher.fahrzeuge).toBe(vorher.fahrzeuge);
    expect(sammlung(id).eintraege[0]!.status).toBe(MeldeStatus.ANWESEND);
    expect(staerke(sammlung(id).eintraege[0]!.bogen).gesamt).toBe(9);
  });

  it("nimmt eine Bewegung samt Vermerk zurück", () => {
    const id = einsatzMit([eintrag("m1", bogen(["THW-81234"]), T)]);
    fahrzeugBewegen(id, "m1", "THW81234", true, T + 1000);
    const v = fahrzeugBewegen(id, "m1", "THW81234", false, T + 2000)!;
    expect(fahrzeugBewegungZurueck(v)).toBe(true);
    expect(torFahrzeuge(sammlung(id))[0]!.unterwegsSeit).toBe(T + 1000);
    expect(sammlung(id).eintraege[0]!.vermerke?.map((x) => x.text)).toEqual(["Fahrzeug MTW THW-81234: fährt raus"]);

    const erste = fahrzeugBewegen(einsatzMit([eintrag("m2", bogen(["OL-FW 1"]), T)]), "m2", "OLFW1", true, T + 1)!;
    fahrzeugBewegungZurueck(erste);
    const e = sammlung(erste.einsatzId).eintraege[0]!;
    expect(e.fahrzeugStand).toBeUndefined();
    expect(e.vermerke).toBeUndefined();
  });

  it("führt ein Fahrzeug ohne Kennzeichen über seinen Platz im Bogen", () => {
    const id = einsatzMit([eintrag("m1", bogen([undefined, "THW-81234"]), T)]);
    expect(torFahrzeuge(sammlung(id)).map((f) => f.schluessel)).toEqual(["#1", "THW81234"]);
    fahrzeugBewegen(id, "m1", "#1", true, T + 1000);
    expect(unterwegsText(torFahrzeuge(sammlung(id)), uhr)).toBe(`1 von 2 Fahrzeugen unterwegs: MTW seit t${T + 1000}`);
  });

  it("gibt null zurück, wenn es das Fahrzeug an dieser Fassung nicht gibt", () => {
    const id = einsatzMit([eintrag("m1", bogen(["THW-81234"]), T)]);
    expect(fahrzeugBewegen(id, "m1", "THW99999", true)).toBeNull();
    expect(fahrzeugBewegen(id, "gibt-es-nicht", "THW81234", true)).toBeNull();
  });

  it("behält den Stand über eine Folgemeldung, solange das Kennzeichen bleibt", () => {
    const id = einsatzMit([eintrag("m1", bogen(["THW-81234", "THW-81284"]), T)]);
    fahrzeugBewegen(id, "m1", "THW81234", true, T + 1000);
    const liste = kernEinsaetzeLaden();
    liste.find((x) => x.id === id)!.eintraege.push(eintrag("m2", bogen(["THW-81234", "THW-70000"]), T + 5000));
    sammlungenSchreiben(liste);
    const f = torFahrzeuge(sammlung(id));
    expect(f.map((x) => [x.eintragId, x.schluessel, x.unterwegsSeit])).toEqual([
      ["m2", "THW81234", T + 1000],
      ["m2", "THW70000", null],
    ]);
    // Die Rückkehr wird an der neuen Fassung vermerkt und gilt, weil sie jünger ist.
    fahrzeugBewegen(id, "m2", "THW81234", false, T + 6000);
    expect(torFahrzeuge(sammlung(id))[0]!.unterwegsSeit).toBeNull();
  });

  it("zeigt am Tor keine Fahrzeuge abgerückter Einheiten", () => {
    const ab = { ...eintrag("m2", bogen(["OL-FW 1"]), T, "e2"), status: MeldeStatus.ABGERUECKT };
    const id = einsatzMit([eintrag("m1", bogen(["THW-81234"]), T), ab]);
    expect(torFahrzeuge(sammlung(id)).map((f) => f.kennzeichen)).toEqual(["THW-81234"]);
  });

  it("legt eine zweite Bewegung in derselben Millisekunde hinter die erste", () => {
    const id = einsatzMit([eintrag("m1", bogen(["THW-81234"]), T)]);
    fahrzeugBewegen(id, "m1", "THW81234", true, T + 1000);
    fahrzeugBewegen(id, "m1", "THW81234", false, T + 1000);
    expect(fahrzeugeDerEinheit(sammlung(id).eintraege[0]!, sammlung(id).eintraege)[0]!.unterwegsSeit).toBeNull();
  });

  it("sagt „Alle“, wenn alle Fahrzeuge der Einheit draußen sind", () => {
    const id = einsatzMit([eintrag("m1", bogen(["A-B 1", "A-B 2"]), T)]);
    fahrzeugBewegen(id, "m1", "AB1", true, T + 1);
    fahrzeugBewegen(id, "m1", "AB2", true, T + 2);
    expect(unterwegsText(torFahrzeuge(sammlung(id)), uhr)).toMatch(/^Alle 2 Fahrzeuge unterwegs: /);
  });
});

describe("Abgleich zweier Geräte", () => {
  it("vereint je Fahrzeug die jüngste Bewegung, Schlüssel sortiert", () => {
    const a = { einheitSchluessel: "e1", fahrzeugStand: { B: { unterwegs: true, am: 5 }, A: { unterwegs: true, am: 1 } } };
    const b = { einheitSchluessel: "e1", fahrzeugStand: { A: { unterwegs: false, am: 3 } } };
    const fremd = { einheitSchluessel: "e2", fahrzeugStand: { A: { unterwegs: true, am: 9 } } };
    const v = fahrzeugStandVereint(a, [a, b, fremd])!;
    expect(Object.keys(v)).toEqual(["A", "B"]);
    expect(v).toEqual({ A: { unterwegs: false, am: 3 }, B: { unterwegs: true, am: 5 } });
    expect(fahrzeugStandVereint({ einheitSchluessel: "e3" }, [a, b])).toBeUndefined();
  });

  it("übernimmt beim Einsatz-Import die Bewegungen des anderen Geräts samt Vermerk", () => {
    const id = einsatzMit([eintrag("m1", bogen(["THW-81234", "THW-81284"]), T)]);
    // Stand des zweiten Geräts: dieselbe Sammlung, dort fuhr das zweite Fahrzeug raus.
    const dort = JSON.parse(JSON.stringify(sammlung(id))) as ReturnType<typeof sammlung>;
    dort.eintraege[0]!.fahrzeugStand = { THW81284: { unterwegs: true, am: T + 3000 } };
    dort.eintraege[0]!.vermerke = [{ zeit: T + 3000, text: "Fahrzeug MTW THW-81284: fährt raus" }];
    // Hier fuhr inzwischen das erste raus.
    fahrzeugBewegen(id, "m1", "THW81234", true, T + 2000);

    einsatzAbgleichen(dort, T + 4000);
    expect(torFahrzeuge(sammlung(id)).map((f) => f.unterwegsSeit)).toEqual([T + 2000, T + 3000]);
    expect(sammlung(id).eintraege[0]!.vermerke?.map((v) => v.text).sort()).toEqual(["Fahrzeug MTW THW-81234: fährt raus", "Fahrzeug MTW THW-81284: fährt raus"]);
  });
});
