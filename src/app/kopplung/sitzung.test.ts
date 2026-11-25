/**
 * Kopplung zweier Geräte ohne Netz: zwei Speicher, zwei Sitzungen, die
 * Nachrichten wandern über eine Warteschlange (neu im Meldekopf, ADR-009).
 * Der Rechner ist die Zentrale und führt die Lage, das Telefon ist ein reiner
 * Sammler: Es schickt, was es aufnimmt, und bekommt nur den Kopf der Sammlung.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OrganisationsTyp, PersonalErfassung, SCHEMA_VERSION, type Erfassungsbogen } from "@bos/eeb-format/model";
import { EinsatzArt, MeldeStatus, einsaetzeLaden, einsaetzePapierkorb, einsatzAnlegen, einsatzLoeschen, neuesteJeEinheit, speicherhuelleSetzen } from "@bos/meldekopf/einsaetze";
import { einheitEntfernen, meldungAufnehmen, notizSetzen, sammlungZuruecksetzen, statusMitZeitSetzen } from "../eintrag-zeiten";
import { entfernteLaden, entfernteVergessen } from "../entfernte-meldungen";
import { meldungenImPapierkorb } from "../meldungs-papierkorb";
import { einsaetzeLesenZuruecksetzen } from "../einsaetze-lesen";
import { widerspruchLaden } from "../eingang/widerspruch-merker";
import { type ErhaltenNachricht, type StandNachricht } from "./abgleich";
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

type Post = StandNachricht | ErhaltenNachricht;

interface Geraet {
  speicher: MemStorage;
  sitzung: AbgleichSitzung;
  eingang: Post[];
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

/** Sitzungen anlegen: Der Laptop koppelt die Sammlung als Zentrale, das Telefon sammelt (und kennt sie bei `telefonKennt` schon). */
function koppeln(einsatzId: string, telefonKennt = false) {
  auf(laptop, () => {
    laptop.sitzung = new AbgleichSitzung(einsatzId, (n) => { gesendet++; telefon.eingang.push(JSON.parse(JSON.stringify(n))); }, "zentrale");
  });
  auf(telefon, () => {
    telefon.sitzung = new AbgleichSitzung(telefonKennt ? einsatzId : null, (n) => { gesendet++; laptop.eingang.push(JSON.parse(JSON.stringify(n))); }, "sammler");
  });
  auf(laptop, () => laptop.sitzung.pruefen());
  auf(telefon, () => telefon.sitzung.pruefen());
}

function zustellen(g: Geraet) {
  const post = g.eingang.splice(0);
  for (const n of post) auf(g, () => (n.art === "erhalten" ? g.sitzung.quittung(n.kennung) : g.sitzung.empfangen(n)));
}

/** Wie der Takt im Betrieb: beide prüfen, alles Unterwegs-Befindliche wird zugestellt, bis Ruhe ist. */
function abgleichen(): number {
  const start = gesendet;
  for (let runde = 0; runde < 50; runde++) {
    auf(laptop, () => laptop.sitzung.pruefen());
    auf(telefon, () => telefon.sitzung.pruefen());
    if (laptop.eingang.length === 0 && telefon.eingang.length === 0) return gesendet - start;
    zustellen(laptop);
    zustellen(telefon);
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

/** Wie {@link buehne}, dazu Biberach vom Telefon aufgenommen und übertragen. */
function buehneMitBiberach(): string {
  const id = buehne();
  auf(telefon, () => meldungAufnehmen(id, bogen("Biberach"), { quelle: "scan" }));
  abgleichen();
  return id;
}

describe("Kopplung: Zentrale und Sammler", () => {
  it("legt auf dem Sammler die Sammlung an, ohne ihm die Lage zu geben", () => {
    const id = buehne();
    expect(telefon.sitzung.einsatzId).toBe(id);
    const s = auf(telefon, () => einsaetzeLaden().find((x) => x.id === id)!);
    expect(s.name).toBe("Hochwasser");
    expect(s.eintraege).toEqual([]);
    // Auch im Speicher des Telefons steht kein Wort von Ulm.
    expect(JSON.stringify([...Array(telefon.speicher.length).keys()].map((i) => telefon.speicher.getItem(telefon.speicher.key(i)!)))).not.toContain("Ulm");
  });

  it("bringt draußen gescannte Einheiten auf die Übersicht; was die Zentrale aufnimmt, bleibt dort", () => {
    const id = buehne();
    auf(telefon, () => {
      meldungAufnehmen(id, bogen("Biberach"), { quelle: "scan" });
      meldungAufnehmen(id, bogen("Albstadt"), { quelle: "scan" });
    });
    auf(laptop, () => meldungAufnehmen(id, bogen("Ehingen"), { quelle: "scan" }));
    abgleichen();
    expect(orte(laptop, id)).toEqual(["Albstadt", "Biberach", "Ehingen", "Ulm"]);
    expect(orte(telefon, id)).toEqual(["Albstadt", "Biberach"]);
  });

  it("quittiert dem Sammler, was angekommen ist", () => {
    const id = buehne();
    const eintrag = auf(telefon, () => meldungAufnehmen(id, bogen("Biberach"), { quelle: "scan" }))!.eintrag;
    expect(auf(telefon, () => telefon.sitzung.offen())).toBe(1);
    expect(telefon.sitzung.uebertragen(eintrag.id)).toBe(false);
    // Hinaus, aber noch nicht quittiert: gilt weiter als offen.
    auf(telefon, () => telefon.sitzung.pruefen());
    expect(auf(telefon, () => telefon.sitzung.offen())).toBe(1);
    abgleichen();
    expect(auf(telefon, () => telefon.sitzung.offen())).toBe(0);
    expect(telefon.sitzung.uebertragen(eintrag.id)).toBe(true);
  });

  it("zählt nach einem Abriss wieder als offen, was nicht quittiert wurde", () => {
    const id = buehne();
    auf(telefon, () => meldungAufnehmen(id, bogen("Biberach"), { quelle: "scan" }));
    auf(telefon, () => telefon.sitzung.pruefen());
    // Die Nachricht geht verloren, die Verbindung kommt neu.
    laptop.eingang.splice(0);
    telefon.sitzung.neuVerbunden();
    laptop.sitzung.neuVerbunden();
    expect(auf(telefon, () => telefon.sitzung.offen())).toBe(1);
    abgleichen();
    expect(auf(telefon, () => telefon.sitzung.offen())).toBe(0);
    expect(orte(laptop, id)).toEqual(["Biberach", "Ulm"]);
  });

  it("schweigt, solange sich nichts ändert", () => {
    const id = buehne();
    expect(abgleichen()).toBe(0);
    auf(telefon, () => meldungAufnehmen(id, bogen("Biberach"), { quelle: "scan" }));
    // Der Stand des Telefons und die Quittung der Zentrale.
    expect(abgleichen()).toBe(2);
    expect(abgleichen()).toBe(0);
    // Was die Zentrale an der Lage tut, geht nicht zum Sammler.
    auf(laptop, () => meldungAufnehmen(id, bogen("Ehingen"), { quelle: "scan" }));
    auf(laptop, () => statusMitZeitSetzen(id, kopf(id, "Biberach").id, MeldeStatus.ABGERUECKT, Date.now()));
    expect(abgleichen()).toBe(0);
  });

  it("übernimmt Auftrag und Abrücken, die der Sammler an seinen Einheiten setzt", () => {
    const id = buehneMitBiberach();
    auf(telefon, () => notizSetzen(id, kopf(id, "Biberach").id, "Deich Nord"));
    auf(telefon, () => statusMitZeitSetzen(id, kopf(id, "Biberach").id, MeldeStatus.ABGERUECKT, Date.now()));
    abgleichen();
    auf(laptop, () => {
      expect(kopf(id, "Biberach").notiz).toBe("Deich Nord");
      expect(kopf(id, "Biberach").status).toBe(MeldeStatus.ABGERUECKT);
    });
  });

  it("lässt gelten, was die Zentrale an einer Einheit des Sammlers geändert hat", () => {
    const id = buehneMitBiberach();
    auf(laptop, () => notizSetzen(id, kopf(id, "Biberach").id, "Deich Süd"));
    // Der Sammler nimmt weiter auf und schickt dabei seinen alten Stand von Biberach wieder mit.
    auf(telefon, () => meldungAufnehmen(id, bogen("Albstadt"), { quelle: "scan" }));
    abgleichen();
    expect(auf(laptop, () => kopf(id, "Biberach").notiz)).toBe("Deich Süd");
    expect(auf(laptop, () => widerspruchLaden(id))).toEqual([]);
    expect(orte(laptop, id)).toEqual(["Albstadt", "Biberach", "Ulm"]);
  });

  it("nennt den Widerspruch, wenn beide denselben Auftrag ändern, und kommt zur Ruhe", () => {
    const id = buehneMitBiberach();
    auf(laptop, () => notizSetzen(id, kopf(id, "Biberach").id, "Deich Süd"));
    auf(telefon, () => notizSetzen(id, kopf(id, "Biberach").id, "Deich Nord"));
    abgleichen();
    // Die jüngere Änderung gilt in der Lage, und die Zentrale nennt, dass beide geändert haben.
    expect(auf(laptop, () => kopf(id, "Biberach").notiz)).toBe("Deich Nord");
    expect(auf(laptop, () => widerspruchLaden(id)).join(" ")).toMatch(/Deich/);
    expect(abgleichen()).toBe(0);
  });

  it("hält an der Zentrale entfernt, was sie entfernt hat, auch wenn der Sammler es weiter führt", () => {
    const id = buehneMitBiberach();
    auf(laptop, () => einheitEntfernen(id, kopf(id, "Biberach").einheitSchluessel));
    auf(telefon, () => meldungAufnehmen(id, bogen("Albstadt"), { quelle: "scan" }));
    abgleichen();
    expect(orte(laptop, id)).toEqual(["Albstadt", "Ulm"]);
    expect(orte(telefon, id)).toEqual(["Albstadt", "Biberach"]);
  });

  it("entfernt an der Zentrale, was der Sammler entfernt, und legt es dort in den Papierkorb", () => {
    const id = buehneMitBiberach();
    auf(telefon, () => einheitEntfernen(id, kopf(id, "Biberach").einheitSchluessel));
    abgleichen();
    expect(orte(laptop, id)).toEqual(["Ulm"]);
    expect(auf(laptop, () => meldungenImPapierkorb(id)).map((m) => m.name).join()).toContain("Biberach");
    expect(abgleichen()).toBe(0);
  });

  it("holt zurück, was der Sammler zurückholt, und lässt die Zentrale es danach wieder entfernen", () => {
    const id = buehneMitBiberach();
    const vorher = auf(telefon, () => JSON.parse(JSON.stringify(einsaetzeLaden().find((s) => s.id === id)!)));
    const weg = auf(telefon, () => einheitEntfernen(id, kopf(id, "Biberach").einheitSchluessel));
    abgleichen();
    expect(orte(laptop, id)).toEqual(["Ulm"]);
    // „Rückgängig" auf dem Telefon: Einträge wieder hinein, nicht mehr als entfernt führen.
    auf(telefon, () => {
      sammlungZuruecksetzen(vorher);
      entfernteVergessen(id, weg.map((e) => e.id));
    });
    abgleichen();
    expect(orte(laptop, id)).toEqual(["Biberach", "Ulm"]);
    expect(auf(laptop, () => entfernteLaden()[id] ?? [])).toEqual([]);
    // Jetzt entfernt die Zentrale; der Sammler nimmt weiter auf, Biberach bleibt draußen.
    auf(laptop, () => einheitEntfernen(id, kopf(id, "Biberach").einheitSchluessel));
    auf(telefon, () => meldungAufnehmen(id, bogen("Albstadt"), { quelle: "scan" }));
    abgleichen();
    expect(orte(laptop, id)).toEqual(["Albstadt", "Ulm"]);
  });

  it("gleicht nach einer Trennung ab, was der Sammler inzwischen aufgenommen hat", () => {
    const id = buehne();
    // Getrennt: Beide arbeiten weiter, nichts wird zugestellt.
    auf(telefon, () => meldungAufnehmen(id, bogen("Biberach"), { quelle: "scan" }));
    auf(laptop, () => meldungAufnehmen(id, bogen("Ehingen"), { quelle: "scan" }));
    // Neu gekoppelt: Das Telefon kennt die Sammlung schon.
    koppeln(id, true);
    abgleichen();
    expect(orte(laptop, id)).toEqual(["Biberach", "Ehingen", "Ulm"]);
    expect(orte(telefon, id)).toEqual(["Biberach"]);
    expect(auf(telefon, () => telefon.sitzung.offen())).toBe(0);
  });

  it("nimmt als Sammler keine Meldungen an, auch wenn eine Zentrale sie schickte", () => {
    const id = buehne();
    // Ein voller Stand statt des Kopfs, wie ihn nur eine fehlerhafte oder fremde Gegenstelle schickte.
    const voll = new AbgleichSitzung(id, (n) => telefon.eingang.push(n), "sammler");
    auf(laptop, () => voll.pruefen());
    zustellen(telefon);
    expect(orte(telefon, id)).toEqual([]);
  });

  it("holt eine an der Zentrale gelöschte Sammlung nicht zurück", () => {
    const id = buehne();
    auf(laptop, () => einsatzLoeschen(id));
    auf(telefon, () => meldungAufnehmen(id, bogen("Biberach"), { quelle: "scan" }));
    auf(telefon, () => telefon.sitzung.pruefen());
    const n = laptop.eingang.splice(0)[0]!;
    const r = auf(laptop, () => laptop.sitzung.empfangen(n));
    expect(r.abgelehnt).toBe("geloescht");
    expect(auf(laptop, () => einsaetzePapierkorb().map((s) => s.id))).toEqual([id]);
    expect(auf(laptop, () => laptop.sitzung.pruefen())).toBeNull();
  });

  it("weist den Stand einer anderen Sammlung ab", () => {
    const id = buehne();
    const andere = auf(telefon, () => einsatzAnlegen("Sturm", EinsatzArt.EINSATZ).id);
    const fremd = new AbgleichSitzung(andere, (n) => laptop.eingang.push(n), "sammler");
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
    expect(telefon.sitzung.quittung("falsch")).toBe(false);
  });
});
