/**
 * Neu im Meldekopf: Inhalt und Satz der Tafel-Ansicht des Lagemonitors.
 */
import { describe, expect, it } from "vitest";
import { EEB_EPOCHE_MS, OrganisationsTyp, PersonalErfassung, SCHEMA_VERSION, type Erfassungsbogen, type Sofortbedarf } from "@bos/eeb-format/model";
import { EinsatzArt, MeldeStatus, type Einsatzsammlung, type MeldeEintrag } from "@bos/meldekopf/einsaetze";
import { einheitSymbolSvg } from "@bos/eeb-satz/taktische-zeichen-bogen";
import {
  SATZ,
  ZEICHEN_BAND,
  bedarfKurz,
  dauerKurz,
  dauerZeile,
  nameTeile,
  tafelFortlaufend,
  tafelSatz,
  tafelbild,
  wochentag,
  zeichenFuerTafel,
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
    ...(a.vermerke ? { vermerke: a.vermerke.map((v) => ({ zeit: JETZT - v.vorMin * MIN, text: v.text })) } : {}),
    bogen: bogen(a),
  };
}

function sammlung(eintraege: MeldeEintrag[], art = EinsatzArt.EINSATZ): Einsatzsammlung {
  return { id: "s1", name: "Hochwasser Weser", art, ort: "Brake", angelegt: JETZT - 300 * MIN, geaendert: JETZT, eintraege };
}

describe("nameTeile", () => {
  it("trennt Herkunft und Typ und kennt die Kurzform des Vokabulars", () => {
    expect(nameTeile(bogen({ ort: "Oldenburg (NI)", typ: 4 }).einheit)).toEqual({ herkunft: "THW Oldenburg (NI)", typ: "Bergungsgruppe", typKurz: "B" });
    expect(nameTeile(bogen({ ort: "Brake", typ: 3 }).einheit)).toEqual({ herkunft: "THW Brake", typ: "Zugtrupp Technischer Zug", typKurz: "ZTr TZ" });
  });

  it("kürzt „Fachgruppe“ im ausgeschriebenen Typ zu „FGr“: Das Unterscheidende steht am Ende", () => {
    expect(nameTeile(bogen({ ort: "Brake", typ: 16 }).einheit).typ).toBe("FGr Notversorgung und Notinstandsetzung");
    expect(nameTeile(bogen({ ort: "Brake", typ: 27 }).einheit)).toMatchObject({ typ: "FGr Wasserschaden/Pumpen (A)", typKurz: "FGr WP (A)" });
  });

  it("nennt den Ort nicht doppelt, wenn der Name der Organisation ihn trägt", () => {
    expect(nameTeile(bogen({ org: T.FEUERWEHR, orgName: "FF Elsfleth", ort: "Elsfleth", typ: "Löschzug" }).einheit)).toEqual({
      herkunft: "FF Elsfleth",
      typ: "Löschzug",
      typKurz: "Löschzug",
    });
  });

  it("lässt den Typ weg, wenn die Herkunft ihn schon nennt, und kommt ohne Typ aus", () => {
    expect(nameTeile(bogen({ org: T.SONSTIGE, orgName: "Bundeswehr Panzerpionierzug", ort: "", typ: "Panzerpionierzug" }).einheit)).toEqual({
      herkunft: "Bundeswehr Panzerpionierzug",
      typ: "",
      typKurz: "",
    });
    expect(nameTeile(bogen({ org: T.DRK, ort: "Wesermarsch" }).einheit)).toEqual({ herkunft: "DRK Wesermarsch", typ: "", typKurz: "" });
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

  it("zählt Übungsmeldungen in einem Einsatz nicht und stellt sie nicht auf die Tafel", () => {
    const tb = tafelbild(sammlung([eintrag({ ort: "Echt" }), eintrag({ ort: "Geübt", uebung: true })]), JETZT);
    expect(tb.gruppen.flatMap((g) => g.einheiten).map((e) => e.herkunft)).toEqual(["THW Echt"]);
    expect(tb.bild.uebungenDaneben).toBe(1);
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

  it("führt den Stand der Angaben und warnt ab einer Stunde", () => {
    const tb = tafelbild(sammlung([eintrag({ ort: "Frisch", vorMin: 20 }), eintrag({ ort: "Alt", vorMin: 20, standVorMin: 200 })]), JETZT);
    const [frisch, alt] = tb.gruppen[0]!.einheiten;
    expect(frisch).toMatchObject({ standAlt: false, stand: JETZT - 20 * MIN });
    expect(alt).toMatchObject({ standAlt: true, stand: JETZT - 200 * MIN });
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
    expect(marken["THW Folge"]).toEqual({ art: "folge", text: "Stärke 8 → 6" });
    expect(marken["THW Zurück"]).toEqual({ art: "wieder", text: "wieder da" });
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
    expect(dauerZeile(t0, ohne, t0 + 82 * MIN)).toBe("seit Beginn 1 Std 22 Min");
    expect(dauerZeile(t0 + 60 * MIN, ohne, t0)).toBe("Einsatz beginnt noch");
    expect(dauerZeile(null, { ersteMeldung: t0, zeitenPruefen: false }, t0 + 5 * MIN)).toBe("seit erster Meldung 5 Min");
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

  it("hält Gruppen zusammen und lässt keinen Kopf allein am Spaltenende", () => {
    for (const anzahlen of [[4, 3, 3, 4], [5, 5, 5, 5, 5], [7, 2, 6, 1, 4], [4, 4, 4, 4, 4, 4, 4, 4, 3, 3, 3, 3]]) {
      const satz = tafelSatz(gruppen(...anzahlen), 0, FERNSEHER);
      for (const spalte of satz.seiten.flat()) {
        const letzte = spalte[spalte.length - 1]!;
        expect(letzte.art, String(anzahlen)).not.toBe("kopf");
        // Keine Gruppe ist geteilt: Jede passt in eine Spalte.
        expect(spalte.some((z) => z.art === "kopf" && z.fortsetzung), String(anzahlen)).toBe(false);
      }
    }
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

  it("stellt abgerückte Einheiten dahinter, solange die Schrift gut lesbar bleibt", () => {
    const mit = tafelSatz(ohneKopf(5), 2, FERNSEHER);
    expect(mit.abgaenge).toBe(2);
    expect(mit.seiten[0]!.flat().filter((z) => z.art === "abgang")).toHaveLength(2);
    expect(mit.seiten[0]!.flat().some((z) => z.art === "abgang-kopf")).toBe(true);
    expect(mit.schrift).toBeGreaterThanOrEqual(SATZ.gutGenug * FERNSEHER.einheit);
  });

  it("lässt abgerückte Einheiten weg, bevor die anwesenden deutlich kleiner würden", () => {
    const ohne = tafelSatz(gruppen(4, 3, 3, 4), 0, FERNSEHER);
    const mit = tafelSatz(gruppen(4, 3, 3, 4), 1, FERNSEHER);
    expect(mit.abgaenge).toBe(0);
    expect(mit.schrift).toBe(ohne.schrift);
    expect(mit.seiten.flat(2).some((z) => z.art === "abgang" || z.art === "abgang-kopf")).toBe(false);
  });

  it("nennt den Rest, wenn mehr abgerückt sind, als einzeln dastehen", () => {
    const satz = tafelSatz(ohneKopf(2), 9, FERNSEHER);
    expect(satz.abgaenge).toBeGreaterThan(0);
    expect(satz.abgaenge).toBeLessThanOrEqual(SATZ.abgaengeMax);
    expect(satz.seiten.flat(2).find((z) => z.art === "abgang-rest")).toEqual({ art: "abgang-rest", anzahl: 9 - satz.abgaenge });
    // Sind alle abgerückt, stehen sie allein auf der Tafel.
    const alleFort = tafelSatz([], 3, FERNSEHER);
    expect(alleFort.seiten[0]!.flat().map((z) => z.art)).toEqual(["abgang-kopf", "abgang", "abgang", "abgang"]);
  });

  it("lässt abgerückte Einheiten auch beim Blättern keine Seite kosten", () => {
    const anzahlen = [4, 4, 4, 4, 4, 4, 4, 4, 3, 3, 3, 3];
    const ohne = tafelSatz(gruppen(...anzahlen), 0, FERNSEHER);
    for (const abgerueckt of [1, 4, 12]) {
      const mit = tafelSatz(gruppen(...anzahlen), abgerueckt, FERNSEHER);
      expect(mit.seiten.length, `${abgerueckt} abgerückt`).toBe(ohne.seiten.length);
      erwarteAlle(mit, anzahlen);
    }
  });

  it("hält seine Zusagen für beliebige Lagen und Flächen: jede Einheit einmal, nichts über den Rand, nie mehr Spalten als gesetzt", () => {
    // Fester Zufall, damit ein Fehlschlag sich wiederholen lässt.
    let saat = 20261110;
    const zufall = (bis: number) => {
      saat = (saat * 1103515245 + 12345) % 2147483648;
      return saat % bis;
    };
    const flaechen: TafelMasse[] = [
      FERNSEHER,
      { breite: 924, hoehe: 568, einheit: 7.2 }, // 1280 × 720
      { breite: 2026, hoehe: 852, einheit: 10.8 }, // 2560 × 1080
      { breite: 660, hoehe: 610, einheit: 5.76 }, // 1024 × 768
      { breite: 300, hoehe: 600, einheit: 6 },
    ];
    for (let lauf = 0; lauf < 400; lauf++) {
      const masse = flaechen[lauf % flaechen.length]!;
      const anzahlen = Array.from({ length: 1 + zufall(9) }, () => 1 + zufall(lauf % 7 === 0 ? 30 : 9));
      const mitKopf = anzahlen.length > 1 || zufall(2) === 0;
      const abgerueckt = zufall(4) === 0 ? zufall(15) : 0;
      const satz = tafelSatz(anzahlen.map((anzahl) => ({ kopf: mitKopf, anzahl })), abgerueckt, masse);
      const lage = `Lauf ${lauf}: ${anzahlen.join(",")} + ${abgerueckt} abgerückt auf ${masse.breite} × ${masse.hoehe}`;
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
      expect(satz.abgaenge, lage).toBeLessThanOrEqual(Math.min(abgerueckt, SATZ.abgaengeMax));
      const rest = zellen.find((z) => z.art === "abgang-rest");
      if (satz.abgaenge > 0 && abgerueckt > satz.abgaenge) expect(rest, lage).toEqual({ art: "abgang-rest", anzahl: abgerueckt - satz.abgaenge });
      else expect(rest, lage).toBeUndefined();
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
  it("reiht alles in eine Spalte: Köpfe, Einheiten, dahinter die abgerückten", () => {
    const zellen = tafelFortlaufend([{ kopf: true, anzahl: 2 }, { kopf: false, anzahl: 1 }], 8);
    expect(zellen.map((z) => z.art)).toEqual([
      "kopf",
      "einheit",
      "einheit",
      "einheit",
      "abgang-kopf",
      ...Array.from({ length: SATZ.abgaengeMax }, () => "abgang"),
      "abgang-rest",
    ]);
    expect(zellen[zellen.length - 1]).toEqual({ art: "abgang-rest", anzahl: 8 - SATZ.abgaengeMax });
  });
});
