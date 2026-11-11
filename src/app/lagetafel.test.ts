/**
 * Neu im Meldekopf: Inhalt und Satz der Tafel-Ansicht des Lagemonitors.
 */
import { describe, expect, it } from "vitest";
import { EEB_EPOCHE_MS, OrganisationsTyp, PersonalErfassung, SCHEMA_VERSION, type Erfassungsbogen, type Sofortbedarf } from "@bos/eeb-format/model";
import { EinsatzArt, MeldeStatus, type Einsatzsammlung, type MeldeEintrag } from "@bos/meldekopf/einsaetze";
import { einheitSymbolSvg } from "@bos/eeb-satz/taktische-zeichen-bogen";
import { TZ_SYMBOLE } from "@bos/taktische-zeichen/symbole";
import { Resvg } from "@resvg/resvg-js";
import {
  SATZ,
  ZEICHEN_BAND,
  bedarfKurz,
  dauerKurz,
  dauerZeile,
  herkunftKurzform,
  kartenBedarf,
  kurzName,
  meldungTeile,
  namenBedarf,
  nameTeile,
  tafelFortlaufend,
  tafelSatz,
  tafelbild,
  textBreite,
  werBreite,
  wochentag,
  zeichenFuerTafel,
  type TafelEinheit,
  type TafelMasse,
  type TafelSatz,
  type TafelZelle,
} from "./lagetafel";
import "./eintrag-zeiten"; // Zusatzfelder am Eintrag (eingetroffenAm, abgerueckAm, notiz, vermerke)

const JETZT = new Date(2026, 10, 10, 18, 0).getTime();
const MIN = 60_000;
const T = OrganisationsTyp;

/** Stand im Bogen: lokale Wandzeit in Minuten seit der Epoche des Formats. */
function stand(ms: number): number {
  const d = new Date(ms);
  return Math.round((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes()) - EEB_EPOCHE_MS) / 60_000);
}

interface Angaben {
  org?: OrganisationsTyp;
  orgName?: string;
  ort: string;
  typ?: number | string;
  st?: [number, number, number];
  zug?: string;
  /** Empfangen vor … Minuten (Vorgabe 30). */
  vorMin?: number;
  /** Eingetroffen vor … Minuten, wenn es von der Empfangszeit abweicht. */
  daVorMin?: number;
  /** Stand im Bogen vor … Minuten (Vorgabe: Empfangszeit). */
  standVorMin?: number;
  schluessel?: string;
  status?: MeldeStatus;
  bedarf?: Partial<Sofortbedarf>;
  notiz?: string;
  funk?: number[];
  uebung?: boolean;
  abgeruecktVorMin?: number;
  vermerke?: { vorMin: number; text: string }[];
  /** Etikett eines abgeteilten Teils der Einheit. */
  teil?: string;
}

let laufend = 0;

function bogen(a: Angaben): Erfassungsbogen {
  const st = a.st ?? [0, 2, 7];
  const gesamt = st[0] + st[1] + st[2];
  return {
    schemaVersion: SCHEMA_VERSION,
    stand: stand(JETZT - (a.standVorMin ?? a.vorMin ?? 30) * MIN),
    ...(a.uebung ? { uebung: true } : {}),
    einheit: {
      organisation: a.org ?? T.THW,
      ...(a.orgName ? { organisationName: a.orgName } : {}),
      einheitsTyp: a.typ == null ? {} : typeof a.typ === "number" ? { code: a.typ } : { freitext: a.typ },
      hierarchie: [{ bezeichnung: { code: 1 }, name: a.ort }],
    },
    einsatz: { zeitraumVon: 0, zeitraumBis: 0, ortAuftrag: "" },
    personalErfassung: PersonalErfassung.NUR_STAERKE,
    personal: [],
    staerkeManuell: { fuehrer: st[0], unterfuehrer: st[1], mannschaft: st[2], gesamt },
    fahrzeuge: a.funk ? [{ typ: { freitext: "MTW" }, funkrufname: { kennwort: { code: 1 }, eigenerStandort: true, teile: a.funk } }] : [],
    ...(a.bedarf
      ? { sofortbedarf: { verpflegungPersonen: gesamt, dieselLiter: 0, benzinLiter: 0, gemischLiter: 0, unterbringung: false, ruhezeitErforderlich: false, ...a.bedarf } }
      : {}),
  };
}

function eintrag(a: Angaben): MeldeEintrag {
  const nr = ++laufend;
  return {
    id: `m${String(nr).padStart(3, "0")}`,
    einheitSchluessel: a.schluessel ?? `e${nr}`,
    empfangenAm: JETZT - (a.vorMin ?? 30) * MIN,
    quelle: "scan",
    status: a.status ?? MeldeStatus.ANWESEND,
    ...(a.zug ? { zugEtikett: a.zug } : {}),
    ...(a.daVorMin != null ? { eingetroffenAm: JETZT - a.daVorMin * MIN } : {}),
    ...(a.abgeruecktVorMin != null ? { abgerueckAm: JETZT - a.abgeruecktVorMin * MIN } : {}),
    ...(a.notiz ? { notiz: a.notiz } : {}),
    ...(a.teil ? { teilEtikett: a.teil } : {}),
    ...(a.vermerke ? { vermerke: a.vermerke.map((v) => ({ zeit: JETZT - v.vorMin * MIN, text: v.text })) } : {}),
    bogen: bogen(a),
  };
}

function sammlung(eintraege: MeldeEintrag[], art = EinsatzArt.EINSATZ): Einsatzsammlung {
  return { id: "s1", name: "Hochwasser Weser", art, ort: "Brake", angelegt: JETZT - 300 * MIN, geaendert: JETZT, eintraege };
}

describe("nameTeile", () => {
  it("trennt Herkunft und Typ und kennt die Kurzform des Vokabulars", () => {
    expect(nameTeile(bogen({ ort: "Oldenburg (NI)", typ: 4 }).einheit)).toEqual({ herkunft: "THW Oldenburg (NI)", ort: "Oldenburg (NI)", typ: "Bergungsgruppe", typKurz: "B" });
    expect(nameTeile(bogen({ ort: "Brake", typ: 3 }).einheit)).toEqual({ herkunft: "THW Brake", ort: "Brake", typ: "Zugtrupp Technischer Zug", typKurz: "ZTr TZ" });
  });

  it("kürzt „Fachgruppe“ im ausgeschriebenen Typ zu „FGr“: Das Unterscheidende steht am Ende", () => {
    expect(nameTeile(bogen({ ort: "Brake", typ: 16 }).einheit).typ).toBe("FGr Notversorgung und Notinstandsetzung");
    expect(nameTeile(bogen({ ort: "Brake", typ: 27 }).einheit)).toMatchObject({ typ: "FGr Wasserschaden/Pumpen (A)", typKurz: "FGr WP (A)" });
  });

  it("nennt den Ort nicht doppelt, wenn der Name der Organisation ihn trägt", () => {
    expect(nameTeile(bogen({ org: T.FEUERWEHR, orgName: "FF Elsfleth", ort: "Elsfleth", typ: "Löschzug" }).einheit)).toEqual({
      herkunft: "FF Elsfleth",
      ort: "",
      typ: "Löschzug",
      typKurz: "Löschzug",
    });
  });

  it("lässt den Typ weg, wenn die Herkunft ihn schon nennt, und kommt ohne Typ aus", () => {
    expect(nameTeile(bogen({ org: T.SONSTIGE, orgName: "Bundeswehr Panzerpionierzug", ort: "", typ: "Panzerpionierzug" }).einheit)).toEqual({
      herkunft: "Bundeswehr Panzerpionierzug",
      ort: "",
      typ: "",
      typKurz: "",
    });
    expect(nameTeile(bogen({ org: T.DRK, ort: "Wesermarsch" }).einheit)).toEqual({ herkunft: "DRK Wesermarsch", ort: "Wesermarsch", typ: "", typKurz: "" });
  });
});

describe("nameTeile: Standort", () => {
  it("nennt den Standort am Ende der Herkunft getrennt: Die Karte kürzt den längeren Teil und lässt den anderen ganz", () => {
    const juh = nameTeile(bogen({ org: T.JUH, orgName: "Johanniter-Unfall-Hilfe Regionalverband Weser-Ems", ort: "Oldenburg", typ: "SEG" }).einheit);
    expect(juh.herkunft).toBe("Johanniter-Unfall-Hilfe Regionalverband Weser-Ems Oldenburg");
    expect(juh.ort).toBe("Oldenburg");
    // Der Standort ist immer das Ende der Herkunft, durch ein Leerzeichen getrennt.
    for (const e of [bogen({ ort: "Clausthal-Zellerfeld", typ: 4 }).einheit, bogen({ org: T.DRK, ort: "Wesermarsch", typ: "SEG Betreuung" }).einheit]) {
      const n = nameTeile(e);
      expect(n.ort).not.toBe("");
      expect(n.herkunft.endsWith(" " + n.ort)).toBe(true);
    }
  });
});

describe("kurzName und herkunftKurzform", () => {
  it("kürzt Organisationen und Gliederungen, wie es auf der Lagekarte üblich ist", () => {
    expect(kurzName("Freiwillige Feuerwehr Lenglern")).toBe("FF Lenglern");
    expect(kurzName("DRK-Kreisverband Buchenrode e. V.")).toBe("DRK-KV Buchenrode");
    expect(kurzName("Deutsches Rotes Kreuz Kreisverband Göttingen-Northeim e.V.")).toBe("DRK KV Göttingen-Northeim");
    expect(kurzName("Johanniter-Unfall-Hilfe e.V. Regionalverband Weser-Ems")).toBe("JUH RV Weser-Ems");
    expect(kurzName("Malteser Hilfsdienst e. V., Ortsgruppe Rhauderfehn")).toBe("MHD, OG Rhauderfehn");
    expect(kurzName("Bundeswehr Panzerpionierkompanie 130")).toBe("Bw Panzerpionierkompanie 130");
    expect(kurzName("Technisches Hilfswerk Ortsverband Gieboldehausen")).toBe("THW OV Gieboldehausen");
    expect(kurzName("Schnelleinsatzgruppe Betreuung")).toBe("SEG Betreuung");
  });

  it("lässt Namen ohne übliche Kurzform und Wörter, die nur so beginnen, unverändert", () => {
    expect(kurzName("THW Gieboldehausen")).toBe("THW Gieboldehausen");
    expect(kurzName("Feuerwehrhaus Lenglern")).toBe("Feuerwehrhaus Lenglern");
    expect(kurzName("Ortsvereinigung Nord")).toBe("Ortsvereinigung Nord");
    expect(kurzName("Kreisverbandsgeschäftsstelle")).toBe("Kreisverbandsgeschäftsstelle");
    // Bliebe nichts übrig, gilt der Name, wie er ist.
    expect(kurzName("e. V.")).toBe("e. V.");
  });

  it("kürzt Organisation und Standort einzeln: Der Standort bleibt das Ende der Kurzform", () => {
    expect(herkunftKurzform("Freiwillige Feuerwehr Lenglern", "Lenglern")).toBe("FF Lenglern");
    expect(herkunftKurzform("Johanniter-Unfall-Hilfe Regionalverband Weser-Ems Oldenburg", "Oldenburg")).toBe("JUH RV Weser-Ems Oldenburg");
    expect(herkunftKurzform("DRK-Kreisverband Buchenrode e. V.", "")).toBe("DRK-KV Buchenrode");
    expect(herkunftKurzform("THW Clausthal-Zellerfeld", "Clausthal-Zellerfeld")).toBe("THW Clausthal-Zellerfeld");
  });

  it("gibt einem Freitext-Typ die übliche Kürzung als Kurzform; ein Typ aus dem Vokabular behält seine", () => {
    expect(nameTeile(bogen({ org: T.DRK, ort: "Brake", typ: "Schnelleinsatzgruppe Betreuung" }).einheit).typKurz).toBe("SEG Betreuung");
    expect(nameTeile(bogen({ org: T.DRK, ort: "Brake", typ: "Betreuungszug" }).einheit).typKurz).toBe("Betreuungszug");
    expect(nameTeile(bogen({ ort: "Brake", typ: 4 }).einheit).typKurz).toBe("B");
  });
});

describe("meldungTeile", () => {
  it("hängt das Etikett eines abgeteilten Teils an den Typ, in Lang- und Kurzform", () => {
    expect(meldungTeile(eintrag({ ort: "Oldenburg (NI)", typ: 4, teil: "Fachberater" }))).toEqual({
      herkunft: "THW Oldenburg (NI)",
      ort: "Oldenburg (NI)",
      typ: "Bergungsgruppe (Fachberater)",
      typKurz: "B (Fachberater)",
    });
    // Ohne Etikett bleibt es bei Herkunft und Typ; ein Etikett aus Leerzeichen zählt nicht.
    expect(meldungTeile(eintrag({ ort: "Brake", typ: 4 })).typ).toBe("Bergungsgruppe");
    expect(meldungTeile(eintrag({ ort: "Brake", typ: 4, teil: "  " })).typ).toBe("Bergungsgruppe");
    // Nennt die Herkunft den Typ schon, steht das Etikett allein in der Typzeile.
    expect(meldungTeile(eintrag({ org: T.SONSTIGE, orgName: "Bundeswehr Panzerpionierzug", ort: "", typ: "Panzerpionierzug", teil: "Rest" })).typ).toBe("(Rest)");
  });
});

describe("tafelbild: feste Plätze", () => {
  it("ordnet nach Zug in Zählfolge, „ohne Zug“ zuletzt", () => {
    const tb = tafelbild(
      sammlung([
        eintrag({ ort: "Jever", zug: "10. Zug" }),
        eintrag({ ort: "Varel" }),
        eintrag({ ort: "Brake", zug: "2. Zug" }),
        eintrag({ ort: "Oldenburg (NI)", zug: "1. Zug" }),
      ]),
      JETZT,
    );
    expect(tb.gruppen.map((g) => g.titel)).toEqual(["1. Zug", "2. Zug", "10. Zug", "ohne Zug"]);
    expect(tb.gruppen.every((g) => g.kopf)).toBe(true);
  });

  it("ordnet ohne Züge nach Organisation, in der festen Folge des Formats", () => {
    const tb = tafelbild(
      sammlung([
        eintrag({ org: T.DRK, ort: "Wesermarsch", typ: "SEG Betreuung" }),
        eintrag({ org: T.FEUERWEHR, orgName: "FF Elsfleth", ort: "Elsfleth", typ: "Löschzug" }),
        eintrag({ ort: "Brake", typ: 4 }),
      ]),
      JETZT,
    );
    expect(tb.gruppen.map((g) => g.titel)).toEqual(["THW", "Feuerwehr", "DRK"]);
  });

  it("lässt den Kopf weg, wenn es nur eine Organisation gibt: Ihre Summe ist die Gesamtstärke", () => {
    const tb = tafelbild(sammlung([eintrag({ ort: "Brake", typ: 3 }), eintrag({ ort: "Brake", typ: 4 })]), JETZT);
    expect(tb.gruppen).toHaveLength(1);
    expect(tb.gruppen[0]!.kopf).toBe(false);
    // Ein einzelner Zug behält seinen Kopf: Er trägt den Namen des Zugs.
    const zug = tafelbild(sammlung([eintrag({ ort: "Brake", typ: 3, zug: "1. Zug" })]), JETZT);
    expect(zug.gruppen[0]).toMatchObject({ titel: "1. Zug", kopf: true });
  });

  it("stellt die Einheiten nach Eintreffzeit; eine Folgemeldung rückt niemanden nach vorn", () => {
    const tb = tafelbild(
      sammlung([
        eintrag({ ort: "Alt", schluessel: "alt", vorMin: 120 }),
        eintrag({ ort: "Mitte", schluessel: "mitte", vorMin: 60 }),
        eintrag({ ort: "Neu", schluessel: "neu", vorMin: 10 }),
        // Folgemeldung der zuerst eingetroffenen Einheit, eben eingegangen; die Eintreffzeit erbt sie (folgemeldungErbt).
        eintrag({ ort: "Alt", schluessel: "alt", vorMin: 2, daVorMin: 120, st: [0, 2, 5] }),
      ]),
      JETZT,
    );
    const einheiten = tb.gruppen[0]!.einheiten;
    expect(einheiten.map((e) => e.herkunft)).toEqual(["THW Alt", "THW Mitte", "THW Neu"]);
    // Die Zahl ändert sich am Platz.
    expect(einheiten[0]!.staerke.gesamt).toBe(7);
  });

  it("hält bei gleicher Eintreffzeit die Folge der Aufnahme: ein Stapel Bögen, in einem Zug eingelesen", () => {
    const tb = tafelbild(
      sammlung([
        eintrag({ ort: "Zuerst", schluessel: "z", vorMin: 40 }),
        eintrag({ ort: "Danach", schluessel: "d", vorMin: 40 }),
        eintrag({ ort: "Zuletzt", schluessel: "l", vorMin: 40 }),
        // Die zuerst aufgenommene Einheit meldet neu: Sie bleibt vorn.
        eintrag({ ort: "Zuerst", schluessel: "z", vorMin: 1, daVorMin: 40 }),
      ]),
      JETZT,
    );
    expect(tb.gruppen[0]!.einheiten.map((e) => e.herkunft)).toEqual(["THW Zuerst", "THW Danach", "THW Zuletzt"]);
  });

  it("rechnet je Gruppe dieselbe Stärke wie die Summe im Kopf", () => {
    const tb = tafelbild(
      sammlung([
        eintrag({ ort: "Oldenburg (NI)", zug: "1. Zug", st: [1, 1, 2] }),
        eintrag({ ort: "Oldenburg (NI)", zug: "1. Zug", st: [0, 3, 6] }),
        eintrag({ ort: "Brake", zug: "2. Zug", st: [0, 2, 5] }),
        eintrag({ org: T.FEUERWEHR, ort: "Elsfleth", st: [1, 3, 18] }),
      ]),
      JETZT,
    );
    expect(tb.gruppen.map((g) => [g.titel, g.staerke])).toEqual([
      ["1. Zug", { fuehrer: 1, unterfuehrer: 4, mannschaft: 8, gesamt: 13 }],
      ["2. Zug", { fuehrer: 0, unterfuehrer: 2, mannschaft: 5, gesamt: 7 }],
      ["ohne Zug", { fuehrer: 1, unterfuehrer: 3, mannschaft: 18, gesamt: 22 }],
    ]);
    const gesamt = tb.gruppen.reduce((n, g) => n + g.staerke.gesamt, 0);
    expect(gesamt).toBe(tb.bild.summen.staerke.gesamt);
    expect(gesamt).toBe(42);
  });

  it("stellt Übungsmeldungen in einem Einsatz als eigene, letzte Gruppe auf die Tafel, ohne sie zu zählen", () => {
    const tb = tafelbild(
      sammlung([
        eintrag({ ort: "Echt", zug: "1. Zug", st: [0, 2, 7] }),
        eintrag({ ort: "Geübt", zug: "1. Zug", uebung: true, st: [1, 1, 4], vorMin: 20, notiz: "Ausbildung Deichbau", funk: [22, 51], bedarf: { ruhezeitErforderlich: true } }),
        eintrag({ ort: "Früher", uebung: true, st: [0, 1, 3], vorMin: 50 }),
      ]),
      JETZT,
    );
    // Über die Züge hinweg: Stünde „Geübt" in ihrem Zug, ergäben dessen Karten nicht mehr dessen Summe.
    expect(tb.gruppen.map((g) => [g.titel, g.uebung, g.kopf])).toEqual([
      ["1. Zug", false, true],
      ["Übung", true, true],
    ]);
    const uebung = tb.gruppen[1]!;
    // Nach Eintreffzeit wie jede Gruppe.
    expect(uebung.einheiten.map((e) => e.herkunft)).toEqual(["THW Früher", "THW Geübt"]);
    // Weder Bedarf noch Bewegung: Beides gehört nicht in diese Lage, obwohl „Geübt" vor 20 Minuten kam und Ruhezeit meldet.
    expect(uebung.einheiten.every((e) => e.uebung && e.bedarf.length === 0 && e.marke === undefined)).toBe(true);
    // Die Gruppe geht über alle Züge: Der Zug der Einheit steht eigens da; ohne Zug fehlt das Feld.
    expect(uebung.einheiten[1]).toMatchObject({ zug: "1. Zug", auftrag: "Ausbildung Deichbau", soll: false, staerke: { fuehrer: 1, unterfuehrer: 1, mannschaft: 4, gesamt: 6 } });
    expect(uebung.einheiten[0]!.zug).toBeUndefined();
    // Eine zählende Einheit trägt das Feld nicht: Ihr Zug ist ihre Gruppe.
    expect(tb.gruppen[0]!.einheiten[0]!.zug).toBeUndefined();
    expect(uebung.einheiten[1]!.funkruf).toMatch(/22\/51$/);
    expect(uebung.staerke.gesamt).toBe(10);
    // Gezählt wird nur, was zählt: Kopf, Zwischensummen und Bedarf bleiben ohne die Übung.
    expect(tb.bild.summen.staerke.gesamt).toBe(9);
    expect(tb.gruppen.filter((g) => !g.uebung).reduce((n, g) => n + g.staerke.gesamt, 0)).toBe(tb.bild.summen.staerke.gesamt);
    expect(tb.gruppen[0]!.einheiten.map((e) => [e.herkunft, e.uebung])).toEqual([["THW Echt", false]]);
    expect(tb.bild.uebungenDaneben).toBe(2);
    expect(tb.bild.bedarf.ruhezeit).toBe(0);
    expect(tb.bild.bewegungen).toEqual([]);
    // Für die Randspalte hat jede Karte ihren kurzen Namen.
    expect(tb.namen.get(uebung.einheiten[0]!.id)).toBe("THW Früher");
  });

  it("führt in einer Übung keine eigene Gruppe: Dort zählt jede Meldung", () => {
    const tb = tafelbild(sammlung([eintrag({ ort: "Echt" }), eintrag({ ort: "Geübt", uebung: true })], EinsatzArt.UEBUNG), JETZT);
    expect(tb.gruppen.some((g) => g.uebung)).toBe(false);
    expect(tb.gruppen.flatMap((g) => g.einheiten).map((e) => [e.herkunft, e.uebung])).toEqual([
      ["THW Echt", false],
      ["THW Geübt", false],
    ]);
    expect(tb.bild.summen.einheiten).toBe(2);
    expect(tb.bild.uebungenDaneben).toBe(0);
  });

  it("lässt die einzige Organisation ohne Kopf, auch wenn Übungsmeldungen danebenstehen; abgerückte Übungsmeldungen sind keine Karte und tragen ihr Wort", () => {
    const tb = tafelbild(
      sammlung([
        eintrag({ ort: "Echt" }),
        eintrag({ ort: "Geübt", uebung: true }),
        eintrag({ ort: "Weg", uebung: true, status: MeldeStatus.ABGERUECKT, abgeruecktVorMin: 10 }),
        eintrag({ ort: "Fort", status: MeldeStatus.ABGERUECKT, abgeruecktVorMin: 20 }),
      ]),
      JETZT,
    );
    expect(tb.gruppen.map((g) => [g.titel, g.kopf, g.einheiten.length])).toEqual([
      ["THW", false, 1],
      ["Übung", true, 1],
    ]);
    // Die Übungsmeldung hat in dieser Lage nie gezählt: Als abgerückte läse sie sich sonst wie eine Einheit, die der Lage
    // fehlt. Das Kennzeichen steht neben dem Namen, nicht in ihm (gekürzt wird der Name, nicht das Kennzeichen).
    expect(tb.abgerueckt.map((a) => [a.name, a.uebung])).toEqual([
      ["THW Weg", true],
      ["THW Fort", false],
    ]);
    // In einer Übung zählt sie und trägt kein Kennzeichen.
    const uebung = tafelbild(sammlung([eintrag({ ort: "Weg", uebung: true, status: MeldeStatus.ABGERUECKT, abgeruecktVorMin: 10 })], EinsatzArt.UEBUNG), JETZT);
    expect(uebung.abgerueckt.map((a) => [a.name, a.uebung])).toEqual([["THW Weg", false]]);
  });

  it("stellt Übungsmeldungen auch dann hin, wenn sonst niemand in der Lage ist", () => {
    const tb = tafelbild(sammlung([eintrag({ ort: "A", uebung: true, zug: "1. Zug" }), eintrag({ ort: "B", uebung: true })]), JETZT);
    expect(tb.gruppen.map((g) => [g.titel, g.einheiten.length])).toEqual([["Übung", 2]]);
    // Die Gliederung richtet sich nach den zählenden Einheiten; ohne sie bleibt es bei der Vorgabe.
    expect(tb.gliederung).toBe("organisation");
    expect(tb.bild.summen.einheiten).toBe(0);
    expect(tb.bild.summen.staerke.gesamt).toBe(0);
    // Zeilen bestimmen die Breite der Karten nicht: Ohne Karten bleibt der Bedarf null.
    expect(tb.bedarf).toEqual({ breit: 0, drei: 0, zwei: 0 });
  });

  it("lässt die Breite der Karten von Übungsmeldungen unberührt: Ihre Zeilen werden gekürzt, nicht die Karten verbreitert", () => {
    const lang = { org: T.JUH, orgName: "Johanniter-Unfall-Hilfe Regionalverband Weser-Ems", ort: "Oldenburg", typ: "Schnelleinsatzgruppe Betreuung und Verpflegung mit Feldküche", notiz: "Betreuungsstelle Sporthalle am Deich, Abschnitt 3 bis 5" };
    const ohne = tafelbild(sammlung([eintrag({ ort: "Brake", typ: 4 })]), JETZT);
    const mit = tafelbild(sammlung([eintrag({ ort: "Brake", typ: 4 }), eintrag({ ...lang, uebung: true })]), JETZT);
    expect(mit.bedarf).toEqual(ohne.bedarf);
    // Zum Vergleich: Als zählende Einheit verbreiterte derselbe Bogen die Karten.
    const zaehlend = tafelbild(sammlung([eintrag({ ort: "Brake", typ: 4 }), eintrag(lang)]), JETZT);
    expect(zaehlend.bedarf.drei).toBeGreaterThan(ohne.bedarf.drei);
  });
});

describe("tafelbild: Angaben je Einheit", () => {
  it("trägt Funkrufname, Auftrag und Bedarf, ohne Personen", () => {
    const tb = tafelbild(
      sammlung([
        eintrag({ ort: "Oldenburg (NI)", typ: 4, st: [0, 3, 6], funk: [22, 51], notiz: "Sandsackfüllplatz Nord", bedarf: { ruhezeitErforderlich: true, unterbringung: true, verpflegungPersonen: 20 } }),
      ]),
      JETZT,
    );
    const e = tb.gruppen[0]!.einheiten[0]!;
    expect(e).toMatchObject({
      herkunft: "THW Oldenburg (NI)",
      typ: "Bergungsgruppe",
      typKurz: "B",
      funkruf: "Heros Oldenburg 22/51",
      auftrag: "Sandsackfüllplatz Nord",
      staerke: { fuehrer: 0, unterfuehrer: 3, mannschaft: 6, gesamt: 9 },
      bedarf: ["Ruhezeit", "Unterbringung", "Verpflegung 20"],
      soll: false,
    });
  });

  it("nennt als Bedarf nur, was zu entscheiden ist: Kraftstoff bleibt in der Einsatzansicht", () => {
    expect(bedarfKurz(eintrag({ ort: "Brake", bedarf: { dieselLiter: 120 } }))).toEqual([]);
    expect(bedarfKurz(eintrag({ ort: "Brake" }))).toEqual([]);
  });

  it("führt den Stand der Angaben als Zeitpunkt und bewertet ihn an der Einheit nicht", () => {
    const tb = tafelbild(sammlung([eintrag({ ort: "Frisch", vorMin: 20 }), eintrag({ ort: "Alt", vorMin: 20, standVorMin: 200 })]), JETZT);
    const [frisch, alt] = tb.gruppen[0]!.einheiten;
    expect(frisch!.stand).toBe(JETZT - 20 * MIN);
    expect(alt!.stand).toBe(JETZT - 200 * MIN);
    // Kein Warnkennzeichen je Einheit: Nach einer Stunde trüge es fast jede Karte. Die Sammelwarnung bleibt im Lagebild.
    expect(alt).not.toHaveProperty("standAlt");
    expect(tb.bild.anwesendenAlter).not.toBeNull();
  });

  it("markiert am Platz, was sich in den letzten Minuten bewegt hat", () => {
    const tb = tafelbild(
      sammlung([
        eintrag({ ort: "Ruhig", vorMin: 90 }),
        eintrag({ ort: "Neu", vorMin: 3 }),
        eintrag({ ort: "Nachtrag", vorMin: 2, daVorMin: 60 }),
        eintrag({ ort: "Folge", schluessel: "folge", vorMin: 120, st: [0, 2, 6] }),
        eintrag({ ort: "Folge", schluessel: "folge", vorMin: 5, daVorMin: 120, st: [0, 2, 4] }),
        eintrag({ ort: "Zurück", vorMin: 100, vermerke: [{ vorMin: 4, text: "Wieder als anwesend geführt" }] }),
      ]),
      JETZT,
    );
    const marken = Object.fromEntries(tb.gruppen[0]!.einheiten.map((e) => [e.herkunft, e.marke]));
    expect(marken["THW Ruhig"]).toBeUndefined();
    expect(marken["THW Neu"]).toEqual({ art: "neu", text: "neu" });
    expect(marken["THW Nachtrag"]).toEqual({ art: "neu", text: "nachgetragen" });
    // Die Folgemeldung nennt, um wie viel sich die Stärke geändert hat: Ein Verlust soll nicht wie ein Zugang aussehen.
    expect(marken["THW Folge"]).toEqual({ art: "folge", text: "Stärke −2" });
    expect(marken["THW Zurück"]).toEqual({ art: "wieder", text: "wieder da" });
  });

  it("nennt bei einer Folgemeldung den Zuwachs mit Plus und kommt ohne geänderte Stärke aus", () => {
    const tb = tafelbild(
      sammlung([
        eintrag({ ort: "Mehr", schluessel: "mehr", vorMin: 120, st: [0, 2, 5] }),
        eintrag({ ort: "Mehr", schluessel: "mehr", vorMin: 5, daVorMin: 120, st: [0, 3, 7] }),
        eintrag({ ort: "Gleich", schluessel: "gleich", vorMin: 120, st: [0, 2, 5] }),
        eintrag({ ort: "Gleich", schluessel: "gleich", vorMin: 4, daVorMin: 120, st: [0, 2, 5] }),
      ]),
      JETZT,
    );
    const marken = Object.fromEntries(tb.gruppen[0]!.einheiten.map((e) => [e.herkunft, e.marke]));
    expect(marken["THW Mehr"]).toEqual({ art: "folge", text: "Stärke +3" });
    expect(marken["THW Gleich"]).toEqual({ art: "folge", text: "Folgemeldung" });
  });

  it("führt abgerückte Einheiten getrennt, zuletzt abgerückte zuerst, und zählt sie nicht", () => {
    const tb = tafelbild(
      sammlung([
        eintrag({ ort: "Brake", typ: 4 }),
        eintrag({ ort: "Varel", typ: 6, status: MeldeStatus.ABGERUECKT, abgeruecktVorMin: 40 }),
        eintrag({ ort: "Jever", typ: 9, status: MeldeStatus.ABGERUECKT, vermerke: [{ vorMin: 12, text: "Abgerückt" }] }),
        eintrag({ ort: "Aurich", typ: 25, status: MeldeStatus.ABGERUECKT }),
      ]),
      JETZT,
    );
    expect(tb.abgerueckt.map((a) => [a.name, a.zeit])).toEqual([
      ["THW Jever FGr W (A)", JETZT - 12 * MIN],
      ["THW Varel FGr R (A)", JETZT - 40 * MIN],
      ["THW Aurich FGr E", null],
    ]);
    expect(tb.abgerueckt).toHaveLength(tb.bild.abgerueckt);
    expect(tb.gruppen.flatMap((g) => g.einheiten)).toHaveLength(1);
    // Kurzer Name für die Randspalte, für Anwesende wie für Abgerückte.
    expect([...tb.namen.values()].sort()).toEqual(["THW Aurich FGr E", "THW Brake B", "THW Jever FGr W (A)", "THW Varel FGr R (A)"]);
  });
});

describe("tafelbild: Teile und Abrückzeit", () => {
  it("unterscheidet abgeteilte Teile derselben Einheit auf der Karte und in der Randspalte", () => {
    const tb = tafelbild(
      sammlung([
        eintrag({ ort: "Oldenburg (NI)", typ: 4, teil: "Rest", vorMin: 50 }),
        eintrag({ ort: "Oldenburg (NI)", typ: 4, teil: "Fachberater", vorMin: 40 }),
      ]),
      JETZT,
    );
    const einheiten = tb.gruppen[0]!.einheiten;
    expect(einheiten.map((e) => e.typ)).toEqual(["Bergungsgruppe (Rest)", "Bergungsgruppe (Fachberater)"]);
    expect(einheiten.map((e) => tb.namen.get(e.id))).toEqual(["THW Oldenburg (NI) B (Rest)", "THW Oldenburg (NI) B (Fachberater)"]);
  });

  it("nennt als Abrückzeit nur eine bestätigte: Der Vermerk des Papier-Abgleichs trägt die Uhrzeit des Abgleichs", () => {
    const tb = tafelbild(
      sammlung([
        eintrag({ ort: "Brake", typ: 4 }),
        eintrag({ ort: "Varel", typ: 6, status: MeldeStatus.ABGERUECKT, vermerke: [{ vorMin: 9, text: "Abgerückt (Zeit vom Papier nicht bestätigt)" }] }),
        eintrag({ ort: "Jever", typ: 9, status: MeldeStatus.ABGERUECKT, vermerke: [{ vorMin: 30, text: "Abgerückt" }, { vorMin: 5, text: "Auftrag geändert" }] }),
      ]),
      JETZT,
    );
    expect(tb.abgerueckt.map((a) => [a.name, a.zeit])).toEqual([
      ["THW Jever FGr W (A)", JETZT - 30 * MIN],
      ["THW Varel FGr R (A)", null],
    ]);
  });
});

describe("kartenBedarf", () => {
  const einheit = (a: Angaben): TafelEinheit => tafelbild(sammlung([eintrag(a)]), JETZT).gruppen[0]!.einheiten[0]!;

  it("wächst mit dem Namen: Jede Fassung braucht dann mehr Breite", () => {
    const kurz = kartenBedarf(einheit({ ort: "Brake", typ: 4 }));
    // Ein Name ohne übliche Kurzform zählt ganz.
    const lang = kartenBedarf(einheit({ org: T.SONSTIGE, orgName: "Notfallseelsorge Kirchenkreis Oldenburger Münsterland", ort: "Cloppenburg", typ: "SEG" }));
    for (const fassung of ["breit", "drei", "zwei"] as const) expect(lang[fassung], fassung).toBeGreaterThan(kurz[fassung] + 10);
  });

  it("zählt für einen Namen mit üblicher Kurzform die Kurzform: Sie springt ein, wo der volle Name nicht passt", () => {
    const voll = einheit({ org: T.FEUERWEHR, orgName: "Freiwillige Feuerwehr", ort: "Lenglern", typ: "LF 10" });
    expect(voll.herkunft).toBe("Freiwillige Feuerwehr Lenglern");
    expect(voll.herkunftKurz).toBe("FF Lenglern");
    const kurz = einheit({ org: T.FEUERWEHR, orgName: "FF", ort: "Lenglern", typ: "LF 10" });
    expect(kurz.herkunftKurz).toBe("FF Lenglern");
    expect(kartenBedarf(voll)).toEqual(kartenBedarf(kurz));
  });

  it("zählt für einen Typ mit Kurzform die Kurzform: Sie springt ein, wo der ausgeschriebene nicht passt", () => {
    // „FGr Notversorgung und Notinstandsetzung" (Kurzform „FGr N") braucht nicht mehr als die Bergungsgruppe („B").
    const b = kartenBedarf(einheit({ ort: "Brake", typ: 4 }));
    const n = kartenBedarf(einheit({ ort: "Brake", typ: 16 }));
    expect(n.breit).toBeCloseTo(b.breit, 5);
    expect(n.drei).toBeCloseTo(b.drei, 5);
    // Ein Freitext-Typ hat keine Kurzform im Vokabular: Er zählt ganz, auch in der breiten Fassung, wo er unter dem Namen steht.
    const frei = kartenBedarf(einheit({ org: T.DRK, ort: "Brake", typ: "Betreuungsplatz mit Verpflegung und Feldküche" }));
    const kurz = kartenBedarf(einheit({ org: T.DRK, ort: "Brake", typ: "SEG" }));
    expect(frei.breit).toBeGreaterThan(kurz.breit + 10);
    expect(frei.drei).toBeGreaterThan(kurz.drei + 10);
    // Mit üblicher Kürzung („SEG" für „Schnelleinsatzgruppe") zählt die gekürzte Form, und zwar ganz.
    const seg = einheit({ org: T.DRK, ort: "Brake", typ: "Schnelleinsatzgruppe Betreuung" });
    expect(seg.typKurz).toBe("SEG Betreuung");
    expect(kartenBedarf(seg)).toEqual(kartenBedarf(einheit({ org: T.DRK, ort: "Brake", typ: "SEG Betreuung" })));
    expect(kartenBedarf(seg).drei).toBeGreaterThan(kurz.drei);
  });

  it("stellt in der breiten Fassung Name und Auftrag nebeneinander, in den anderen untereinander", () => {
    const ohne = kartenBedarf(einheit({ ort: "Clausthal-Zellerfeld", typ: 4 }));
    const mit = kartenBedarf(einheit({ ort: "Clausthal-Zellerfeld", typ: 4, notiz: "Sandsackfüllplatz Nord, Abschnitt 3 bis 5" }));
    // 41 Zeichen Auftrag: in „breit" kommen sie zum Namen dazu, in „drei" stehen sie in eigener Zeile.
    expect(mit.breit - ohne.breit).toBeGreaterThan(15);
    expect(mit.drei).toBeLessThan(mit.breit);
    // Ohne Auftrag reicht der breiten Karte ihre Mindestbreite, mit diesem Auftrag nicht mehr.
    expect(ohne.breit).toBeLessThan(SATZ.karte.breit.breite);
    expect(mit.breit).toBeGreaterThan(SATZ.karte.breit.breite);
  });

  it("reicht als Bedarf der Tafel den größten je Fassung weiter", () => {
    const tb = tafelbild(sammlung([eintrag({ ort: "Brake", typ: 4 }), eintrag({ ort: "Clausthal-Zellerfeld", typ: 16, notiz: "Beleuchtung und Stromversorgung der Einsatzstelle Nord" })]), JETZT);
    const einzeln = tb.gruppen.flatMap((g) => g.einheiten).map(kartenBedarf);
    for (const fassung of ["breit", "drei", "zwei"] as const) expect(tb.bedarf[fassung]).toBe(Math.max(...einzeln.map((b) => b[fassung])));
    expect(tafelbild(sammlung([]), JETZT).bedarf).toEqual({ breit: 0, drei: 0, zwei: 0 });
  });
});

describe("tafelSatz: Übungsmeldungen als Zeilen", () => {
  // Die Fläche eines Fernsehers mit 1920 × 1080 (wie im Test zum Blättern).
  const masse: TafelMasse = { breite: 1415, hoehe: 839, einheit: 10.8 };
  const zuege = [
    { kopf: true, anzahl: 6 },
    { kopf: true, anzahl: 6 },
    { kopf: true, anzahl: 6 },
  ];

  it("setzt die Gruppe der Übungsmeldungen in der Höhe einer Zeile: Vierzehn Übungsbögen lösen kein Blättern aus", () => {
    const alsKarten = tafelSatz([...zuege, { kopf: true, anzahl: 14 }], 0, masse);
    const alsZeilen = tafelSatz([...zuege, { kopf: true, anzahl: 14, zeile: true }], 0, masse);
    // Als Karten bräuchten sie eine zweite Seite, die 12 von 24 Sekunden keine zählende Einheit zeigte.
    expect(alsKarten.seiten.length).toBe(2);
    expect(alsZeilen.seiten.length).toBe(1);
    expect(alsZeilen.schrift).toBeGreaterThanOrEqual(alsKarten.schrift);
    // Jede Zelle der Gruppe steht da, mit ihrem Kopf.
    const zellen = alsZeilen.seiten.flat(2);
    expect(zellen.filter((z) => z.art === "einheit" && z.gruppe === 3)).toHaveLength(14);
    expect(zellen.filter((z) => z.art === "kopf" && z.gruppe === 3).length).toBeGreaterThanOrEqual(1);
  });

  it("rechnet für eine Zeile die Höhe der Zeile einer abgerückten Einheit, in jeder Fassung", () => {
    // Nur Zeilen: Die Schrift hängt an ihrer Höhe, nicht an der einer Karte.
    const nurZeilen = tafelSatz([{ kopf: true, anzahl: 40, zeile: true }], 0, masse);
    const nurKarten = tafelSatz([{ kopf: true, anzahl: 40 }], 0, masse);
    // Vierzig Zeilen stehen auf einer Seite, vierzig Karten blättern.
    expect(nurZeilen.seiten.length).toBe(1);
    expect(nurKarten.seiten.length).toBeGreaterThan(1);
    // Bei zwölf hat die Zeile die größere Schrift.
    expect(tafelSatz([{ kopf: true, anzahl: 12, zeile: true }], 0, masse).schrift).toBeGreaterThan(tafelSatz([{ kopf: true, anzahl: 12 }], 0, masse).schrift);
    // Zur Probe: Kopf und 40 Zeilen samt Fugen passen in die gesetzten Spalten der gerechneten Schrift.
    const hoehe = masse.hoehe / nurZeilen.schrift;
    for (const spalte of nurZeilen.seiten[0]!) {
      const zeilen = spalte.filter((z) => z.art === "einheit").length;
      const koepfe = spalte.filter((z) => z.art === "kopf").length;
      expect(koepfe * SATZ.kopf + zeilen * (SATZ.fuge + SATZ.abgang)).toBeLessThanOrEqual(hoehe + 1e-6);
    }
  });
});

describe("textBreite und namenBedarf", () => {
  // Gemessen im Browser (Chromium, Archivo Variable fett, 25,5 px) an den Namen einer Übung, in Schriftgrößen.
  const GEMESSEN: [string, number][] = [
    ["THW Albstadt", 6.647],
    ["THW Rathenow", 7.459],
    ["THW Gieboldehausen", 10.478],
    ["THW Oldenburg (NI)", 9.647],
    ["DLRG Baden", 6.216],
    ["Freiwillige Feuerwehr Lenglern", 14.592],
    ["DRK-Kreisverband Buchenrode e. V.", 17.063],
    ["Bundeswehr Panzerpionierzug", 14.576],
  ];

  it("schätzt die Breite eines Namens nie zu knapp und höchstens um ein Vierzehntel zu weit", () => {
    for (const [name, breite] of GEMESSEN) {
      expect(textBreite(name), name).toBeGreaterThanOrEqual(breite);
      expect(textBreite(name), name).toBeLessThanOrEqual(breite * 1.07);
    }
    // Schmale Zeichen zählen weniger als breite: Ein fester Mittelwert lag bei „THW Gieboldehausen" zu knapp.
    expect(textBreite("iiii")).toBeLessThan(textBreite("mmmm") / 2);
  });

  it("verlangt für den Namen allein die Breite seiner Kurzform neben der Stärke, ohne Typ und Auftrag", () => {
    const einheit = (a: Angaben): TafelEinheit => tafelbild(sammlung([eintrag(a)]), JETZT).gruppen[0]!.einheiten[0]!;
    const ff = einheit({ org: T.FEUERWEHR, orgName: "Freiwillige Feuerwehr", ort: "Lenglern", typ: "Schwerpunktfeuerwehr (Zug, erweitert)", notiz: "Bereitstellung am Feuerwehrhaus Lenglern, Zufahrt über die Bahnhofstraße" });
    const kurz = einheit({ org: T.FEUERWEHR, orgName: "FF", ort: "Lenglern", typ: "LF 10" });
    expect(namenBedarf(ff)).toEqual(namenBedarf(kurz));
    for (const fassung of ["breit", "drei", "zwei"] as const) expect(namenBedarf(ff)[fassung], fassung).toBeLessThan(kartenBedarf(ff)[fassung]);
    // Die Stärke steht neben dem Namen: Eine größere braucht mehr Platz.
    const gross = einheit({ org: T.FEUERWEHR, orgName: "FF", ort: "Lenglern", typ: "LF 10", st: [4, 18, 124] });
    expect(namenBedarf(gross).drei).toBeGreaterThan(namenBedarf(kurz).drei);
  });

  it("gibt dem Satz neben dem Bedarf aller Angaben den der Namen allein", () => {
    const tb = tafelbild(
      sammlung([
        eintrag({ ort: "Gieboldehausen", typ: 30, st: [0, 4, 13] }),
        eintrag({ org: T.DRK, orgName: "DRK-Kreisverband Buchenrode e. V.", ort: "", typ: "Sichtung und Registrierung (Betreuungsplatz)" }),
      ]),
      JETZT,
    );
    for (const fassung of ["breit", "drei", "zwei"] as const) {
      expect(tb.bedarfNamen[fassung], fassung).toBeGreaterThan(0);
      expect(tb.bedarfNamen[fassung], fassung).toBeLessThan(tb.bedarf[fassung]);
    }
  });
});

describe("werBreite", () => {
  it("gibt der Spalte die Breite des längsten Namens", () => {
    expect(werBreite({ ganz: 356, lang: 200, frei: 900 }, 1290)).toBe(356);
  });

  it("wächst für eine volle Form mit Kurzform nur, soweit dafür kein Auftrag gekürzt wird", () => {
    // Platz für den langen Typ oder Namen ist da: Die Spalte nimmt ihn.
    expect(werBreite({ ganz: 356, lang: 560, frei: 700 }, 1290)).toBe(560);
    // Der Auftrag lässt nur 534 px: Die volle Form weicht ihrer Kurzform, was ganz dastehen muss, bleibt ganz.
    expect(werBreite({ ganz: 356, lang: 560, frei: 534 }, 1290)).toBe(534);
    // Ist der Auftrag länger, als neben dem Namen Platz ist, gewinnt der Name.
    expect(werBreite({ ganz: 356, lang: 560, frei: 120 }, 1290)).toBe(356);
  });

  it("hält sich an den kleinsten und den größten Anteil", () => {
    expect(werBreite({ ganz: 60, lang: 0, frei: 1000 }, 1000)).toBe(1000 * SATZ.wer.min);
    expect(werBreite({ ganz: 950, lang: 0, frei: 0 }, 1000)).toBe(1000 * SATZ.wer.max);
    expect(werBreite({ ganz: 300, lang: 0, frei: 0 }, 0)).toBe(0);
  });
});

describe("Dauer und Wochentag", () => {
  const t0 = new Date(2026, 10, 10, 8, 0).getTime();

  it("schreibt die Dauer knapp", () => {
    expect(dauerKurz(t0, t0 + 9 * MIN)).toBe("9 Min");
    expect(dauerKurz(t0, t0 + 245 * MIN)).toBe("4 Std 5 Min");
    expect(dauerKurz(t0, t0 + (26 * 60 + 15) * MIN)).toBe("1 Tag 2 Std");
    expect(dauerKurz(t0, t0 + (51 * 60 + 5) * MIN)).toBe("2 Tage 3 Std");
    expect(dauerKurz(t0 + 1, t0)).toBeNull();
  });

  it("kennt dieselben Fälle wie die Zeilenansicht (R6-K4, R7-K3, R7-K8)", () => {
    const ohne = { ersteMeldung: null, zeitenPruefen: false };
    // Die Uhrzeit steht dabei: Wer den Beginn in eine Meldung schreibt, soll ihn nicht zurückrechnen müssen.
    expect(dauerZeile(t0, ohne, t0 + 82 * MIN)).toBe("Beginn 08:00 · seit 1 Std 22 Min");
    expect(dauerZeile(t0 + 60 * MIN, ohne, t0)).toBe("Beginn 09:00 · Einsatz beginnt noch");
    expect(dauerZeile(null, { ersteMeldung: t0, zeitenPruefen: false }, t0 + 5 * MIN)).toBe("erste Meldung 08:00 · seit 5 Min");
    // Liegt der Beginn an einem anderen Tag, steht das Datum dabei.
    expect(dauerZeile(t0, ohne, t0 + 26 * 60 * MIN)).toMatch(/^Beginn \d\d\.\d\d\. 08:00 · seit 1 Tag 2 Std$/);
    expect(dauerZeile(null, { ersteMeldung: t0 + 60 * MIN, zeitenPruefen: true }, t0)).toBe("Dauer unklar – Zeiten prüfen (Geräteuhr?)");
    expect(dauerZeile(null, ohne, t0)).toBeNull();
  });

  it("nennt den Wochentag", () => {
    expect(wochentag(new Date(2026, 10, 10))).toBe("Dienstag");
    expect(wochentag(new Date(2026, 10, 15))).toBe("Sonntag");
  });
});

describe("zeichenFuerTafel", () => {
  it("beschneidet das Zeichen der Sammlung auf sein Band und gibt der Schrift einen Ausweich", () => {
    // Das echte Zeichen: Ändert die Sammlung den Kopf ihres SVG, schlägt dieser Test an, bevor die Tafel halbe Zeichen zeigt.
    const svg = zeichenFuerTafel(einheitSymbolSvg(bogen({ ort: "Brake", typ: 4 }).einheit));
    expect(svg).toContain(`viewBox="0 ${ZEICHEN_BAND.oben} 256 ${ZEICHEN_BAND.hoehe}"`);
    expect(svg).toContain(`height="${ZEICHEN_BAND.hoehe}"`);
    expect(svg).not.toContain("font-family: 'Roboto';");
    expect(svg).toContain("sans-serif");
    // Größenzeichen (y = 38 bis 58) und Rechteck (y = 64 bis 192) liegen im Band.
    expect(ZEICHEN_BAND.oben).toBeLessThanOrEqual(38);
    expect(ZEICHEN_BAND.oben + ZEICHEN_BAND.hoehe).toBeGreaterThanOrEqual(192);
  });

  it("verliert bei keinem Einheiten-Zeichen der Sammlung einen Teil, auch nicht die zwei Punkte der Staffel", () => {
    // Gemessen wird die Zeichnung selbst (resvg), unabhängig von der Rechnung in zeichenFuerTafel.
    const hoeher: string[] = [];
    let geprueft = 0;
    for (const [name, svg] of Object.entries(TZ_SYMBOLE as Record<string, string>)) {
      if (!/Einheiten$/.test(name.split("/")[0]!)) continue;
      // Ohne Systemschriften: Sie zu laden kostete je Zeichen ein Vielfaches der Messung, und die Schrift steht im Kasten.
      const zeichnung = new Resvg(svg, { font: { loadSystemFonts: false } }).getBBox();
      if (!zeichnung) continue;
      geprueft++;
      const [, y, hoehe] = /viewBox="0 (\d+) 256 (\d+)"/.exec(zeichenFuerTafel(svg))!.map(Number) as [number, number, number];
      expect(y, name).toBeLessThanOrEqual(zeichnung.y);
      expect(y + hoehe, name).toBeGreaterThanOrEqual(zeichnung.y + zeichnung.height);
      // Der Ausschnitt endet immer an derselben Unterkante; nur oben weicht er aus.
      expect(y + hoehe, name).toBe(ZEICHEN_BAND.oben + ZEICHEN_BAND.hoehe);
      if (y < ZEICHEN_BAND.oben) hoeher.push(name);
    }
    expect(geprueft).toBeGreaterThan(150);
    // Nur Zeichen mit hohem Größenzeichen bekommen einen höheren Ausschnitt; alle anderen bleiben im Band und so groß wie bisher.
    expect(hoeher.every((name) => /staffel|Staffel|Verband|verband/.test(name)), hoeher.join(", ")).toBe(true);
    expect(hoeher).toContain("Einheiten/Staffel");
  });

  it("zeigt eine Staffel mit beiden Punkten: Mit einem stünde das Zeichen für „Trupp“ da", () => {
    const staffel = zeichenFuerTafel(einheitSymbolSvg(bogen({ org: T.FEUERWEHR, orgName: "FF Elsfleth", ort: "Elsfleth", typ: "Löschstaffel" }).einheit));
    // Die Punkte der Staffel stehen bei y = 24 und y = 48 (Halbmesser 10): Der Ausschnitt beginnt darüber.
    expect(staffel).toMatch(/viewBox="0 6 256 196"/);
    expect(staffel).toContain('height="196"');
  });

  it("lässt ein Bild, dessen Kopf es nicht kennt, unbeschnitten", () => {
    const fremd = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100"/></svg>';
    expect(zeichenFuerTafel(fremd)).toBe(fremd);
  });
});

// ------------------------------------------------------------------- Satz

/** Fläche der Einheiten auf einem Fernseher mit 1920 × 1080 Bildpunkten. */
const FERNSEHER: TafelMasse = { breite: 1386, hoehe: 852, einheit: 10.8 };
const gruppen = (...anzahlen: number[]) => anzahlen.map((anzahl) => ({ kopf: true, anzahl }));
const ohneKopf = (anzahl: number) => [{ kopf: false, anzahl }];

/** Höhe einer gesetzten Spalte in Schriftgrößen, nach denselben Maßen wie die Stilvorlage. */
function spaltenHoehe(zellen: readonly TafelZelle[], satz: TafelSatz): number {
  let hoehe = 0;
  zellen.forEach((z, i) => {
    if (z.art === "kopf" || z.art === "abgang-kopf") hoehe += (i > 0 ? SATZ.absatz : 0) + SATZ.kopf;
    else hoehe += (i > 0 ? SATZ.fuge : 0) + (z.art === "einheit" ? SATZ.karte[satz.fassung].hoehe : SATZ.abgang);
  });
  return hoehe;
}

/** Jede Einheit genau einmal, in Lesefolge. */
function einheitenFolge(satz: TafelSatz): string[] {
  return satz.seiten.flat(2).flatMap((z) => (z.art === "einheit" ? [`${z.gruppe}:${z.index}`] : []));
}

function erwarteAlle(satz: TafelSatz, anzahlen: number[]): void {
  expect(einheitenFolge(satz)).toEqual(anzahlen.flatMap((n, g) => Array.from({ length: n }, (_, i) => `${g}:${i}`)));
}

describe("tafelSatz", () => {
  it("setzt nichts, wo nichts ist, und rechnet nicht ohne Fläche", () => {
    expect(tafelSatz([], 0, FERNSEHER).seiten).toEqual([[]]);
    const ohneFlaeche = tafelSatz(gruppen(3), 0, { breite: 0, hoehe: 0, einheit: 0 });
    expect(ohneFlaeche.seiten).toEqual([[]]);
  });

  it("stellt alle Einheiten auf eine Seite und passt in die Höhe", () => {
    for (const anzahlen of [[1], [5], [4, 1], [4, 3, 3, 4], [6, 6, 6], [5, 5, 5, 5, 5], [5, 5, 5, 5, 5, 5]]) {
      const satz = tafelSatz(gruppen(...anzahlen), 0, FERNSEHER);
      expect(satz.seiten, String(anzahlen)).toHaveLength(1);
      erwarteAlle(satz, anzahlen);
      expect(satz.seiten[0]!.length).toBeLessThanOrEqual(satz.spalten);
      for (const spalte of satz.seiten[0]!) expect(spaltenHoehe(spalte, satz) * satz.schrift, String(anzahlen)).toBeLessThanOrEqual(FERNSEHER.hoehe + 0.01);
      // Eine Spalte ist mindestens so breit, wie die Fassung braucht.
      const breite = (FERNSEHER.breite - (satz.spalten - 1) * SATZ.spaltenAbstand * FERNSEHER.einheit) / satz.spalten;
      expect(breite / satz.schrift, String(anzahlen)).toBeGreaterThanOrEqual(SATZ.karte[satz.fassung].breite - 0.01);
      expect(satz.schrift).toBeGreaterThanOrEqual(Math.floor(SATZ.schriftMin * FERNSEHER.einheit * 4) / 4);
      expect(satz.schrift).toBeLessThanOrEqual(SATZ.schriftMax * FERNSEHER.einheit);
    }
  });

  it("macht die Schrift so groß, wie die Zahl der Einheiten erlaubt", () => {
    const schrift = [2, 8, 14, 20, 36].map((n) => tafelSatz(ohneKopf(n), 0, FERNSEHER).schrift);
    expect(schrift).toEqual([...schrift].sort((a, b) => b - a));
    expect(schrift[0]).toBeGreaterThan(schrift[4]! * 1.8);
  });

  it("zeigt mit Platz den ganzen Inhalt und kürzt erst, wenn es eng wird", () => {
    // Wenige Einheiten: drei Zeilen in großer Schrift. Sechs: zwei Zeilen in zwei Spalten je Karte, die ganze Breite.
    expect(tafelSatz(ohneKopf(2), 0, FERNSEHER)).toMatchObject({ fassung: "drei", spalten: 1 });
    expect(tafelSatz(ohneKopf(6), 0, FERNSEHER)).toMatchObject({ fassung: "breit", spalten: 1 });
    expect(tafelSatz(gruppen(4, 1), 0, FERNSEHER)).toMatchObject({ fassung: "breit", spalten: 1 });
    // Zwei Züge mit je fünf: drei Zeilen, ein Zug je Spalte.
    expect(tafelSatz(gruppen(5, 5), 0, FERNSEHER)).toMatchObject({ fassung: "drei", spalten: 2 });
    // Drei Züge mit je sechs: drei Bahnen nebeneinander, weiter mit vollem Inhalt.
    expect(tafelSatz(gruppen(6, 6, 6), 0, FERNSEHER)).toMatchObject({ fassung: "drei", spalten: 3 });
    // Vierzehn Einheiten in vier Gruppen: die knappe Fassung, dafür ein Drittel größer.
    expect(tafelSatz(gruppen(4, 3, 3, 4), 0, FERNSEHER)).toMatchObject({ fassung: "zwei", spalten: 2 });
  });

  it("wählt die knappe Fassung nicht, nur weil sie darin größer würde", () => {
    // Sechs Einheiten stünden in der knappen Fassung in noch größerer Schrift da; gut lesbar ist die reiche auch.
    const satz = tafelSatz(ohneKopf(6), 0, FERNSEHER);
    expect(satz.fassung).not.toBe("zwei");
    expect(satz.schrift).toBeGreaterThanOrEqual(SATZ.gutGenug * FERNSEHER.einheit);
  });

  it("nimmt die dreizeilige Fassung, wo in der breiten Name und Auftrag nicht nebeneinander passen", () => {
    // Sechs Einheiten: ohne Rücksicht auf den Inhalt die breite Fassung.
    expect(tafelSatz(ohneKopf(6), 0, FERNSEHER).fassung).toBe("breit");
    // Braucht die breite Karte 46 Schriftbreiten, bekäme sie nur noch 30 px Schrift; dreizeilig passt alles in 36 px.
    const satz = tafelSatz(ohneKopf(6), 0, FERNSEHER, { breit: 46, drei: 30, zwei: 30 });
    expect(satz.fassung).toBe("drei");
    expect(satz.spalten).toBe(1);
    expect(satz.schrift).toBeGreaterThan(SATZ.gutGenug * FERNSEHER.einheit);
    // In der gewählten Schrift ist die Karte so breit, wie ihr Inhalt braucht.
    expect(FERNSEHER.breite / satz.schrift).toBeGreaterThanOrEqual(30);
  });

  it("nimmt für ungekürzte Namen eine etwas kleinere Schrift, aber keine deutlich kleinere", () => {
    const lage = gruppen(4, 3, 3, 4);
    const frei = tafelSatz(lage, 0, FERNSEHER);
    expect(frei.spalten).toBe(2);
    const spalte = (FERNSEHER.breite - SATZ.spaltenAbstand * FERNSEHER.einheit) / 2;
    // Ein Name, der 21 Schriftbreiten braucht: Die Schrift gibt gerade so viel nach, dass er hineinpasst.
    const ganz = tafelSatz(lage, 0, FERNSEHER, { zwei: 21, drei: 21, breit: 60 });
    expect(ganz.spalten).toBe(2);
    expect(ganz.schrift).toBeLessThan(frei.schrift);
    expect(ganz.schrift).toBeGreaterThanOrEqual(frei.schrift * SATZ.ungekuerztAb);
    expect(spalte / ganz.schrift).toBeGreaterThanOrEqual(21);
    // Braucht er 27, kostete das ein Fünftel der Schrift: Dann wird der eine Name gekürzt, nicht allen die Schrift genommen.
    expect(tafelSatz(lage, 0, FERNSEHER, { zwei: 27, drei: 27, breit: 60 })).toEqual(frei);
  });

  it("lässt wenigstens die Namen ganz, wenn alles ganz zu viel Schrift kostete", () => {
    const lage = gruppen(4, 3, 3, 4);
    const frei = tafelSatz(lage, 0, FERNSEHER);
    const nurName = tafelSatz(lage, 0, FERNSEHER, { zwei: 21, drei: 21, breit: 60 });
    // Ein langer Auftrag verlangte 40 Schriftbreiten, der längste Name 21: Für den Auftrag gibt die Schrift nicht nach, für den Namen schon.
    expect(tafelSatz(lage, 0, FERNSEHER, { zwei: 40, drei: 40, breit: 90 }, { zwei: 21, drei: 21, breit: 60 })).toEqual(nurName);
    // Kostete auch der Name zu viel, bleibt es beim Satz ohne Rücksicht.
    expect(tafelSatz(lage, 0, FERNSEHER, { zwei: 40, drei: 40, breit: 90 }, { zwei: 27, drei: 27, breit: 60 })).toEqual(frei);
    // Passt alles ganz, gilt das; die Namen fragt der Satz dann nicht mehr.
    expect(tafelSatz(lage, 0, FERNSEHER, { zwei: 21, drei: 21, breit: 60 }, { zwei: 30, drei: 30, breit: 90 })).toEqual(nurName);
  });

  it("kürzt lieber, als wegen eines langen Namens zu blättern oder unter die kleinste Schrift zu gehen", () => {
    for (const lage of [ohneKopf(6), gruppen(4, 3, 3, 4), gruppen(6, 6, 6)]) {
      const frei = tafelSatz(lage, 0, FERNSEHER);
      const riesig = tafelSatz(lage, 0, FERNSEHER, { breit: 120, drei: 90, zwei: 90 });
      expect(riesig).toEqual(frei);
      expect(riesig.seiten).toHaveLength(1);
    }
    // Ohne Angabe und mit einem Bedarf unter den Mindestbreiten ändert sich nichts.
    expect(tafelSatz(gruppen(4, 3, 3, 4), 0, FERNSEHER, { breit: 20, drei: 10, zwei: 10 })).toEqual(tafelSatz(gruppen(4, 3, 3, 4), 0, FERNSEHER));
  });

  it("hält Gruppen zusammen und lässt keinen Kopf allein am Spaltenende", () => {
    for (const anzahlen of [[4, 3, 3, 4], [5, 5, 5, 5, 5], [7, 2, 6, 1, 4]]) {
      const satz = tafelSatz(gruppen(...anzahlen), 0, FERNSEHER);
      expect(satz.seiten, String(anzahlen)).toHaveLength(1);
      for (const spalte of satz.seiten.flat()) {
        const letzte = spalte[spalte.length - 1]!;
        expect(letzte.art, String(anzahlen)).not.toBe("kopf");
        // Keine Gruppe ist geteilt: Jede passt in eine Spalte.
        expect(spalte.some((z) => z.art === "kopf" && z.fortsetzung), String(anzahlen)).toBe(false);
      }
    }
  });

  it("füllt beim Blättern die Spalten, statt Gruppen zusammenzuhalten: weniger Seiten, kürzerer Umlauf", () => {
    // Acht Züge zu je fünf Einheiten auf der Fläche, die ein Fernseher mit 1920 × 1080 im Browser wirklich lässt (1415 × 839).
    // Blieben die Züge zusammen, passte in jede Spalte nur einer (zwei brauchen 0,4 Schriftgrößen mehr, als unter der
    // Seitenzeile bleibt): drei Seiten mit halb leeren Spalten. Gefüllt sind es zwei.
    const flaeche: TafelMasse = { breite: 1415, hoehe: 839, einheit: 10.8 };
    const anzahlen = [5, 5, 5, 5, 5, 5, 5, 5];
    const satz = tafelSatz(gruppen(...anzahlen), 0, flaeche);
    expect(satz.seiten).toHaveLength(2);
    erwarteAlle(satz, anzahlen);
    const frei = (flaeche.hoehe - SATZ.seitenzeile * flaeche.einheit) / satz.schrift;
    const spalten = satz.seiten.flat();
    // Jede Spalte außer der letzten ist zu mehr als drei Vierteln gefüllt.
    for (const spalte of spalten.slice(0, -1)) expect(spaltenHoehe(spalte, satz) / frei).toBeGreaterThan(0.75);
    // Geteilte Züge tragen ihren Kopf in der nächsten Spalte noch einmal, und kein Kopf steht allein am Spaltenende.
    expect(spalten.flat().some((z) => z.art === "kopf" && z.fortsetzung)).toBe(true);
    for (const spalte of spalten) expect(spalte[spalte.length - 1]!.art).toBe("einheit");
  });

  it("setzt eine Gruppe, die länger ist als eine Spalte, mit „Fortsetzung“ fort", () => {
    const satz = tafelSatz(gruppen(20), 0, FERNSEHER);
    erwarteAlle(satz, [20]);
    const koepfe = satz.seiten.flat().map((spalte) => spalte[0]!);
    expect(koepfe[0]).toEqual({ art: "kopf", gruppe: 0, fortsetzung: false });
    expect(koepfe.slice(1).every((z) => z.art === "kopf" && z.fortsetzung)).toBe(true);
    expect(koepfe.length).toBeGreaterThan(1);
  });

  it("gleicht die Spalten an, statt die letzte halb leer zu lassen", () => {
    const satz = tafelSatz(ohneKopf(28), 0, FERNSEHER);
    expect(satz.seiten[0]!.map((spalte) => spalte.length)).toEqual([10, 10, 8]);
  });

  it("nimmt eine Spalte mehr nur, wenn die Schrift dadurch merklich wächst", () => {
    // 20 Einheiten passen in zwei Spalten; drei brächten keine größere Schrift, nur schmalere Karten.
    expect(tafelSatz(ohneKopf(20), 0, FERNSEHER).spalten).toBe(2);
  });

  it("blättert erst, wenn die kleinste Schrift nicht reicht, und lässt dabei keine Einheit aus", () => {
    const anzahlen = [4, 4, 4, 4, 4, 4, 4, 4, 3, 3, 3, 3];
    const satz = tafelSatz(gruppen(...anzahlen), 0, FERNSEHER);
    expect(satz.seiten.length).toBeGreaterThan(1);
    expect(satz.fassung).toBe("zwei");
    erwarteAlle(satz, anzahlen);
    for (const seite of satz.seiten) expect(seite.length).toBeLessThanOrEqual(satz.spalten);
    // Unter der Tafel bleibt Platz für die Zeile „Seite 1 von 2".
    const frei = FERNSEHER.hoehe - SATZ.seitenzeile * FERNSEHER.einheit;
    for (const spalte of satz.seiten.flat()) expect(spaltenHoehe(spalte, satz) * satz.schrift).toBeLessThanOrEqual(frei + 0.01);
    // 36 Einheiten ohne Gliederung passen noch auf eine Seite.
    expect(tafelSatz(ohneKopf(36), 0, FERNSEHER).seiten).toHaveLength(1);
  });

  it("stellt abgerückte Einheiten nicht zwischen die anwesenden: Der Satz bleibt derselbe, wie viele auch abgerückt sind", () => {
    // Vorgefallen: Der Block „Abgerückt" stand auf der Tafel, solange Platz war. Mit 13 Einheiten war er da, mit der 14. weg,
    // und in der Randspalte war der Abgang abgeschnitten: Wer abgerückt war, stand nirgends. Jetzt führt ihn die Randspalte.
    for (const lage of [ohneKopf(5), gruppen(4, 3, 3), gruppen(4, 3, 3, 4), gruppen(4, 4, 4, 4, 4, 4, 4, 4, 3, 3, 3, 3)]) {
      const ohne = tafelSatz(lage, 0, FERNSEHER);
      for (const abgerueckt of [1, 4, 12]) {
        const mit = tafelSatz(lage, abgerueckt, FERNSEHER);
        expect(mit, `${abgerueckt} abgerückt`).toEqual(ohne);
        expect(mit.abgaenge).toBe(0);
        expect(mit.seiten.flat(2).some((z) => z.art === "abgang" || z.art === "abgang-kopf" || z.art === "abgang-rest")).toBe(false);
      }
    }
  });

  it("stellt die abgerückten Einheiten auf die Tafel, wenn niemand mehr anwesend ist, und nennt den Rest als Zahl", () => {
    const alleFort = tafelSatz([], 3, FERNSEHER);
    expect(alleFort.abgaenge).toBe(3);
    expect(alleFort.seiten[0]!.flat().map((z) => z.art)).toEqual(["abgang-kopf", "abgang", "abgang", "abgang"]);
    const viele = tafelSatz([], 9, FERNSEHER);
    expect(viele.abgaenge).toBe(SATZ.abgaengeMax);
    expect(viele.seiten).toHaveLength(1);
    expect(viele.seiten.flat(2).find((z) => z.art === "abgang-rest")).toEqual({ art: "abgang-rest", anzahl: 9 - SATZ.abgaengeMax });
  });

  it("hält seine Zusagen für beliebige Lagen und Flächen: jede Einheit einmal, nichts über den Rand, nie mehr Spalten als gesetzt", () => {
    // Fester Zufall, damit ein Fehlschlag sich wiederholen lässt. Gerechnet wird in 32 Bit (mulberry32): Ein Produkt über
    // 2^53 verlöre die unteren Bits, und der Würfel fiele immer auf dieselbe Seite.
    let saat = 20261110;
    const zufall = (bis: number) => {
      saat = (saat + 0x6d2b79f5) | 0;
      let w = Math.imul(saat ^ (saat >>> 15), 1 | saat);
      w = (w + Math.imul(w ^ (w >>> 7), 61 | w)) ^ w;
      return ((w ^ (w >>> 14)) >>> 0) % bis;
    };
    const gesehen = { ohneKopf: 0, mitKopf: 0, abgerueckt: 0, ohneAbgerueckte: 0, bedarf: 0, geblaettert: 0, niemandDa: 0 };
    const flaechen: TafelMasse[] = [
      FERNSEHER,
      { breite: 924, hoehe: 568, einheit: 7.2 }, // 1280 × 720
      { breite: 2026, hoehe: 852, einheit: 10.8 }, // 2560 × 1080
      { breite: 660, hoehe: 610, einheit: 5.76 }, // 1024 × 768
      { breite: 300, hoehe: 600, einheit: 6 },
    ];
    for (let lauf = 0; lauf < 400; lauf++) {
      const masse = flaechen[lauf % flaechen.length]!;
      // Jede vierte Lage hat nur eine Gruppe: der häufigste Fall, ein Zug oder eine Organisation, mit und ohne Kopf.
      const anzahlen = Array.from({ length: zufall(4) === 0 ? 1 : 1 + zufall(9) }, () => 1 + zufall(lauf % 7 === 0 ? 30 : 9));
      const mitKopf = anzahlen.length > 1 || zufall(2) === 0;
      // Jede zwölfte Lage ohne anwesende Einheit: Nur dann stehen die abgerückten auf der Tafel.
      const niemandDa = zufall(12) === 0;
      if (niemandDa) anzahlen.length = 0;
      const abgerueckt = niemandDa ? 1 + zufall(15) : zufall(4) === 0 ? zufall(15) : 0;
      // Jeder dritte Lauf mit einem Bedarf des Inhalts: Die Zusagen gelten, welche Breite die Karten auch brauchen.
      const bedarf = zufall(3) === 0 ? { breit: 30 + zufall(50), drei: 14 + zufall(30), zwei: 14 + zufall(30) } : {};
      const satz = tafelSatz(anzahlen.map((anzahl) => ({ kopf: mitKopf, anzahl })), abgerueckt, masse, bedarf);
      const lage = `Lauf ${lauf}: ${anzahlen.join(",")} + ${abgerueckt} abgerückt auf ${masse.breite} × ${masse.hoehe}, Bedarf ${JSON.stringify(bedarf)}`;
      gesehen[mitKopf ? "mitKopf" : "ohneKopf"]++;
      gesehen[abgerueckt > 0 ? "abgerueckt" : "ohneAbgerueckte"]++;
      if ("breit" in bedarf) gesehen.bedarf++;
      if (satz.seiten.length > 1) gesehen.geblaettert++;
      erwarteAlle(satz, anzahlen);
      expect(satz.schrift, lage).toBeGreaterThan(0);
      const geblaettert = satz.seiten.length > 1;
      const frei = masse.hoehe - (geblaettert ? SATZ.seitenzeile * masse.einheit : 0);
      for (const seite of satz.seiten) {
        expect(seite.length, lage).toBeLessThanOrEqual(satz.spalten);
        for (const spalte of seite) {
          expect(spalte.length, lage).toBeGreaterThan(0);
          const letzte = spalte[spalte.length - 1]!.art;
          expect(letzte === "kopf" || letzte === "abgang-kopf", lage).toBe(false);
          // Eine Spalte ragt nur über, wo schon eine einzige Karte höher ist als die Fläche (winziges Fenster).
          const hoehe = spaltenHoehe(spalte, satz) * satz.schrift;
          const eineKarte = (SATZ.kopf + SATZ.fuge + SATZ.karte[satz.fassung].hoehe) * satz.schrift;
          expect(hoehe, lage).toBeLessThanOrEqual(Math.max(frei, eineKarte) + 0.01);
        }
      }
      // Abgerückte: so viele wie zugesagt, höchstens die Obergrenze, der Rest wird genannt.
      const zellen = satz.seiten.flat(2);
      expect(zellen.filter((z) => z.art === "abgang").length, lage).toBe(satz.abgaenge);
      expect(satz.abgaenge, lage).toBe(niemandDa ? Math.min(abgerueckt, SATZ.abgaengeMax) : 0);
      if (niemandDa) gesehen.niemandDa++;
      const rest = zellen.find((z) => z.art === "abgang-rest");
      if (satz.abgaenge > 0 && abgerueckt > satz.abgaenge) expect(rest, lage).toEqual({ art: "abgang-rest", anzahl: abgerueckt - satz.abgaenge });
      else expect(rest, lage).toBeUndefined();
    }
    // Der Würfel trifft alle Fälle, die der Test nennt: mit und ohne Kopf, mit und ohne abgerückte, mit Bedarf, geblättert.
    for (const [fall, anzahl] of Object.entries(gesehen)) expect(anzahl, fall).toBeGreaterThan(20);
  });

  it("setzt nie mehr Spalten, als er ansagt, auch wo das Abrunden der Schrift eine Gruppe in die nächste Spalte rückte", () => {
    // Zwei Lagen, in denen die auf Viertelpixel abgerundete Schrift eine Spalte mehr gebraucht hätte als die gerechnete:
    // In der etwas höheren Spalte passt eine Gruppe „gerade ganz" in die nächste, statt geteilt zu werden.
    const faelle: [number[], TafelMasse][] = [
      [[1, 7, 1], { breite: 1394, hoehe: 830, einheit: 10.757042990997434 }],
      [[5, 12, 15], { breite: 1118, hoehe: 693, einheit: 8.440708930492402 }],
    ];
    for (const [anzahlen, masse] of faelle) {
      const satz = tafelSatz(gruppen(...anzahlen), 0, masse);
      erwarteAlle(satz, anzahlen);
      for (const seite of satz.seiten) expect(seite.length, anzahlen.join(",")).toBeLessThanOrEqual(satz.spalten);
    }
  });

  it("rechnet für jeden Fernseher im selben Verhältnis und kommt mit schmalen Flächen zurecht", () => {
    const hd = tafelSatz(gruppen(4, 3, 3, 4), 0, { breite: 924, hoehe: 568, einheit: 7.2 });
    const voll = tafelSatz(gruppen(4, 3, 3, 4), 0, FERNSEHER);
    expect(hd).toMatchObject({ fassung: voll.fassung, spalten: voll.spalten });
    expect(hd.seiten).toEqual(voll.seiten);
    expect(hd.schrift / 7.2).toBeCloseTo(voll.schrift / 10.8, 1);
    const schmal = tafelSatz(gruppen(4, 3), 0, { breite: 300, hoehe: 600, einheit: 6 });
    expect(schmal.spalten).toBe(1);
    erwarteAlle(schmal, [4, 3]);
  });
});

describe("tafelFortlaufend", () => {
  it("reiht alles in eine Spalte: Köpfe und Einheiten; abgerückte nur, wenn niemand anwesend ist", () => {
    expect(tafelFortlaufend([{ kopf: true, anzahl: 2 }, { kopf: false, anzahl: 1 }], 8).map((z) => z.art)).toEqual(["kopf", "einheit", "einheit", "einheit"]);
    const zellen = tafelFortlaufend([], 8);
    expect(zellen.map((z) => z.art)).toEqual(["abgang-kopf", ...Array.from({ length: SATZ.abgaengeMax }, () => "abgang"), "abgang-rest"]);
    expect(zellen[zellen.length - 1]).toEqual({ art: "abgang-rest", anzahl: 8 - SATZ.abgaengeMax });
  });
});
