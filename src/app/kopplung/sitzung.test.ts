/**
 * Kopplung zweier Geräte ohne Netz: zwei Speicher, zwei Sitzungen, die
 * Nachrichten wandern über eine Warteschlange (neu im Meldekopf, ADR-009).
 * Der Rechner ist die Zentrale, ihr Stand ist maßgeblich; die Telefone sind
 * Sammler: Sie schicken, was sie aufnehmen, und führen mit, was die Zentrale
 * schickt.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OrganisationsTyp, PersonalErfassung, SCHEMA_VERSION, type Erfassungsbogen } from "@bos/eeb-format/model";
import { EinsatzArt, MeldeStatus, einsaetzeLaden, einsaetzePapierkorb, einsatzAnlegen, einsatzLoeschen, neuesteJeEinheit, speicherhuelleSetzen } from "@bos/meldekopf/einsaetze";
import { einheitEntfernen, meldungAufnehmen, notizSetzen, statusMitZeitSetzen } from "../eintrag-zeiten";
import { einsaetzeLesenZuruecksetzen } from "../einsaetze-lesen";
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
  /** Sammler: die eine Sitzung mit der Zentrale. Zentrale: je Sammler eine. */
  sitzungen: AbgleichSitzung[];
  eingang: { von: Geraet; n: Post }[];
}

let laptop: Geraet;
let telefon: Geraet;
let zweites: Geraet;
let gesendet: number;

function auf<T>(g: Geraet, fn: () => T): T {
  (globalThis as { localStorage?: Storage }).localStorage = g.speicher as unknown as Storage;
  speicherhuelleSetzen(g.speicher as unknown as Storage);
  einsaetzeLesenZuruecksetzen();
  // Jede Handlung zu ihrer eigenen Sekunde, wie im Betrieb.
  vi.advanceTimersByTime(1000);
  return fn();
}

function geraet(): Geraet {
  return { speicher: new MemStorage(), sitzungen: [], eingang: [] };
}

/** Paare (Zentrale, Sammler) mit ihren beiden Sitzungen. */
const paare: { z: Geraet; s: Geraet; anZ: AbgleichSitzung; anS: AbgleichSitzung }[] = [];

/** Einen Sammler an die Zentrale koppeln; `kennt`: Er führt die Sammlung schon (neu gekoppelt nach einer Trennung). */
function koppeln(einsatzId: string, sammler: Geraet = telefon, kennt = false, bekannt: readonly string[] = []) {
  for (let i = paare.length - 1; i >= 0; i--) if (paare[i]!.s === sammler) paare.splice(i, 1);
  const anZ = auf(laptop, () => new AbgleichSitzung(einsatzId, (n) => { gesendet++; sammler.eingang.push({ von: laptop, n: JSON.parse(JSON.stringify(n)) }); }, "zentrale"));
  const anS = auf(sammler, () => new AbgleichSitzung(kennt ? einsatzId : null, (n) => { gesendet++; laptop.eingang.push({ von: sammler, n: JSON.parse(JSON.stringify(n)) }); }, "sammler", bekannt));
  paare.push({ z: laptop, s: sammler, anZ, anS });
  sammler.sitzungen = [anS];
  laptop.sitzungen = paare.map((p) => p.anZ);
}

function sitzungFuer(g: Geraet, von: Geraet): AbgleichSitzung {
  const p = paare.find((x) => (g === laptop ? x.s === von : x.s === g))!;
  return g === laptop ? p.anZ : p.anS;
}

function zustellen(g: Geraet) {
  for (const { von, n } of g.eingang.splice(0)) {
    const s = sitzungFuer(g, von);
    auf(g, () => (n.art === "erhalten" ? s.quittung(n.kennung) : s.empfangen(n)));
  }
}

/** Wie der Takt im Betrieb: alle prüfen, alles Unterwegs-Befindliche wird zugestellt, bis Ruhe ist. */
function abgleichen(): number {
  const start = gesendet;
  const alle = [laptop, ...new Set(paare.map((p) => p.s))];
  for (let runde = 0; runde < 50; runde++) {
    for (const g of alle) for (const s of g.sitzungen) auf(g, () => s.pruefen());
    if (alle.every((g) => g.eingang.length === 0)) return gesendet - start;
    for (const g of alle) zustellen(g);
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

const offen = (g: Geraet) => auf(g, () => g.sitzungen[0]!.offen());

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-25T10:00:00Z"));
  laptop = geraet();
  telefon = geraet();
  zweites = geraet();
  paare.length = 0;
  gesendet = 0;
});

afterEach(() => {
  vi.useRealTimers();
});

/** Sammlung mit Ulm auf dem Laptop, ein Telefon gekoppelt und einmal abgeglichen. */
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

describe("Kopplung: Zentrale und Sammler", () => {
  it("gibt dem Sammler beim Koppeln den Stand der Zentrale", () => {
    const id = buehne();
    expect(telefon.sitzungen[0]!.einsatzId).toBe(id);
    expect(auf(telefon, () => einsaetzeLaden().find((x) => x.id === id)!.name)).toBe("Hochwasser");
    expect(orte(telefon, id)).toEqual(["Ulm"]);
    // Was von der Zentrale kam, wartet nicht auf Übertragung.
    expect(offen(telefon)).toBe(0);
  });

  it("bringt draußen gescannte Einheiten auf die Übersicht und was die Zentrale aufnimmt aufs Telefon", () => {
    const id = buehne();
    auf(telefon, () => {
      meldungAufnehmen(id, bogen("Biberach"), { quelle: "scan" });
      meldungAufnehmen(id, bogen("Albstadt"), { quelle: "scan" });
    });
    auf(laptop, () => meldungAufnehmen(id, bogen("Ehingen"), { quelle: "scan" }));
    abgleichen();
    expect(orte(laptop, id)).toEqual(["Albstadt", "Biberach", "Ehingen", "Ulm"]);
    expect(orte(telefon, id)).toEqual(["Albstadt", "Biberach", "Ehingen", "Ulm"]);
    expect(offen(telefon)).toBe(0);
  });

  it("schickt vom Sammler nur, was die Zentrale noch nicht kennt", () => {
    const id = buehne();
    auf(telefon, () => meldungAufnehmen(id, bogen("Biberach"), { quelle: "scan" }));
    auf(telefon, () => telefon.sitzungen[0]!.pruefen());
    const n = laptop.eingang[0]!.n as StandNachricht;
    expect(n.einsatz).toContain("Biberach");
    expect(n.einsatz).not.toContain("Ulm");
    expect(n.entfernt).toEqual([]);
  });

  it("quittiert dem Sammler, was angekommen ist", () => {
    const id = buehne();
    const eintrag = auf(telefon, () => meldungAufnehmen(id, bogen("Biberach"), { quelle: "scan" }))!.eintrag;
    expect(offen(telefon)).toBe(1);
    expect(telefon.sitzungen[0]!.uebertragen(eintrag.id)).toBe(false);
    // Hinaus, aber noch nicht quittiert: gilt weiter als offen.
    auf(telefon, () => telefon.sitzungen[0]!.pruefen());
    expect(offen(telefon)).toBe(1);
    abgleichen();
    expect(offen(telefon)).toBe(0);
    expect(telefon.sitzungen[0]!.uebertragen(eintrag.id)).toBe(true);
  });

  it("sendet nach, was ohne Verbindung aufgenommen wurde", () => {
    const id = buehne();
    // Keine Verbindung: Das Telefon nimmt zwei Einheiten auf, nichts wird zugestellt.
    auf(telefon, () => meldungAufnehmen(id, bogen("Biberach"), { quelle: "scan" }));
    auf(telefon, () => telefon.sitzungen[0]!.pruefen());
    laptop.eingang.splice(0);
    auf(telefon, () => meldungAufnehmen(id, bogen("Albstadt"), { quelle: "scan" }));
    expect(offen(telefon)).toBe(2);
    expect(orte(laptop, id)).toEqual(["Ulm"]);
    // Die Verbindung steht wieder: Beide Seiten wissen nichts mehr von dem, was zuletzt hinausging.
    telefon.sitzungen[0]!.neuVerbunden();
    laptop.sitzungen[0]!.neuVerbunden();
    abgleichen();
    expect(orte(laptop, id)).toEqual(["Albstadt", "Biberach", "Ulm"]);
    expect(offen(telefon)).toBe(0);
  });

  it("sendet auch nach einem Neuladen des Telefons nach, ohne Bestätigtes zu verlieren", () => {
    const id = buehne();
    auf(telefon, () => meldungAufnehmen(id, bogen("Biberach"), { quelle: "scan" }));
    abgleichen();
    auf(telefon, () => meldungAufnehmen(id, bogen("Albstadt"), { quelle: "scan" }));
    // Neu geladen: eine neue Sitzung, die nur das Gemerkte kennt (merker.ts).
    const gemerkt = telefon.sitzungen[0]!.bestaetigte();
    koppeln(id, telefon, true, gemerkt);
    expect(offen(telefon)).toBe(1);
    abgleichen();
    expect(orte(laptop, id)).toEqual(["Albstadt", "Biberach", "Ulm"]);
    expect(offen(telefon)).toBe(0);
  });

  it("schweigt, solange sich nichts ändert", () => {
    const id = buehne();
    expect(abgleichen()).toBe(0);
    auf(telefon, () => meldungAufnehmen(id, bogen("Biberach"), { quelle: "scan" }));
    // Die Meldung des Telefons, die Quittung und der neue Stand der Zentrale.
    expect(abgleichen()).toBe(3);
    expect(abgleichen()).toBe(0);
    // Was die Zentrale an der Lage tut, geht als ein Stand zum Sammler; der antwortet nicht.
    auf(laptop, () => meldungAufnehmen(id, bogen("Ehingen"), { quelle: "scan" }));
    expect(abgleichen()).toBe(1);
    expect(abgleichen()).toBe(0);
  });

  it("führt am Sammler mit, was die Zentrale ändert: Auftrag, Abrücken, Entfernen", () => {
    const id = buehne();
    auf(telefon, () => meldungAufnehmen(id, bogen("Biberach"), { quelle: "scan" }));
    abgleichen();
    auf(laptop, () => notizSetzen(id, kopf(id, "Biberach").id, "Deich Süd"));
    auf(laptop, () => statusMitZeitSetzen(id, kopf(id, "Ulm").id, MeldeStatus.ABGERUECKT, Date.now()));
    abgleichen();
    auf(telefon, () => {
      expect(kopf(id, "Biberach").notiz).toBe("Deich Süd");
      expect(kopf(id, "Ulm").status).toBe(MeldeStatus.ABGERUECKT);
    });
    auf(laptop, () => einheitEntfernen(id, kopf(id, "Biberach").einheitSchluessel));
    abgleichen();
    expect(orte(laptop, id)).toEqual(["Ulm"]);
    expect(orte(telefon, id)).toEqual(["Ulm"]);
    // Das Telefon nimmt weiter auf; das Entfernte kommt nicht zurück.
    auf(telefon, () => meldungAufnehmen(id, bogen("Albstadt"), { quelle: "scan" }));
    abgleichen();
    expect(orte(laptop, id)).toEqual(["Albstadt", "Ulm"]);
    expect(orte(telefon, id)).toEqual(["Albstadt", "Ulm"]);
  });

  it("lässt am Sammler stehen, was noch wartet, wenn der Stand der Zentrale kommt", () => {
    const id = buehne();
    // Das Telefon nimmt auf, die Meldung kommt nicht an; inzwischen ändert die Zentrale ihre Lage.
    auf(telefon, () => meldungAufnehmen(id, bogen("Biberach"), { quelle: "scan" }));
    auf(laptop, () => meldungAufnehmen(id, bogen("Ehingen"), { quelle: "scan" }));
    auf(laptop, () => laptop.sitzungen[0]!.pruefen());
    zustellen(telefon);
    expect(orte(telefon, id)).toEqual(["Biberach", "Ehingen", "Ulm"]);
    expect(offen(telefon)).toBe(1);
  });

  it("gilt an der Zentrale: Eine Änderung am Sammler an schon Übertragenem hält nicht", () => {
    const id = buehne();
    auf(telefon, () => notizSetzen(id, kopf(id, "Ulm").id, "am Telefon geändert"));
    auf(laptop, () => notizSetzen(id, kopf(id, "Ulm").id, "Deich Nord"));
    abgleichen();
    expect(auf(laptop, () => kopf(id, "Ulm").notiz)).toBe("Deich Nord");
    expect(auf(telefon, () => kopf(id, "Ulm").notiz)).toBe("Deich Nord");
  });

  it("gleicht nach einer Trennung ab, was beide inzwischen aufgenommen haben", () => {
    const id = buehne();
    auf(telefon, () => meldungAufnehmen(id, bogen("Biberach"), { quelle: "scan" }));
    auf(laptop, () => meldungAufnehmen(id, bogen("Ehingen"), { quelle: "scan" }));
    // Neu gekoppelt (ein Scan): Das Telefon kennt die Sammlung schon, die Sitzungen sind neu.
    koppeln(id, telefon, true, telefon.sitzungen[0]!.bestaetigte());
    abgleichen();
    expect(orte(laptop, id)).toEqual(["Biberach", "Ehingen", "Ulm"]);
    expect(orte(telefon, id)).toEqual(["Biberach", "Ehingen", "Ulm"]);
    expect(offen(telefon)).toBe(0);
  });

  it("holt eine an der Zentrale gelöschte Sammlung nicht zurück", () => {
    const id = buehne();
    auf(laptop, () => einsatzLoeschen(id));
    auf(telefon, () => meldungAufnehmen(id, bogen("Biberach"), { quelle: "scan" }));
    auf(telefon, () => telefon.sitzungen[0]!.pruefen());
    const { n } = laptop.eingang.splice(0)[0]!;
    const r = auf(laptop, () => laptop.sitzungen[0]!.empfangen(n));
    expect(r.abgelehnt).toBe("geloescht");
    expect(auf(laptop, () => einsaetzePapierkorb().map((s) => s.id))).toEqual([id]);
    expect(auf(laptop, () => laptop.sitzungen[0]!.pruefen())).toBeNull();
  });

  it("holt eine am Sammler gelöschte Sammlung nicht zurück", () => {
    const id = buehne();
    auf(telefon, () => einsatzLoeschen(id));
    auf(laptop, () => meldungAufnehmen(id, bogen("Ehingen"), { quelle: "scan" }));
    auf(laptop, () => laptop.sitzungen[0]!.pruefen());
    const { n } = telefon.eingang.splice(0)[0]!;
    expect(auf(telefon, () => telefon.sitzungen[0]!.empfangen(n)).abgelehnt).toBe("geloescht");
  });

  it("weist den Stand einer anderen Sammlung ab", () => {
    const id = buehne();
    const andere = auf(telefon, () => einsatzAnlegen("Sturm", EinsatzArt.EINSATZ).id);
    auf(telefon, () => meldungAufnehmen(andere, bogen("Fremd"), { quelle: "scan" }));
    const post: Post[] = [];
    const fremd = new AbgleichSitzung(andere, (n) => post.push(n), "sammler");
    auf(telefon, () => fremd.pruefen());
    const r = auf(laptop, () => laptop.sitzungen[0]!.empfangen(post[0]));
    expect(r.abgelehnt).toBe("andere-sammlung");
    expect(auf(laptop, () => einsaetzeLaden().map((s) => s.id))).toEqual([id]);
  });

  it("weist Unbrauchbares ab, ohne den Bestand anzufassen", () => {
    const id = buehne();
    expect(() => auf(laptop, () => laptop.sitzungen[0]!.empfangen({ art: "stand", einsatz: "{kaputt" }))).toThrow();
    expect(() => auf(laptop, () => laptop.sitzungen[0]!.empfangen({ art: "anderes" }))).toThrow();
    expect(() => auf(telefon, () => telefon.sitzungen[0]!.empfangen({ art: "stand", einsatz: "{kaputt" }))).toThrow();
    expect(orte(laptop, id)).toEqual(["Ulm"]);
    expect(orte(telefon, id)).toEqual(["Ulm"]);
    expect(telefon.sitzungen[0]!.quittung("falsch")).toBe(false);
  });
});

describe("Kopplung: eine Zentrale, mehrere Sammler", () => {
  it("zeigt jedem Sammler, was der andere aufgenommen hat, über die Zentrale", () => {
    const id = buehne();
    koppeln(id, zweites);
    abgleichen();
    expect(orte(zweites, id)).toEqual(["Ulm"]);
    auf(telefon, () => meldungAufnehmen(id, bogen("Biberach"), { quelle: "scan" }));
    auf(zweites, () => meldungAufnehmen(id, bogen("Albstadt"), { quelle: "scan" }));
    abgleichen();
    for (const g of [laptop, telefon, zweites]) expect(orte(g, id)).toEqual(["Albstadt", "Biberach", "Ulm"]);
    expect(offen(telefon)).toBe(0);
    expect(offen(zweites)).toBe(0);
    expect(abgleichen()).toBe(0);
  });

  it("führt dieselbe Einheit von zwei Sammlern als eine Einheit mit zwei Fassungen", () => {
    const id = buehne();
    koppeln(id, zweites);
    abgleichen();
    auf(telefon, () => meldungAufnehmen(id, bogen("Biberach", 3), { quelle: "scan" }));
    auf(zweites, () => meldungAufnehmen(id, bogen("Biberach", 5), { quelle: "scan" }));
    abgleichen();
    for (const g of [laptop, telefon, zweites]) {
      expect(orte(g, id)).toEqual(["Biberach", "Ulm"]);
      expect(auf(g, () => einsaetzeLaden().find((s) => s.id === id)!.eintraege.filter((e) => e.bogen.einheit.hierarchie[0]!.name === "Biberach"))).toHaveLength(2);
    }
  });

  it("hält den einen Sammler auf dem Stand, während der andere ohne Verbindung sammelt, und holt den dann nach", () => {
    const id = buehne();
    koppeln(id, zweites);
    abgleichen();
    // Das zweite Telefon ist außer Reichweite: Seine Sitzungen ruhen.
    const ruhend = paare.splice(paare.findIndex((p) => p.s === zweites), 1)[0]!;
    laptop.sitzungen = paare.map((p) => p.anZ);
    auf(zweites, () => meldungAufnehmen(id, bogen("Albstadt"), { quelle: "scan" }));
    auf(telefon, () => meldungAufnehmen(id, bogen("Biberach"), { quelle: "scan" }));
    abgleichen();
    expect(orte(laptop, id)).toEqual(["Biberach", "Ulm"]);
    expect(orte(zweites, id)).toEqual(["Albstadt", "Ulm"]);
    expect(offen(zweites)).toBe(1);
    // Wieder da.
    paare.push(ruhend);
    laptop.sitzungen = paare.map((p) => p.anZ);
    ruhend.anZ.neuVerbunden();
    ruhend.anS.neuVerbunden();
    abgleichen();
    for (const g of [laptop, telefon, zweites]) expect(orte(g, id)).toEqual(["Albstadt", "Biberach", "Ulm"]);
    expect(offen(zweites)).toBe(0);
  });
});
