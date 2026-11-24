/**
 * Herkunft: neu in der Meldekopf-App (Rollenaudit Runde 2, U3 und Bereitstellungsraum P1-1).
 */
import { describe, it, expect } from "vitest";
import {
  Ernaehrung,
  Fahrerlaubnis,
  Geschlecht,
  KontaktArt,
  OrganisationsTyp,
  PersonalErfassung,
  SCHEMA_VERSION,
  StaerkeRolle,
  jetztZeitpunkt,
  type Erfassungsbogen,
  type Person,
} from "@bos/eeb-format/model";
import { MeldeStatus, type MeldeEintrag } from "@bos/meldekopf/einsaetze";
import { fahrzeugKurzformen, fahrzeugSuchtext, fuehrungDerEinheit, fuehrungText, funkrufDerEinheit, funkrufnamen } from "./erreichbarkeit";
import { auftraegeImEinsatz, einheitenFiltern, passtZuAuftrag } from "./einheiten-liste";
import { tabellenZeilen, TABELLEN_SPALTEN } from "./einheiten-tabelle";
import { angabenErben, handAenderungText } from "./angaben-alter";

function person(over: Partial<Person> = {}): Person {
  return {
    vorname: "Petra",
    nachname: "Lang",
    staerkeRolle: StaerkeRolle.FUEHRER,
    funktionen: [],
    fahrerlaubnis: Fahrerlaubnis.NONE,
    geschlecht: Geschlecht.M,
    ernaehrung: Ernaehrung.FLEISCH,
    kontakte: [],
    zusatzqualifikationen: [],
    ...over,
  };
}

/** Eine Schnellerfassung: nur Stärke, die Führungskraft als einzige Person. */
function schnell(over: Partial<Erfassungsbogen> = {}): Erfassungsbogen {
  return {
    schemaVersion: SCHEMA_VERSION,
    // Frisch gestempelt: Die Datenschutzfrist läuft noch, der Bogen ist nicht anonymisiert.
    stand: jetztZeitpunkt(),
    einheit: {
      organisation: OrganisationsTyp.THW,
      einheitsTyp: { freitext: "FGr R (B)" },
      hierarchie: [{ bezeichnung: { freitext: "Ortsverband" }, name: "Oldenburg" }],
    },
    einsatz: { zeitraumVon: 100, zeitraumBis: 101, ortAuftrag: "" },
    personalErfassung: PersonalErfassung.NUR_STAERKE,
    staerkeManuell: { fuehrer: 0, unterfuehrer: 2, mannschaft: 7, gesamt: 9 },
    personal: [
      person({
        kontakte: [
          { art: KontaktArt.MOBIL, dienstlich: false, wert: "01601111111" },
          { art: KontaktArt.MOBIL, dienstlich: true, wert: "01712345678" },
          { art: KontaktArt.FUNK, dienstlich: true, wert: "Heros Oldenburg 22/51" },
        ],
      }),
    ],
    fahrzeuge: [],
    ...over,
  };
}

function eintrag(id: string, b: Erfassungsbogen, over: Partial<MeldeEintrag> = {}): MeldeEintrag {
  return { id, einheitSchluessel: id, empfangenAm: Date.now(), quelle: "manuell", status: MeldeStatus.ANWESEND, bogen: b, ...over };
}

describe("Funkrufname der Einheit", () => {
  it("nimmt den Funkrufnamen der Führungskraft, wenn kein Fahrzeug einen trägt", () => {
    expect(funkrufDerEinheit(schnell())).toBe("Heros Oldenburg 22/51");
  });

  it("stellt den Funkrufnamen eines Fahrzeugs voran", () => {
    const b = schnell({
      fahrzeuge: [{ typ: { freitext: "MTW" }, funkrufname: { kennwort: { freitext: "Heros" }, eigenerStandort: false, ort: "Wildeshausen", teile: [24, 72] } }],
    });
    expect(funkrufnamen(b)).toHaveLength(2);
    expect(funkrufDerEinheit(b)).toContain("24/72");
  });

  it("bleibt leer ohne Funkrufnamen", () => {
    expect(funkrufDerEinheit(schnell({ personal: [] }))).toBe("");
  });
});

describe("Führung der Einheit", () => {
  it("nennt Namen und die dienstliche Nummer vor der privaten", () => {
    const f = fuehrungDerEinheit(schnell());
    expect(f?.name).toBe("Petra Lang");
    expect(f?.telefon?.wert).toBe("01712345678");
    expect(fuehrungText(schnell())).toBe("Petra Lang · 01712345678");
  });

  it("nennt die Führungskraft auch ohne Kontakt", () => {
    expect(fuehrungText(schnell({ personal: [person()] }))).toBe("Petra Lang");
  });

  it("ist leer ohne Personen und nach Ablauf der Datenschutzfrist", () => {
    expect(fuehrungDerEinheit(schnell({ personal: [] }))).toBeUndefined();
    // Stand vor über 90 Tagen: Namen und Nummern sind entfernt, „Einsatzkraft 1" ist keine Auskunft.
    expect(fuehrungDerEinheit(schnell({ stand: jetztZeitpunkt() - 91 * 1440 }))).toBeUndefined();
  });
});

describe("Fahrzeuge für Karte und Suche", () => {
  const b = schnell({
    fahrzeuge: [
      { typ: { freitext: "Radlader" }, kennzeichen: "THW-81217" },
      { typ: { freitext: "LKW Kipper" }, aenderungen: "mit Ladekran" },
    ],
  });

  it("listet die Typen in Bogenfolge", () => {
    expect(fahrzeugKurzformen(b)).toEqual(["Radlader", "LKW Kipper"]);
  });

  it("gibt der Suche Typ und Sondergerät", () => {
    expect(fahrzeugSuchtext(b)).toContain("mit Ladekran");
  });
});

describe("Suche der Einheitenliste (Rollenaudit Runde 2)", () => {
  const radlader = eintrag("a", schnell({ fahrzeuge: [{ typ: { freitext: "Radlader" } }] }));
  const ohne = eintrag(
    "b",
    schnell({ einheit: { organisation: OrganisationsTyp.THW, einheitsTyp: { freitext: "FGr N" }, hierarchie: [{ bezeichnung: { freitext: "Ortsverband" }, name: "Brake" }] }, personal: [] }),
  );

  it("findet die Einheit über den Fahrzeugtyp", () => {
    expect(einheitenFiltern([radlader, ohne], "radlader").map((e) => e.id)).toEqual(["a"]);
  });

  it("findet die Einheit über den Funkrufnamen der Führungskraft", () => {
    expect(einheitenFiltern([radlader, ohne], "22/51").map((e) => e.id)).toEqual(["a"]);
    expect(einheitenFiltern([radlader, ohne], "Heros").map((e) => e.id)).toEqual(["a"]);
  });

  it("durchsucht weiter keine Personennamen", () => {
    expect(einheitenFiltern([radlader, ohne], "Lang")).toEqual([]);
  });
});

describe("Tabelle: Funkrufname und Führung", () => {
  it("führt beide Spalten hinter dem Bedarf", () => {
    const folge = TABELLEN_SPALTEN.map((s) => s.schluessel);
    expect(folge.indexOf("funkruf")).toBe(folge.indexOf("bedarf") + 1);
    expect(folge.indexOf("fuehrung")).toBe(folge.indexOf("funkruf") + 1);
  });

  it("füllt die Zeile", () => {
    const [z] = tabellenZeilen([eintrag("a", schnell())]);
    expect(z!.funkruf).toBe("Heros Oldenburg 22/51");
    expect(z!.fuehrung).toBe("Petra Lang · 01712345678");
  });
});

describe("Filter nach vergebenem Auftrag", () => {
  const liste = [
    eintrag("a", schnell(), { notiz: "EA 2 Deich Nord" }),
    eintrag("b", schnell(), { notiz: "ea 2  deich nord", status: MeldeStatus.ABGERUECKT }),
    eintrag("c", schnell(), { notiz: "entlassen, Heimfahrt", status: MeldeStatus.ABGERUECKT }),
    eintrag("d", schnell()),
  ];

  it("fasst gleiche Aufträge zusammen, auch von Abgerückten", () => {
    expect(auftraegeImEinsatz(liste).map((a) => [a.text, a.einheiten])).toEqual([
      ["EA 2 Deich Nord", 2],
      ["entlassen, Heimfahrt", 1],
    ]);
  });

  it("filtert auf genau einen Auftrag", () => {
    const [ea2] = auftraegeImEinsatz(liste);
    expect(liste.filter((e) => passtZuAuftrag(e, ea2!.schluessel)).map((e) => e.id)).toEqual(["a", "b"]);
  });
});

describe("Vermerk der Berichtigung", () => {
  it("nennt die Berichtigung, nicht die Stärke", () => {
    const vorher = eintrag("a", schnell());
    const angaben = angabenErben(vorher, "berichtigt", Date.UTC(2026, 10, 24, 20, 40));
    expect(angaben.kennzeichnung).toBe(true);
    expect(handAenderungText({ angaben })).toMatch(/^Angaben am Meldekopf berichtigt /);
  });
});
