/**
 * Kopplung zweier Geräte ohne Netz: zwei Speicher, zwei Sitzungen, die
 * Nachrichten wandern über eine Warteschlange (neu im Meldekopf, ADR-009).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OrganisationsTyp, PersonalErfassung, SCHEMA_VERSION, type Erfassungsbogen } from "@bos/eeb-format/model";
import { EinsatzArt, MeldeStatus, einsaetzeLaden, einsaetzePapierkorb, einsatzAnlegen, einsatzLoeschen, neuesteJeEinheit, speicherhuelleSetzen } from "@bos/meldekopf/einsaetze";
import { einheitEntfernen, meldungAufnehmen, notizSetzen, sammlungZuruecksetzen, statusMitZeitSetzen } from "../eintrag-zeiten";
import { entfernteLaden, entfernteVergessen } from "../entfernte-meldungen";
import { meldungenImPapierkorb } from "../meldungs-papierkorb";
import { einsaetzeLesenZuruecksetzen } from "../einsaetze-lesen";
import { widerspruchLaden } from "../eingang/widerspruch-merker";
import { standAbdruck, type StandNachricht } from "./abgleich";
import { AbgleichSitzung } from "./sitzung";

class MemStorage {
  private m = new Map<string, string>();
  get length() { return this.m.size; }
  clear() { this.m.clear(); }
  getItem(k: string) { return this.m.has(k) ? this.m.get(k)! : null; }
  setItem(k: string, v: string) { this.m.set(k, String(v)); }
  removeItem(k: string) { this.m.delete(k); }
  key(i: number) { return [...this.m.keys()][i] ?? null; }
}

interface Geraet {
  speicher: MemStorage;
  sitzung: AbgleichSitzung;
  eingang: StandNachricht[];
}

let laptop: Geraet;
let telefon: Geraet;
let gesendet: number;
let tickt = true;

function auf<T>(g: Geraet, fn: () => T): T {
  (globalThis as { localStorage?: Storage }).localStorage = g.speicher as unknown as Storage;
  speicherhuelleSetzen(g.speicher as unknown as Storage);
  einsaetzeLesenZuruecksetzen();
  // Jede Handlung zu ihrer eigenen Sekunde, wie im Betrieb: Der Abgleich entscheidet nach der Zeit der Vermerke.
  if (tickt) vi.advanceTimersByTime(1000);
  return fn();
}

function geraet(): Geraet {
  return { speicher: new MemStorage(), sitzung: undefined as unknown as AbgleichSitzung, eingang: [] };
}

/** Sitzungen anlegen: Der Laptop koppelt die Sammlung, das Telefon kennt sie noch nicht (oder schon, bei `telefonKennt`). */
function koppeln(einsatzId: string, telefonKennt = false) {
  auf(laptop, () => {
    laptop.sitzung = new AbgleichSitzung(einsatzId, (n) => { gesendet++; telefon.eingang.push(JSON.parse(JSON.stringify(n))); });
  });
  auf(telefon, () => {
    telefon.sitzung = new AbgleichSitzung(telefonKennt ? einsatzId : null, (n) => { gesendet++; laptop.eingang.push(JSON.parse(JSON.stringify(n))); });
  });
  auf(laptop, () => laptop.sitzung.pruefen());
  auf(telefon, () => telefon.sitzung.pruefen());
}

/** Wie der Takt im Betrieb: beide prüfen, alles Unterwegs-Befindliche wird zugestellt, bis Ruhe ist. */
function abgleichen(): number {
  const start = gesendet;
  for (let runde = 0; runde < 50; runde++) {
    auf(laptop, () => laptop.sitzung.pruefen());
    auf(telefon, () => telefon.sitzung.pruefen());
    if (laptop.eingang.length === 0 && telefon.eingang.length === 0) return gesendet - start;
    for (const g of [laptop, telefon]) {
      const post = g.eingang.splice(0);
      for (const n of post) auf(g, () => g.sitzung.empfangen(n));
    }
  }
  throw new Error("Der Abgleich kommt nicht zur Ruhe.");
}

function bogen(ort: string, mannschaft = 3): Erfassungsbogen {
  return {
    schemaVersion: SCHEMA_VERSION,
    stand: 100,
    einheit: { organisation: OrganisationsTyp.THW, einheitsTyp: { code: 1 }, hierarchie: [{ bezeichnung: { code: 1 }, name: ort }] },
    einsatz: { zeitraumVon: 100, zeitraumBis: 130, ortAuftrag: "Lage" },
    personalErfassung: PersonalErfassung.NUR_STAERKE,
    staerkeManuell: { fuehrer: 1, unterfuehrer: 0, mannschaft, gesamt: 1 + mannschaft },
    personal: [],
    fahrzeuge: [],
  };
}

function orte(g: Geraet, id: string): string[] {
  return auf(g, () => neuesteJeEinheit(einsaetzeLaden().find((s) => s.id === id)?.eintraege ?? []).map((e) => e.bogen.einheit.hierarchie[0]!.name).sort());
}

function kopf(id: string, ort: string) {
  return neuesteJeEinheit(einsaetzeLaden().find((s) => s.id === id)!.eintraege).find((e) => e.bogen.einheit.hierarchie[0]!.name === ort)!;
}

function gleicherStand(id: string) {
  expect(auf(laptop, () => standAbdruck(id))).toBe(auf(telefon, () => standAbdruck(id)));
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-24T10:00:00Z"));
  tickt = true;
  laptop = geraet();
  telefon = geraet();
  gesendet = 0;
});

afterEach(() => {
  vi.useRealTimers();
});

/** Sammlung mit Ulm auf dem Laptop, gekoppelt und einmal abgeglichen. */
function buehne(): string {
  const id = auf(laptop, () => {
    const s = einsatzAnlegen("Hochwasser", EinsatzArt.EINSATZ);
    meldungAufnehmen(s.id, bogen("Ulm"), { quelle: "scan" });
    return s.id;
  });
  koppeln(id);
  abgleichen();
  return id;
}

describe("Kopplung: Abgleich zweier Geräte", () => {
  it("legt die Sammlung auf dem zweiten Gerät an", () => {
    const id = buehne();
    expect(telefon.sitzung.einsatzId).toBe(id);
    expect(orte(telefon, id)).toEqual(["Ulm"]);
    gleicherStand(id);
  });

  it("bringt draußen gescannte Einheiten auf die Übersicht und umgekehrt", () => {
    const id = buehne();
    auf(telefon, () => {
      meldungAufnehmen(id, bogen("Biberach"), { quelle: "scan" });
      meldungAufnehmen(id, bogen("Albstadt"), { quelle: "scan" });
    });
    auf(laptop, () => meldungAufnehmen(id, bogen("Ehingen"), { quelle: "scan" }));
    abgleichen();
    expect(orte(laptop, id)).toEqual(["Albstadt", "Biberach", "Ehingen", "Ulm"]);
    expect(orte(telefon, id)).toEqual(["Albstadt", "Biberach", "Ehingen", "Ulm"]);
    gleicherStand(id);
  });

  it("schweigt, solange sich nichts ändert", () => {
    const id = buehne();
    expect(abgleichen()).toBe(0);
    auf(telefon, () => meldungAufnehmen(id, bogen("Biberach"), { quelle: "scan" }));
    // Das Telefon schickt seinen Stand; der Laptop hat danach denselben und antwortet höchstens einmal.
    expect(abgleichen()).toBeLessThanOrEqual(2);
    expect(abgleichen()).toBe(0);
  });

  it("überträgt Abrücken und Auftrag je Feld", () => {
    const id = buehne();
    auf(telefon, () => notizSetzen(id, kopf(id, "Ulm").id, "Deich Nord"));
    abgleichen();
    auf(laptop, () => statusMitZeitSetzen(id, kopf(id, "Ulm").id, MeldeStatus.ABGERUECKT, Date.now()));
    abgleichen();
    for (const g of [laptop, telefon]) {
      auf(g, () => {
        expect(kopf(id, "Ulm").notiz).toBe("Deich Nord");
        expect(kopf(id, "Ulm").status).toBe(MeldeStatus.ABGERUECKT);
      });
    }
    gleicherStand(id);
  });

  it("kommt auch bei einem Widerspruch zur Ruhe und nennt ihn", () => {
    const id = buehne();
    // Beide ändern denselben Auftrag, bevor sie voneinander hören.
    auf(telefon, () => notizSetzen(id, kopf(id, "Ulm").id, "Deich Nord"));
    auf(laptop, () => notizSetzen(id, kopf(id, "Ulm").id, "Deich Süd"));
    abgleichen();
    const aufLaptop = auf(laptop, () => kopf(id, "Ulm").notiz);
    const aufTelefon = auf(telefon, () => kopf(id, "Ulm").notiz);
    expect(aufLaptop).toBe(aufTelefon);
    const zeilen = [...auf(laptop, () => widerspruchLaden(id)), ...auf(telefon, () => widerspruchLaden(id))];
    expect(zeilen.join(" ")).toMatch(/Deich/);
    expect(abgleichen()).toBe(0);
    gleicherStand(id);
  });

  it("bremst, wenn beide Geräte auf ihrem Wert bestehen, und gleicht ab, sobald jemand entscheidet", () => {
    const id = buehne();
    // Dieselbe Millisekunde auf beiden Geräten: Keiner ist jünger, jeder behält seinen Wert.
    tickt = false;
    auf(telefon, () => notizSetzen(id, kopf(id, "Ulm").id, "Deich Nord"));
    auf(laptop, () => notizSetzen(id, kopf(id, "Ulm").id, "Deich Süd"));
    tickt = true;
    expect(abgleichen()).toBeLessThanOrEqual(2 + 2 * 3);
    expect(abgleichen()).toBe(0);
    expect(auf(laptop, () => widerspruchLaden(id)).join(" ")).toMatch(/Deich/);
    // Der Laptop entscheidet: Der jüngere Vermerk gilt auf beiden.
    auf(laptop, () => notizSetzen(id, kopf(id, "Ulm").id, "Deich Mitte"));
    abgleichen();
    expect(auf(telefon, () => kopf(id, "Ulm").notiz)).toBe("Deich Mitte");
    expect(auf(laptop, () => kopf(id, "Ulm").notiz)).toBe("Deich Mitte");
    expect(abgleichen()).toBe(0);
  });

  it("entfernt eine Einheit auf beiden Geräten und legt sie dort in den Papierkorb", () => {
    const id = buehne();
    auf(telefon, () => meldungAufnehmen(id, bogen("Biberach"), { quelle: "scan" }));
    abgleichen();
    auf(laptop, () => einheitEntfernen(id, kopf(id, "Biberach").einheitSchluessel));
    abgleichen();
    expect(orte(laptop, id)).toEqual(["Ulm"]);
    expect(orte(telefon, id)).toEqual(["Ulm"]);
    expect(auf(telefon, () => meldungenImPapierkorb(id)).map((m) => m.name).join()).toContain("Biberach");
    expect(abgleichen()).toBe(0);
  });

  it("holt eine zurückgeholte Einheit auch auf dem anderen Gerät zurück", () => {
    const id = buehne();
    auf(telefon, () => meldungAufnehmen(id, bogen("Biberach"), { quelle: "scan" }));
    abgleichen();
    const vorher = auf(laptop, () => JSON.parse(JSON.stringify(einsaetzeLaden().find((s) => s.id === id)!)));
    const weg = auf(laptop, () => einheitEntfernen(id, kopf(id, "Biberach").einheitSchluessel));
    abgleichen();
    expect(orte(telefon, id)).toEqual(["Ulm"]);
    // „Rückgängig" auf dem Laptop: Einträge wieder hinein, nicht mehr als entfernt führen.
    auf(laptop, () => {
      sammlungZuruecksetzen(vorher);
      entfernteVergessen(id, weg.map((e) => e.id));
    });
    abgleichen();
    expect(orte(laptop, id)).toEqual(["Biberach", "Ulm"]);
    expect(orte(telefon, id)).toEqual(["Biberach", "Ulm"]);
    expect(auf(telefon, () => entfernteLaden()[id] ?? [])).toEqual([]);
    // Danach lässt sie sich wieder entfernen, und auch das kommt an.
    auf(telefon, () => einheitEntfernen(id, kopf(id, "Biberach").einheitSchluessel));
    abgleichen();
    expect(orte(laptop, id)).toEqual(["Ulm"]);
    expect(orte(telefon, id)).toEqual(["Ulm"]);
  });

  it("gleicht nach einer Trennung ab, was beide inzwischen aufgenommen haben", () => {
    const id = buehne();
    // Getrennt: Beide arbeiten weiter, nichts wird zugestellt.
    auf(telefon, () => meldungAufnehmen(id, bogen("Biberach"), { quelle: "scan" }));
    auf(laptop, () => meldungAufnehmen(id, bogen("Ehingen"), { quelle: "scan" }));
    // Neu gekoppelt: Das Telefon kennt die Sammlung schon.
    koppeln(id, true);
    abgleichen();
    expect(orte(laptop, id)).toEqual(["Biberach", "Ehingen", "Ulm"]);
    expect(orte(telefon, id)).toEqual(["Biberach", "Ehingen", "Ulm"]);
    gleicherStand(id);
  });

  it("holt eine hier gelöschte Sammlung nicht zurück", () => {
    const id = buehne();
    auf(telefon, () => einsatzLoeschen(id));
    auf(laptop, () => meldungAufnehmen(id, bogen("Biberach"), { quelle: "scan" }));
    auf(laptop, () => laptop.sitzung.pruefen());
    const n = telefon.eingang.splice(0)[0]!;
    const r = auf(telefon, () => telefon.sitzung.empfangen(n));
    expect(r.abgelehnt).toBe("geloescht");
    expect(auf(telefon, () => einsaetzePapierkorb().map((s) => s.id))).toEqual([id]);
    expect(auf(telefon, () => telefon.sitzung.pruefen())).toBeNull();
  });

  it("weist den Stand einer anderen Sammlung ab", () => {
    const id = buehne();
    const andere = auf(telefon, () => einsatzAnlegen("Sturm", EinsatzArt.EINSATZ).id);
    const fremd = new AbgleichSitzung(andere, (n) => laptop.eingang.push(n));
    auf(telefon, () => fremd.pruefen());
    const r = auf(laptop, () => laptop.sitzung.empfangen(laptop.eingang.splice(0)[0]!));
    expect(r.abgelehnt).toBe("andere-sammlung");
    expect(auf(laptop, () => einsaetzeLaden().map((s) => s.id))).toEqual([id]);
  });

  it("weist Unbrauchbares ab, ohne den Bestand anzufassen", () => {
    const id = buehne();
    expect(() => auf(laptop, () => laptop.sitzung.empfangen({ art: "stand", einsatz: "{kaputt" }))).toThrow();
    expect(() => auf(laptop, () => laptop.sitzung.empfangen({ art: "anderes" }))).toThrow();
    expect(orte(laptop, id)).toEqual(["Ulm"]);
  });
});
