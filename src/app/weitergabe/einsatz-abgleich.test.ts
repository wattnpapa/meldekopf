/**
 * Herkunft: Erfassungsbogen `src/app/einsatz-abgleich.test.ts` (Commit 1d7ed5f).
 *
 * Abgleich zweier Geräte beim „Einsatz importieren…" (Audit Runde 3, R3-W1/R3-W2).
 *
 * Zwei Geräte = zwei getrennte Speicher. Die Weitergabe wird als JSON-Kopie
 * der Sammlung nachgestellt — genau das, was Sammel-PDF und Einsatz-Transport
 * eingebettet tragen.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { OrganisationsTyp, PersonalErfassung, SCHEMA_VERSION, type Erfassungsbogen } from "@bos/eeb-format/model";
import {
  EinsatzArt,
  MeldeStatus,
  einsaetzeLaden,
  einsatzAnlegen,
  neuesteJeEinheit,
  speicherhuelleSetzen,
  type Einsatzsammlung,
} from "@bos/meldekopf/einsaetze";
import { meldungAufnehmen, notizSetzen, statusMitZeitSetzen, eintreffzeitSetzen } from "../eintrag-zeiten";
import { abgleichText, einsatzAbgleichen, sammlungFuerZiel } from "./einsatz-abgleich";
import { fassungGiltSetzen, geltendeJeEinheit } from "../fassung-vorrang";
import { aenderungenSeit, neueEintraege, weitergabeStandLaden, weitergabeUmImportErgaenzen, weitergabeVermerken } from "./export-stand";

class MemStorage {
  private m = new Map<string, string>();
  get length() { return this.m.size; }
  clear() { this.m.clear(); }
  getItem(k: string) { return this.m.has(k) ? this.m.get(k)! : null; }
  setItem(k: string, v: string) { this.m.set(k, String(v)); }
  removeItem(k: string) { this.m.delete(k); }
  key(i: number) { return [...this.m.keys()][i] ?? null; }
}

let geraetA: MemStorage;
let geraetB: MemStorage;

function auf(g: MemStorage) {
  (globalThis as { localStorage?: Storage }).localStorage = g as unknown as Storage;
  speicherhuelleSetzen(g as unknown as Storage);
}

beforeEach(() => {
  geraetA = new MemStorage();
  geraetB = new MemStorage();
  auf(geraetA);
});

function bogen(ort: string, mannschaft = 3, stand = 100): Erfassungsbogen {
  return {
    schemaVersion: SCHEMA_VERSION,
    stand,
    einheit: { organisation: OrganisationsTyp.THW, einheitsTyp: { code: 1 }, hierarchie: [{ bezeichnung: { code: 1 }, name: ort }] },
    einsatz: { zeitraumVon: 100, zeitraumBis: 130, ortAuftrag: "Lage" },
    personalErfassung: PersonalErfassung.NUR_STAERKE,
    staerkeManuell: { fuehrer: 1, unterfuehrer: 0, mannschaft, gesamt: 1 + mannschaft },
    personal: [],
    fahrzeuge: [],
  };
}

function sammlung(id: string): Einsatzsammlung {
  return einsaetzeLaden().find((s) => s.id === id)!;
}

/** Weitergabe: Sammlung des aktiven Geräts als Datei. */
function weitergeben(id: string): Einsatzsammlung {
  return JSON.parse(JSON.stringify(sammlung(id))) as Einsatzsammlung;
}

/** Zug-Etikett wie in Altdaten (eeb.einsaetze.v1 aus dem Erfassungsbogen) direkt in den Speicher des aktiven Geräts schreiben. */
function altZug(g: MemStorage, id: string, ort: string, zug: string) {
  auf(g);
  const s = sammlung(id);
  for (const e of s.eintraege) if (e.bogen.einheit.hierarchie[0]!.name === ort) e.zugEtikett = zug;
  g.setItem("eeb.einsaetze.v1", JSON.stringify([s]));
}

function kopf(id: string, ort: string) {
  return neuesteJeEinheit(sammlung(id).eintraege).find((e) => e.bogen.einheit.hierarchie[0]!.name === ort)!;
}

/** Drei Einheiten auf A, weitergegeben an B. */
function buehne() {
  auf(geraetA);
  const s = einsatzAnlegen("Hochwasser", EinsatzArt.EINSATZ);
  for (const ort of ["Ulm", "Biberach", "Albstadt"]) meldungAufnehmen(s.id, bogen(ort), { quelle: "scan" });
  const datei = weitergeben(s.id);
  weitergabeVermerken(sammlung(s.id));
  auf(geraetB);
  einsatzAbgleichen(datei);
  return s.id;
}

describe("einsatzAbgleichen — Szenario 3 aus dem Audit", () => {
  it("übernimmt Abrücken und Auftrag des anderen Geräts und behält die eigene, jüngere Änderung", () => {
    const id = buehne();
    // B: Ulm abgerückt, Biberach mit Auftrag.
    auf(geraetB);
    statusMitZeitSetzen(id, kopf(id, "Ulm").id, MeldeStatus.ABGERUECKT, 2000);
    const bib = kopf(id, "Biberach");
    notizSetzen(id, bib.id, "Ortung Trümmerkegel B27");
    // A: Albstadt abgerückt.
    auf(geraetA);
    statusMitZeitSetzen(id, kopf(id, "Albstadt").id, MeldeStatus.ABGERUECKT, 3000);

    // B gibt weiter, A importiert.
    auf(geraetB);
    const vonB = weitergeben(id);
    auf(geraetA);
    const r = einsatzAbgleichen(vonB);
    expect(r.hinzugefuegt).toBe(0);
    expect(r.widersprueche).toEqual([]);
    expect(r.aktualisiert.map((a) => a.einheit).sort()).toEqual(["Biberach", "Ulm"]);
    expect(kopf(id, "Ulm").status).toBe(MeldeStatus.ABGERUECKT);
    expect(kopf(id, "Ulm").abgerueckAm).toBe(2000);
    expect(kopf(id, "Biberach").notiz).toBe("Ortung Trümmerkegel B27");
    expect(kopf(id, "Albstadt").status).toBe(MeldeStatus.ABGERUECKT);
    const text = abgleichText(r);
    expect(text).toMatch(/^2 Meldungen aktualisiert: /);
    expect(text).toContain("Ulm abgerückt");
    expect(text).toContain("Biberach Auftrag „Ortung Trümmerkegel B27“");

    // A gibt zurück, B importiert: Albstadt kommt an, beide Stände gleich.
    const vonA = weitergeben(id);
    auf(geraetB);
    const r2 = einsatzAbgleichen(vonA);
    expect(r2.aktualisiert.map((a) => a.einheit)).toEqual(["Albstadt"]);
    expect(kopf(id, "Albstadt").status).toBe(MeldeStatus.ABGERUECKT);
    const aufB = neuesteJeEinheit(sammlung(id).eintraege).map((e) => [e.einheitSchluessel, e.status, e.zugEtikett, e.notiz]);
    auf(geraetA);
    const aufA = neuesteJeEinheit(sammlung(id).eintraege).map((e) => [e.einheitSchluessel, e.status, e.zugEtikett, e.notiz]);
    expect(aufB.sort()).toEqual(aufA.sort());

    // Ein dritter Import ändert nichts mehr.
    auf(geraetB);
    const nochmal = weitergeben(id);
    auf(geraetA);
    const r3 = einsatzAbgleichen(nochmal);
    expect(r3.aktualisiert).toEqual([]);
    expect(abgleichText(r3)).toBe("");
  });
});

describe("einsatzAbgleichen — Szenario 2 (Folgemeldung auf dem anderen Gerät)", () => {
  it("hält den hier vergebenen Auftrag auf der von dort gekommenen Folgemeldung", () => {
    const id = buehne();
    auf(geraetA);
    notizSetzen(id, kopf(id, "Albstadt").id, "Lagekarte führen");
    auf(geraetB);
    meldungAufnehmen(id, bogen("Albstadt", 5, 110), { quelle: "scan" });
    const vonB = weitergeben(id);
    auf(geraetA);
    const r = einsatzAbgleichen(vonB);
    expect(r.hinzugefuegt).toBe(1);
    const k = kopf(id, "Albstadt");
    expect(k.bogen.staerkeManuell?.mannschaft).toBe(5);
    expect(k.notiz).toBe("Lagekarte führen");
    // Der Verlauf trägt den Vermerk weiter.
    expect(k.vermerke?.some((v) => v.text.startsWith("Auftrag/Notiz"))).toBe(true);
    // Für dieses Gerät ist das keine Aktualisierung — der Wert stand schon hier.
    expect(r.aktualisiert).toEqual([]);
  });
});

describe("einsatzAbgleichen — Widersprüche", () => {
  it("nennt einen Auftrag, den beide Geräte geändert haben, und lässt den jüngeren gelten", () => {
    const id = buehne();
    auf(geraetB);
    notizSetzen(id, kopf(id, "Ulm").id, "Deich Nord");
    const t = Date.now();
    auf(geraetA);
    notizSetzen(id, kopf(id, "Ulm").id, "Deich Süd");
    // A's Vermerk ist sicher jünger:
    const s = sammlung(id);
    const ulm = neuesteJeEinheit(s.eintraege).find((e) => e.bogen.einheit.hierarchie[0]!.name === "Ulm")!;
    ulm.vermerke![ulm.vermerke!.length - 1]!.zeit = t + 5000;
    geraetA.setItem("eeb.einsaetze.v1", JSON.stringify(einsaetzeLaden().map((x) => (x.id === id ? s : x))));
    auf(geraetB);
    const vonB = weitergeben(id);
    auf(geraetA);
    const r = einsatzAbgleichen(vonB);
    expect(r.widersprueche).toHaveLength(1);
    expect(r.widersprueche[0]).toMatchObject({ einheit: "Ulm", feld: "Auftrag/Notiz", gilt: "hier" });
    expect(kopf(id, "Ulm").notiz).toBe("Deich Süd");
    expect(abgleichText(r)).toContain("1 Widerspruch zwischen den Geräten: Ulm Auftrag/Notiz — hier Auftrag „Deich Süd“, in der Datei Auftrag „Deich Nord“");
    expect(kopf(id, "Ulm").vermerke?.some((v) => v.text.startsWith("Abgleich mit anderem Gerät"))).toBe(true);
  });

  it("lässt einen Zug aus Altdaten unverändert stehen und gleicht ihn nicht ab", () => {
    const id = buehne();
    // Zug ohne Vermerk wie aus dem Erfassungsbogen: auf beiden Geräten verschieden.
    altZug(geraetA, id, "Biberach", "1. TZ");
    altZug(geraetB, id, "Biberach", "2. TZ");
    auf(geraetB);
    const vonB = weitergeben(id);
    auf(geraetA);
    const r = einsatzAbgleichen(vonB);
    expect(kopf(id, "Biberach").zugEtikett).toBe("1. TZ");
    expect(r.widersprueche).toEqual([]);
    expect(r.aktualisiert).toEqual([]);
  });

  it("übernimmt eine korrigierte Eintreffzeit vom anderen Gerät", () => {
    const id = buehne();
    auf(geraetB);
    eintreffzeitSetzen(id, kopf(id, "Ulm").id, 1_700_000_000_000);
    const vonB = weitergeben(id);
    auf(geraetA);
    const r = einsatzAbgleichen(vonB);
    expect(kopf(id, "Ulm").eingetroffenAm).toBe(1_700_000_000_000);
    expect(r.aktualisiert[0]!.was[0]).toMatch(/^eingetroffen /);
  });

  it("R14-W2: zwei Eintreffzeiten derselben Minute sind kein Widerspruch; verschiedene Minuten sehr wohl", () => {
    const id = buehne();
    auf(geraetB);
    eintreffzeitSetzen(id, kopf(id, "Ulm").id, new Date(2026, 9, 26, 8, 39, 41).getTime());
    eintreffzeitSetzen(id, kopf(id, "Biberach").id, new Date(2026, 9, 26, 9, 12, 5).getTime());
    const vonB = weitergeben(id);
    auf(geraetA);
    eintreffzeitSetzen(id, kopf(id, "Ulm").id, new Date(2026, 9, 26, 8, 39, 3).getTime());
    eintreffzeitSetzen(id, kopf(id, "Biberach").id, new Date(2026, 9, 26, 8, 39, 3).getTime());
    const r = einsatzAbgleichen(vonB);
    // Ulm: beide zeigen 08:39 — nichts, was jemand prüfen könnte.
    expect(r.widersprueche.filter((w) => w.einheit === "Ulm")).toEqual([]);
    expect(abgleichText(r)).not.toMatch(/Ulm Eintreffzeit/);
    // Biberach: 08:39 gegen 09:12 — der echte Unterschied wird genannt, mit zwei verschiedenen Zeiten.
    const bib = r.widersprueche.find((w) => w.einheit === "Biberach");
    expect(bib).toBeDefined();
    expect(bib!.hier).not.toBe(bib!.datei);
  });
});

describe("Weitergabe-Vermerk nach dem Rückimport (R3-W2)", () => {
  it("zählt Importiertes nicht als „hier neu“, wohl aber eigene Aufnahmen und Änderungen", () => {
    const id = buehne();
    // B nimmt Sinsheim auf und lässt Ulm abrücken, A importiert.
    auf(geraetB);
    meldungAufnehmen(id, bogen("Sinsheim"), { quelle: "scan" });
    statusMitZeitSetzen(id, kopf(id, "Ulm").id, MeldeStatus.ABGERUECKT);
    const vonB = weitergeben(id);
    auf(geraetA);
    const r = einsatzAbgleichen(vonB);
    weitergabeUmImportErgaenzen(id, r.neueIds, r.neueVermerke, r.bekannt);
    let stand = weitergabeStandLaden(id)!;
    expect(neueEintraege(sammlung(id).eintraege, stand)).toHaveLength(0);
    expect(aenderungenSeit(sammlung(id).eintraege, stand).anzahl).toBe(0);
    expect(stand.uebernommenAm).toBeTypeOf("number");

    // Jetzt arbeitet A selbst weiter.
    meldungAufnehmen(id, bogen("Bamberg"), { quelle: "scan" });
    notizSetzen(id, kopf(id, "Biberach").id, "Deich Nord");
    stand = weitergabeStandLaden(id)!;
    expect(neueEintraege(sammlung(id).eintraege, stand)).toHaveLength(1);
    expect(aenderungenSeit(sammlung(id).eintraege, stand)).toMatchObject({ anzahl: 1, arten: ["Auftrag"] });
  });

  it("zählt nach dem Rückimport auch Auftrag und Abrücken des anderen Geräts nicht als „hier“ (R4-W7)", () => {
    const id = buehne();
    // A gibt weiter (Stand), B ändert Auftrag und Abrücken und gibt zurück.
    auf(geraetA);
    weitergabeVermerken(sammlung(id));
    auf(geraetB);
    notizSetzen(id, kopf(id, "Ulm").id, "Sandsäcke füllen");
    notizSetzen(id, kopf(id, "Biberach").id, "Ölsperre Brücke");
    statusMitZeitSetzen(id, kopf(id, "Albstadt").id, MeldeStatus.ABGERUECKT);
    const vonB = weitergeben(id);
    auf(geraetA);
    const r = einsatzAbgleichen(vonB);
    expect(r.aktualisiert).toHaveLength(3);
    weitergabeUmImportErgaenzen(id, r.neueIds, r.neueVermerke, r.bekannt);
    const stand = weitergabeStandLaden(id)!;
    expect(aenderungenSeit(sammlung(id).eintraege, stand)).toEqual({ anzahl: 0, arten: [], einheiten: [], jeEinheit: {} });
    // Ändert A danach selbst einen Auftrag, steht genau das da.
    notizSetzen(id, kopf(id, "Ulm").id, "Deich Süd");
    expect(aenderungenSeit(sammlung(id).eintraege, stand)).toMatchObject({ anzahl: 1, arten: ["Auftrag"] });
  });

  it("bucht einen Wert, der hier gegen die Datei gewonnen hat, nicht als bekannt (R4-W7)", () => {
    const id = buehne();
    auf(geraetA);
    weitergabeVermerken(sammlung(id));
    auf(geraetB);
    notizSetzen(id, kopf(id, "Ulm").id, "Deich Nord");
    const vonB = weitergeben(id);
    auf(geraetA);
    notizSetzen(id, kopf(id, "Ulm").id, "Deich Süd");
    // A's Vermerk ist sicher jünger.
    const s = sammlung(id);
    const ulm = neuesteJeEinheit(s.eintraege).find((e) => e.bogen.einheit.hierarchie[0]!.name === "Ulm")!;
    ulm.vermerke![ulm.vermerke!.length - 1]!.zeit = Date.now() + 5000;
    geraetA.setItem("eeb.einsaetze.v1", JSON.stringify(einsaetzeLaden().map((x) => (x.id === id ? s : x))));
    const r = einsatzAbgleichen(vonB);
    weitergabeUmImportErgaenzen(id, r.neueIds, r.neueVermerke, r.bekannt);
    expect(kopf(id, "Ulm").notiz).toBe("Deich Süd");
    // Das andere Gerät kennt „Deich Süd" nicht: das ist hier eine offene Änderung.
    expect(aenderungenSeit(sammlung(id).eintraege, weitergabeStandLaden(id)!)).toMatchObject({ anzahl: 1, arten: ["Auftrag"] });
  });

  it("speichert keinen Auftragstext im Weitergabe-Stand", () => {
    const id = buehne();
    auf(geraetA);
    notizSetzen(id, kopf(id, "Ulm").id, "Geheimer Auftrag");
    weitergabeVermerken(sammlung(id));
    expect(geraetA.getItem("eeb.weitergabe-stand.v1")).not.toContain("Geheimer");
    expect(aenderungenSeit(sammlung(id).eintraege, weitergabeStandLaden(id)!).anzahl).toBe(0);
  });
});

describe("Fassungsentscheidung des anderen Geräts (Audit Runde 5, R5-W4, R5-W1)", () => {
  /** Beide Geräte: Schnellerfassung (jüngerer Stand) und der nachgereichte Bogen (älterer Stand), nicht entschieden. */
  function zweiFassungen() {
    auf(geraetA);
    const s = einsatzAnlegen("Vorrang", EinsatzArt.EINSATZ);
    meldungAufnehmen(s.id, bogen("Crailsheim", 1, 200), { quelle: "manuell" });
    meldungAufnehmen(s.id, bogen("Crailsheim", 5, 100), { quelle: "scan" });
    weitergabeVermerken(sammlung(s.id));
    const datei = weitergeben(s.id);
    auf(geraetB);
    einsatzAbgleichen(datei);
    return s.id;
  }

  it("nennt den Wechsel der geltenden Fassung in der Quittung, statt „enthält nichts“", () => {
    const id = zweiFassungen();
    // B lässt den Bogen gelten und gibt weiter.
    auf(geraetB);
    const bogenId = sammlung(id).eintraege.find((e) => e.quelle === "scan")!.id;
    expect(geltendeJeEinheit(sammlung(id).eintraege)[0]!.quelle).toBe("manuell");
    fassungGiltSetzen(id, bogenId);
    const vonB = weitergeben(id);
    // A importiert: kein neuer Eintrag, aber die geltende Fassung wechselt.
    auf(geraetA);
    expect(geltendeJeEinheit(sammlung(id).eintraege)[0]!.quelle).toBe("manuell");
    const r = einsatzAbgleichen(vonB);
    expect(r.hinzugefuegt).toBe(0);
    expect(geltendeJeEinheit(sammlung(id).eintraege)[0]!.quelle).toBe("scan");
    expect(r.aktualisiert).toHaveLength(1);
    const text = abgleichText(r);
    expect(text).toContain("Crailsheim Bogen der Einheit gilt, ersetzt die Schnellerfassung (Stärke 2 → 6)");
    expect(text).not.toContain("nichts");
  });

  it("zählt den vom anderen Gerät mitgebrachten Wechsel nicht als „hier“ geändert", () => {
    const id = zweiFassungen();
    auf(geraetB);
    fassungGiltSetzen(id, sammlung(id).eintraege.find((e) => e.quelle === "scan")!.id);
    const vonB = weitergeben(id);
    auf(geraetA);
    const r = einsatzAbgleichen(vonB);
    weitergabeUmImportErgaenzen(id, r.neueIds, r.neueVermerke, r.bekannt);
    expect(aenderungenSeit(sammlung(id).eintraege, weitergabeStandLaden(id)!).anzahl).toBe(0);
  });

  it("zählt den Wechsel hier selbst als Änderung seit der Weitergabe", () => {
    const id = zweiFassungen();
    auf(geraetA);
    fassungGiltSetzen(id, sammlung(id).eintraege.find((e) => e.quelle === "scan")!.id);
    expect(aenderungenSeit(sammlung(id).eintraege, weitergabeStandLaden(id)!)).toMatchObject({ anzahl: 1, arten: ["Fassung"] });
  });
});

describe("sammlungFuerZiel — Sammlung des Zugführers in die laufende Lage (R3-W3)", () => {
  it("legt die Meldungen mit Zeiten, Status und Siegel in die Zielsammlung, ohne einen Zug zu setzen", () => {
    // ZFü-Telefon: eigene Sammlung „1. TZ Albstadt" mit Albstadt (signiert) und Ulm (abgerückt).
    auf(geraetB);
    const zfue = einsatzAnlegen("1. TZ Albstadt", EinsatzArt.EINSATZ);
    meldungAufnehmen(zfue.id, bogen("Albstadt"), {
      quelle: "scan",
      signatur: { zustand: "gueltig", pubkey: "ab", kurzform: "4402 c713" },
      herkunft: "QUJD",
    });
    meldungAufnehmen(zfue.id, bogen("Ulm"), { quelle: "scan" });
    statusMitZeitSetzen(zfue.id, kopf(zfue.id, "Ulm").id, MeldeStatus.ABGERUECKT, 4000);
    eintreffzeitSetzen(zfue.id, kopf(zfue.id, "Albstadt").id, 1234);
    const datei = weitergeben(zfue.id);

    // MK-Tablet: „Hochwasser Albstadt" mit Biberach.
    auf(geraetA);
    const mk = einsatzAnlegen("Hochwasser Albstadt", EinsatzArt.EINSATZ);
    meldungAufnehmen(mk.id, bogen("Biberach"), { quelle: "scan" });
    const r = einsatzAbgleichen(sammlungFuerZiel(datei, sammlung(mk.id)));
    expect(r.neuerEinsatz).toBe(false);
    expect(r.hinzugefuegt).toBe(2);
    expect(einsaetzeLaden()).toHaveLength(1); // keine zweite Sammlung
    const alb = kopf(mk.id, "Albstadt");
    expect(alb.signatur?.kurzform).toBe("4402 c713");
    expect(alb.herkunft).toBe("QUJD");
    expect(alb.eingetroffenAm).toBe(1234);
    expect(alb.zugEtikett).toBeUndefined();
    expect(alb.vermerke?.some((v) => v.text.startsWith("Zug"))).toBe(false);
    expect(kopf(mk.id, "Ulm").status).toBe(MeldeStatus.ABGERUECKT);
    expect(kopf(mk.id, "Biberach").zugEtikett).toBeUndefined();
  });

  it("reicht einen Zug aus Altdaten unverändert durch und lässt den der bekannten Einheit stehen", () => {
    auf(geraetB);
    const zfue = einsatzAnlegen("1. TZ", EinsatzArt.EINSATZ);
    meldungAufnehmen(zfue.id, bogen("Biberach"), { quelle: "scan" });
    meldungAufnehmen(zfue.id, bogen("Ulm"), { quelle: "scan" });
    altZug(geraetB, zfue.id, "Ulm", "1. TZ");
    altZug(geraetB, zfue.id, "Biberach", "3. TZ");
    auf(geraetB);
    const datei = weitergeben(zfue.id);
    auf(geraetA);
    const mk = einsatzAnlegen("Lage", EinsatzArt.EINSATZ);
    meldungAufnehmen(mk.id, bogen("Biberach"), { quelle: "scan" });
    altZug(geraetA, mk.id, "Biberach", "2. TZ");
    const vorbereitet = sammlungFuerZiel(datei, sammlung(mk.id));
    expect(vorbereitet.eintraege.find((e) => e.bogen.einheit.hierarchie[0]!.name === "Ulm")!.zugEtikett).toBe("1. TZ");
    einsatzAbgleichen(vorbereitet);
    expect(kopf(mk.id, "Biberach").zugEtikett).toBe("2. TZ");
    expect(kopf(mk.id, "Ulm").zugEtikett).toBe("1. TZ");
  });
});

describe("abgleichGliederung (Audit Runde 5, R5-K3)", () => {
  it("stellt Abrücken und inhaltliche Widersprüche voran und klappt die Eintreffzeit-Abweichungen ein", async () => {
    const { abgleichGliederung } = await import("./einsatz-abgleich");
    const wid = (einheit: string, feld: string) => ({
      einheitSchluessel: einheit, einheit, feld, hier: "a", datei: "b", gilt: "hier" as const,
    });
    const r = {
      aktualisiert: [{ einheitSchluessel: "c", einheit: "Cottbus", was: ["abgerückt 13:37"] }],
      widersprueche: [...Array.from({ length: 13 }, (_, i) => wid(`E${i}`, "Eintreffzeit")), wid("Füssen", "Status")],
    };
    const g = abgleichGliederung(r);
    expect(g.kurz[0]).toBe("1 Meldung aktualisiert: Cottbus abgerückt 13:37.");
    expect(g.kurz.join(" ")).toContain("1 Widerspruch zwischen den Geräten: Füssen Status");
    expect(g.kurz.join(" ")).toContain("13 kleine Abweichungen bei der Eintreffzeit");
    expect(g.kurz.join(" ")).not.toContain("E5");
    expect(g.einzelheiten).toHaveLength(1);
    expect(g.einzelheiten[0]!.zeilen).toHaveLength(13);
  });
});
