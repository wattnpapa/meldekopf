/**
 * Herkunft: neu in der Meldekopf-App. Die P2-Befunde des Rollenaudits Runde 2 (docs/audits/runde-2), je Befund die
 * Rechnung dahinter.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { KontaktArt, OrganisationsTyp, PersonalErfassung, SCHEMA_VERSION, StaerkeRolle, jetztZeitpunkt, type Erfassungsbogen } from "@bos/eeb-format/model";
import { EinsatzArt, MeldeStatus, einsatzAnlegen, type MeldeEintrag } from "@bos/meldekopf/einsaetze";
import { bedarfNichtErfasst } from "./auswertung";
import { einheitenFiltern, organisationenImEinsatz, suchbegriffe } from "./einheiten-liste";
import { abgerueckteSumme, staerkeJeOrganisation, staerkemeldungText } from "./lage-zusatz";
import { bedarfKurz, literAusEingabe, mitBedarf } from "./bedarf-aendern";
import { angabenBestaetigt, angabenZeit, handAenderungText } from "./angaben-alter";
import { geltendeJeEinheit } from "./fassung-vorrang";
import { standBestaetigen, standBestaetigungZurueck } from "./stand-bestaetigen";
import { meldungAufnehmen } from "./eintrag-zeiten";
import { einsaetzeLaden } from "./einsaetze-lesen";
import { verpflegungMonitorText } from "./lagemonitor";
import { verpflegungKostText } from "./weitergabe/pdf-dokument";
import { bogenCsvInhalt } from "./weitergabe/bogen-csv";
import { schnellerfassungsBogen } from "./schnellerfassung/schnellerfassung";
import { zeitraumLeer } from "./zeitraum-eingabe";
import { pruefpunkte } from "./hilfen";

function schnell(org: OrganisationsTyp, ort: string, typ: string, st: [number, number, number], over: Partial<Erfassungsbogen> = {}): Erfassungsbogen {
  return {
    schemaVersion: SCHEMA_VERSION,
    stand: jetztZeitpunkt(),
    einheit: { organisation: org, einheitsTyp: { freitext: typ }, hierarchie: [{ bezeichnung: { freitext: "Ort" }, name: ort }] },
    einsatz: { zeitraumVon: 0, zeitraumBis: 0, ortAuftrag: "" },
    personalErfassung: PersonalErfassung.NUR_STAERKE,
    staerkeManuell: { fuehrer: st[0], unterfuehrer: st[1], mannschaft: st[2], gesamt: st[0] + st[1] + st[2] },
    personal: [],
    fahrzeuge: [],
    ...over,
  };
}

let nr = 0;
function eintrag(b: Erfassungsbogen, over: Partial<MeldeEintrag> = {}): MeldeEintrag {
  nr++;
  return { id: `m${nr}`, einheitSchluessel: `e${nr}`, empfangenAm: Date.now(), quelle: "manuell", status: MeldeStatus.ANWESEND, bogen: b, ...over };
}

describe("Schnellerfassung setzt nichts, was niemand angegeben hat (Meldekopf P2-7, UEAL U5, U14)", () => {
  it("lässt den Einsatzzeitraum leer und meldet das nicht als Lücke", () => {
    const b = schnellerfassungsBogen();
    expect(zeitraumLeer(b.einsatz)).toBe(true);
    expect(pruefpunkte({ ...b, staerkeManuell: { fuehrer: 0, unterfuehrer: 1, mannschaft: 3, gesamt: 4 } }).map((p) => p.text).join(" ")).not.toContain("Einsatzzeitraum");
  });

  it("schreibt Rolle, Geschlecht und Ernährung der Ansprechperson leer in die CSV", () => {
    const b = schnell(OrganisationsTyp.THW, "Oldenburg", "ZTr", [1, 1, 2], {
      personal: [
        {
          vorname: "Petra", nachname: "Schulze", staerkeRolle: StaerkeRolle.FUEHRER, funktionen: [], fahrerlaubnis: 0, geschlecht: 0, ernaehrung: 0,
          kontakte: [{ art: KontaktArt.MOBIL, dienstlich: true, wert: "01712345678" }], zusatzqualifikationen: [],
        },
      ],
    });
    const zeilen = bogenCsvInhalt(b).slice(1).split("\r\n");
    const kopf = zeilen[0]!.split(";");
    const person = zeilen.find((z) => z.includes(";Person;"))!.split(";");
    expect(person[kopf.indexOf("Nachname")]).toBe("Schulze");
    for (const spalte of ["Rolle", "Geschlecht", "Ernährung"]) expect(person[kopf.indexOf(spalte)]).toBe("");
  });
});

describe("„Bedarf nicht erfasst“ hängt nicht am Fahrzeug (UEAL U4)", () => {
  it("gilt für jede Schnellerfassung ohne Sofortbedarf, mit oder ohne Fahrzeug", () => {
    expect(bedarfNichtErfasst(schnell(OrganisationsTyp.THW, "A", "ZTr", [1, 1, 2]))).toBe(true);
    expect(bedarfNichtErfasst(schnell(OrganisationsTyp.THW, "A", "ZTr", [1, 1, 2], { fahrzeuge: [{ typ: { freitext: "MTW" } }] }))).toBe(true);
  });

  it("endet, sobald ein Bedarf nachgetragen ist", () => {
    const b = schnell(OrganisationsTyp.THW, "A", "ZTr", [1, 1, 2]);
    const neu = mitBedarf(b, { verpflegungPersonen: 0, dieselLiter: 80, benzinLiter: 0, gemischLiter: 0, unterbringung: true, ruhezeitErforderlich: false }, b.stand + 1)!;
    expect(neu.kurz).toBe("Unterbringung, Diesel 80 l");
    expect(bedarfNichtErfasst(neu.neu)).toBe(false);
    expect(neu.neu.stand).toBeGreaterThan(b.stand);
  });
});

describe("Bedarf ändern (Bereitstellungsraum P2-4)", () => {
  it("liest Liter als ganze Zahl ab 0", () => {
    expect(literAusEingabe("")).toBe(0);
    expect(literAusEingabe(" 80 ")).toBe(80);
    expect(literAusEingabe("80 l")).toBeNull();
    expect(literAusEingabe("-5")).toBeNull();
    expect(literAusEingabe("12,5")).toBeNull();
  });

  it("legt nichts ab, wenn nichts gemeldet und nichts geändert ist", () => {
    const b = schnell(OrganisationsTyp.THW, "A", "ZTr", [1, 1, 2]);
    const leer = { verpflegungPersonen: 0, dieselLiter: 0, benzinLiter: 0, gemischLiter: 0, unterbringung: false, ruhezeitErforderlich: false };
    expect(bedarfKurz(leer)).toBe("kein Bedarf");
    expect(mitBedarf(b, leer, b.stand + 1)).toBeNull();
    const mit = { ...b, sofortbedarf: { ...leer, ruhezeitErforderlich: true } };
    expect(mitBedarf(mit, { ...leer, ruhezeitErforderlich: true }, b.stand + 1)).toBeNull();
    // Ein gemeldeter Bedarf lässt sich wieder auf „kein Bedarf" stellen.
    expect(mitBedarf(mit, leer, b.stand + 1)?.kurz).toBe("kein Bedarf");
  });
});

describe("Zeile unter den Summen (Meldekopf P2-1, P2-6; Bereitstellungsraum P2-2; UEAL U12)", () => {
  const liste = [
    eintrag(schnell(OrganisationsTyp.THW, "Oldenburg", "ZTr", [1, 1, 2], { fahrzeuge: [{ typ: { freitext: "MTW" } }] })),
    eintrag(schnell(OrganisationsTyp.THW, "Oldenburg", "B", [0, 2, 7], { fahrzeuge: [{ typ: { freitext: "GKW" } }, { typ: { freitext: "MzKW" } }] })),
    eintrag(schnell(OrganisationsTyp.FEUERWEHR, "Rastede", "LF", [0, 1, 8])),
    eintrag(schnell(OrganisationsTyp.DRK, "Brake", "SEG", [0, 1, 5], { fahrzeuge: [{ typ: { freitext: "KTW" } }] }), { status: MeldeStatus.ABGERUECKT }),
    eintrag(schnell(OrganisationsTyp.THW, "Übungsort", "ZTr", [1, 0, 0], { uebung: true })),
  ];

  it("rechnet die Stärke je Organisation über die Anwesenden, die zählen", () => {
    expect(staerkeJeOrganisation(liste, EinsatzArt.EINSATZ).map((o) => [o.organisation, o.einheiten, o.staerke.gesamt, o.fahrzeuge])).toEqual([
      ["THW", 2, 13, 3],
      ["Feuerwehr", 1, 9, 0],
    ]);
  });

  it("nennt Stärke und Fahrzeuge der Abgerückten", () => {
    const ab = abgerueckteSumme(liste, EinsatzArt.EINSATZ);
    expect([ab.einheiten, ab.staerke.gesamt, ab.fahrzeuge]).toEqual([1, 6, 1]);
  });

  it("fasst die Stärkemeldung in eine Zeile mit DTG", () => {
    const text = staerkemeldungText("Hochwasser Hunte", liste, EinsatzArt.EINSATZ, new Date(2026, 10, 24, 21, 5));
    expect(text).toBe("242105nov26 Hochwasser Hunte: 3 Einheiten, Stärke 1 / 4 / 17 // 22, 3 Fahrzeuge; abgerückt 1 Einheit, Stärke 0 / 1 / 5 // 6");
  });

  it("bietet die Organisationen der Liste zum Filtern an", () => {
    expect(organisationenImEinsatz(liste).map((o) => [o.name, o.einheiten])).toEqual([["DRK", 1], ["Feuerwehr", 1], ["THW", 3]]);
  });
});

describe("Suche mit Wortfolge (Bereitstellungsraum P2-1)", () => {
  const ea2 = eintrag(schnell(OrganisationsTyp.THW, "Westerstede", "B", [0, 2, 7]), { notiz: "EA 2 Deich Nord" });
  const ea1 = eintrag(schnell(OrganisationsTyp.FEUERWEHR, "Ammerland", "KFB", [1, 3, 18], { fahrzeuge: [{ typ: { freitext: "LF" }, kennzeichen: "WST-KF 2" }] }), {
    notiz: "EA 1 Wasserförderung Hunte",
  });

  it("zerlegt die Eingabe in Wörter und Wortfolgen", () => {
    expect(suchbegriffe('deich "EA 2"')).toEqual({ woerter: ["deich"], folgen: ["ea 2"] });
    expect(suchbegriffe("„EA 2“")).toEqual({ woerter: [], folgen: ["ea 2"] });
    expect(suchbegriffe('"offen')).toEqual({ woerter: [], folgen: ["offen"] });
  });

  it("trifft ohne Anführungszeichen wie bisher über Felder hinweg, mit ihnen nur die Folge in einem Feld", () => {
    expect(einheitenFiltern([ea2, ea1], "EA 2")).toHaveLength(2);
    expect(einheitenFiltern([ea2, ea1], '"EA 2"')).toEqual([ea2]);
  });
});

describe("Stand bestätigen (Bereitstellungsraum P2-5)", () => {
  let einsatzId = "";
  let kopf: MeldeEintrag;
  beforeEach(() => {
    localStorage.clear();
    einsatzId = einsatzAnlegen("Bereitstellungsraum", EinsatzArt.EINSATZ).id;
    kopf = meldungAufnehmen(einsatzId, schnell(OrganisationsTyp.THW, "Oldenburg", "ZTr", [1, 1, 2]), { quelle: "manuell" })!.eintrag;
  });

  it("setzt das Alter der Angaben neu, vermerkt es und lässt sich zurücknehmen", () => {
    const spaeter = Date.now() + 3 * 3_600_000;
    const r = standBestaetigen(einsatzId, kopf.id, spaeter)!;
    const nach = geltendeJeEinheit(einsaetzeLaden().find((s) => s.id === einsatzId)!.eintraege)[0]!;
    expect(angabenZeit(nach)).toBe(spaeter);
    expect(handAenderungText(nach)).toMatch(/^Stand am Meldekopf bestätigt /);
    expect(nach.vermerke?.slice(-1)[0]?.text).toBe("Stand bestätigt: Angaben stimmen noch");

    standBestaetigungZurueck(einsatzId, kopf.id, r.vorher);
    const zurueck = geltendeJeEinheit(einsaetzeLaden().find((s) => s.id === einsatzId)!.eintraege)[0]!;
    expect(zurueck.angaben).toBeUndefined();
    expect(zurueck.vermerke?.some((v) => v.text.startsWith("Stand bestätigt")) ?? false).toBe(false);
  });

  it("lässt den Vermerk einer früheren Handänderung stehen", () => {
    const vorher = { angaben: { seit: 1000, wort: "Meldung" as const, bedarf: true, kennzeichnung: true, geaendertAm: Date.UTC(2026, 10, 24, 18, 0) } };
    const text = handAenderungText({ angaben: angabenBestaetigt(vorher, Date.UTC(2026, 10, 24, 21, 0)) });
    expect(text).toMatch(/^Bedarf am Meldekopf geändert .* · Stand am Meldekopf bestätigt /);
  });
});

describe("Verpflegung heißt überall dasselbe (Bereitstellungsraum P2-3)", () => {
  it("nennt am Lagemonitor Anforderung und Anwesende, wenn sie abweichen", () => {
    expect(verpflegungMonitorText(105, 105)).toBe("Verpflegung 105");
    expect(verpflegungMonitorText(49, 105)).toBe("Verpflegung 49 angefordert (105 vor Ort)");
  });

  it("nennt auf dem Lageblatt vegetarisch und vegan", () => {
    expect(verpflegungKostText({ vegetarisch: 7, vegan: 1 })).toBe(", davon 7 vegetarisch, 1 vegan");
    expect(verpflegungKostText({ vegetarisch: 0, vegan: 0 })).toBe("");
  });
});
