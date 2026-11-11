/**
 * Neu im Meldekopf: die Tafel-Ansicht des Lagemonitors und der Wechsel zwischen den Ansichten.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { EinsatzArt, MeldeStatus, einsaetzeSpeichern, einsatzAnlegen, meldungHinzufuegen } from "@bos/meldekopf/einsaetze";
import { einsaetzeLaden } from "./einsaetze-lesen";
import { statusMitZeitSetzen } from "./eintrag-zeiten";
import { neuePerson, neuerBogen, neuesFahrzeug } from "./hilfen";
import { ANSICHT_SCHLUESSEL } from "./lagemonitor-ansicht";
import { einsatzFunkrufSetzen, einsatzbeginnSetzen } from "./lagemonitor-beginn";
import { Lagemonitor, LagemonitorBlock, STUFE_SCHLUESSEL } from "./lagemonitor-ui";
import Lagetafel, { SEITEN_TAKT_MS } from "./lagetafel-ui";

interface Einheit {
  ort: string;
  typ?: number | string;
  st?: [number, number, number];
  zug?: string;
  ruhezeit?: boolean;
  funk?: number[];
  auftrag?: string;
  /** Etikett eines abgeteilten Teils der Einheit. */
  teil?: string;
  /** Der Bogen ist als Übung gekennzeichnet. */
  uebung?: boolean;
}

/** Einsatz mit Einheiten anlegen, wie die App es tut; liefert die gespeicherte Sammlung. */
function einsatzMit(einheiten: Einheit[], art = EinsatzArt.EINSATZ, name = "Hochwasser Weser", ort = "Brake") {
  const e = einsatzAnlegen(name, art, ort);
  const ids: string[] = [];
  for (const x of einheiten) {
    const b = neuerBogen();
    b.einheit.hierarchie[0]!.name = x.ort;
    if (x.typ != null) b.einheit.einheitsTyp = typeof x.typ === "number" ? { code: x.typ } : { freitext: x.typ };
    if (x.uebung) b.uebung = true;
    const st = x.st ?? [0, 2, 7];
    b.staerkeManuell = { fuehrer: st[0], unterfuehrer: st[1], mannschaft: st[2], gesamt: st[0] + st[1] + st[2] };
    if (x.ruhezeit) {
      b.sofortbedarf = { verpflegungPersonen: st[0] + st[1] + st[2], dieselLiter: 0, benzinLiter: 0, gemischLiter: 0, unterbringung: false, ruhezeitErforderlich: true };
    }
    if (x.funk) {
      const fz = neuesFahrzeug();
      fz.funkrufname = { kennwort: { freitext: "Heros" }, eigenerStandort: true, teile: x.funk };
      b.fahrzeuge = [fz];
    }
    ids.push(meldungHinzufuegen(e.id, b, x.zug ? { zugEtikett: x.zug } : undefined)!.eintrag.id);
  }
  if (einheiten.some((x) => x.auftrag || x.teil)) {
    const liste = structuredClone(einsaetzeLaden());
    const s = liste.find((l) => l.id === e.id)!;
    einheiten.forEach((x, i) => {
      if (x.auftrag) s.eintraege[i]!.notiz = x.auftrag;
      if (x.teil) s.eintraege[i]!.teilEtikett = x.teil;
    });
    einsaetzeSpeichern(liste);
  }
  return { id: e.id, ids, sammlung: () => einsaetzeLaden().find((s) => s.id === e.id)! };
}

function tafel(sammlung: ReturnType<ReturnType<typeof einsatzMit>["sammlung"]>, mehr: Partial<Parameters<typeof Lagetafel>[0]> = {}) {
  return render(<Lagetafel einsatz={sammlung} jetzt={Date.now()} beginn={null} funkruf={null} staleSeit={null} stufe="dunkel" bedienung={null} {...mehr} />);
}

const karten = () => Array.from(document.querySelectorAll<HTMLElement>(".lt-karte"));
const karte = (herkunft: string) => karten().find((k) => k.querySelector(".lt-herkunft")!.textContent === herkunft)!;

describe("Lagetafel", () => {
  beforeEach(() => localStorage.clear());
  afterEach(cleanup);

  it("stellt die Stärkemeldung in der Schreibweise der Meldung an den Kopf, jede Zahl mit ihrem Wort", () => {
    const { sammlung } = einsatzMit([
      { ort: "Oldenburg (NI)", typ: 3, st: [1, 1, 2] },
      { ort: "Oldenburg (NI)", typ: 4, st: [0, 3, 6] },
    ]);
    tafel(sammlung());
    const meldung = screen.getByRole("group", { name: "Stärke: 1 Führer, 4 Unterführer, 8 Mannschaft, gesamt 13" });
    expect(Array.from(meldung.querySelectorAll(".lt-m-ziffern, .lt-m-strich")).map((x) => x.textContent)).toEqual(["1", "/", "4", "/", "8", "//", "13"]);
    expect(Array.from(meldung.querySelectorAll(".lt-m-wort")).map((x) => x.textContent)).toEqual(["Führer", "Unterführer", "Mannschaft", "gesamt"]);
    // Die Gesamtstärke ist die hervorgehobene Zahl.
    expect(meldung.querySelector(".lt-m-gesamt .lt-m-ziffern")!.textContent).toBe("13");
  });

  it("setzt den Funkrufnamen in die erste Zeile und den Einsatz darunter; ohne ihn rückt der Einsatz nach oben", () => {
    const { sammlung } = einsatzMit([]);
    tafel(sammlung(), { funkruf: "Heros Oldenburg 21/10" });
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Heros Oldenburg 21/10");
    expect(document.querySelector(".lt-einsatz-name")!.textContent).toBe("Hochwasser Weser");
    expect(document.querySelector(".lt-ort")!.textContent).toBe("Brake");
    cleanup();
    tafel(sammlung());
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Hochwasser Weser");
    expect(document.querySelector(".lt-einsatz-name")).toBeNull();
    expect(screen.getAllByText("Hochwasser Weser")).toHaveLength(1);
  });

  it("zeigt Uhrzeit, Wochentag mit Datum und die Zeitgruppe zum Abschreiben", () => {
    const { sammlung } = einsatzMit([]);
    tafel(sammlung(), { jetzt: new Date(2026, 10, 10, 18, 6).getTime() });
    const uhr = screen.getByLabelText("Uhrzeit und Datum");
    expect(uhr.querySelector("strong")!.textContent).toBe("18:06");
    expect(uhr.querySelector(".lt-datum")!.textContent).toBe("Dienstag, 10. Nov. 2026");
    expect(uhr.querySelector(".lt-dtg")!.textContent).toBe("DTG 101806nov26");
  });

  it("stellt jede Einheit mit Zeichen, Herkunft, Typ, Funkrufname, Auftrag und Stärke an ihren Platz im Zug", () => {
    const { sammlung } = einsatzMit([
      { ort: "Oldenburg (NI)", typ: 3, st: [1, 1, 2], zug: "1. Zug" },
      { ort: "Oldenburg (NI)", typ: 4, st: [0, 3, 6], zug: "1. Zug", funk: [22, 51], auftrag: "Sandsackfüllplatz Nord" },
      { ort: "Brake", typ: 16, st: [0, 2, 7], zug: "2. Zug" },
    ]);
    tafel(sammlung());
    expect(screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual(["1. Zug", "2. Zug"]);
    const koepfe = Array.from(document.querySelectorAll<HTMLElement>(".lt-gruppe"));
    expect(koepfe[0]!.textContent).toContain("2 Einheiten");
    expect(within(koepfe[0]!).getByRole("group").getAttribute("aria-label")).toBe("Stärke: 1 Führer, 4 Unterführer, 8 Mannschaft, gesamt 13");
    expect(koepfe[1]!.textContent).toContain("1 Einheit");
    expect(karten().map((k) => k.querySelector(".lt-herkunft")!.textContent)).toEqual(["THW Oldenburg (NI)", "THW Oldenburg (NI)", "THW Brake"]);

    const bergung = karten()[1]!;
    // Ausgeschrieben, dahinter als Ausweich für enge Zeilen die Kurzform (für Vorlesesoftware nur der ausgeschriebene Typ).
    expect(bergung.querySelector(".lt-typ-lang")!.textContent).toBe("Bergungsgruppe");
    expect(bergung.querySelector(".lt-typ-kurz")!.textContent).toBe("B");
    expect(bergung.querySelector(".lt-typ-kurz")!.getAttribute("aria-hidden")).toBe("true");
    expect(bergung.querySelector(".lt-funkruf")!.textContent).toBe("Heros Oldenburg 22/51");
    expect(bergung.querySelector(".lt-auftrag")!.textContent).toBe("Sandsackfüllplatz Nord");
    expect(bergung.querySelector(".lt-fum")!.textContent).toBe("0/3/6//");
    expect(bergung.querySelector(".lt-staerke b")!.textContent).toBe("9");
    expect(bergung.querySelector(".lt-stand")!.textContent).toMatch(/^Stand \d\d:\d\d$/);
    expect(karte("THW Brake").querySelector(".lt-typ-lang")!.textContent).toBe("FGr Notversorgung und Notinstandsetzung");
    // Ohne Funkrufname und Auftrag bleibt die Stelle leer, statt einen Strich zu zeigen.
    expect(karte("THW Brake").querySelector(".lt-funkruf, .lt-auftrag")).toBeNull();
  });

  it("lädt das taktische Zeichen jeder Einheit nach und beschneidet es auf sein Band", async () => {
    const { sammlung } = einsatzMit([{ ort: "Brake", typ: 4 }]);
    tafel(sammlung());
    const bild = await vi.waitFor(() => {
      const img = document.querySelector<HTMLImageElement>('.lt-zeichen img[data-zeichen="geladen"]');
      expect(img).not.toBeNull();
      return img!;
    });
    expect(decodeURIComponent(bild.src)).toContain('viewBox="0 30 256 172"');
    // Zierde für Sehende: Der Name der Einheit steht daneben.
    expect(bild.getAttribute("alt")).toBe("");
  });

  it("markiert Bedarf und neue Einheiten am Platz, mit Wort und nicht nur mit Farbe", () => {
    const { sammlung } = einsatzMit([{ ort: "Müde", ruhezeit: true }, { ort: "Ruhig" }]);
    const liste = structuredClone(einsaetzeLaden());
    // Die zweite Einheit ist seit zwei Stunden da und unauffällig, die erste eben eingetroffen.
    liste[0]!.eintraege[1]!.empfangenAm = Date.now() - 120 * 60_000;
    einsaetzeSpeichern(liste);
    tafel(sammlung());
    const muede = karte("THW Müde");
    expect(muede.getAttribute("data-achtung")).toBe("true");
    expect(muede.querySelector(".lt-marke-achtung")!.textContent).toBe("Ruhezeit");
    expect(muede.querySelector(".lt-marke-neu")!.textContent).toBe("neu");
    expect(muede.getAttribute("data-marke")).toBe("neu");
    const ruhig = karte("THW Ruhig");
    expect(ruhig.querySelector(".lt-marken")).toBeNull();
    expect(ruhig.hasAttribute("data-marke")).toBe(false);
    expect(ruhig.hasAttribute("data-achtung")).toBe(false);
  });

  it("nennt den Stand jeder Einheit mit seinem Wort und ohne Warnzeichen; wie viele Stände alt sind, sagt die Randspalte", () => {
    const { sammlung } = einsatzMit([{ ort: "Alt", ruhezeit: true }, { ort: "Frisch" }]);
    const liste = structuredClone(einsaetzeLaden());
    liste[0]!.eintraege[0]!.empfangenAm = Date.now() - 5 * 3_600_000;
    einsaetzeSpeichern(liste);
    tafel(sammlung());
    // Alt oder frisch: An der Karte steht „Stand hh:mm" in derselben Gestalt. Bernstein mit Zeichen gehört dem Bedarf;
    // nach einer Stunde trüge sonst fast jede Karte das Warnzeichen.
    for (const name of ["THW Alt", "THW Frisch"]) {
      const stand = karte(name).querySelector(".lt-stand")!;
      expect(stand.className).toBe("lt-stand");
      expect(stand.textContent).toMatch(/^Stand \d\d:\d\d$/);
    }
    // Auch neben einer Bedarfsmarke bleibt das Wort stehen: Eine nackte Uhrzeit neben „Ruhezeit" läse sich als deren Beginn.
    expect(karte("THW Alt").querySelector(".lt-marke-achtung")!.textContent).toBe("Ruhezeit");
    expect(karte("THW Alt").querySelector(".lt-stand-wort")!.textContent).toBe("Stand ");
    // Die Randspalte sagt, wie viele es sind (R11-K1).
    expect(document.querySelector(".lt-datenstand.lt-warnung")!.textContent).toMatch(/älteste Meldung vor 5 Std 0 Min, 1 von 2 älter als 1 Std/);
  });

  it("führt in der Randspalte Zähler, Dauer, Bedarf und die letzten Bewegungen mit Uhrzeit", () => {
    const { sammlung, id } = einsatzMit([{ ort: "Müde", typ: 4, ruhezeit: true, st: [0, 3, 6] }, { ort: "Fort" }]);
    statusMitZeitSetzen(id, sammlung().eintraege[1]!.id, MeldeStatus.ABGERUECKT);
    tafel(sammlung(), { beginn: Date.now() - 95 * 60_000 });
    const rand = screen.getByRole("complementary");
    const zaehler = Array.from(rand.querySelectorAll(".lt-zaehler > div")).map((d) => `${d.querySelector("dd")!.textContent} ${d.querySelector("dt")!.textContent}`);
    // Die abgerückte Einheit steht im eigenen Block darunter; der Zähler nennt, was da ist.
    expect(zaehler).toEqual(["1 Einheit", "0 Fahrzeuge"]);
    expect(rand.querySelector(".lt-dauer")!.textContent).toMatch(/^Beginn \d\d:\d\d · seit 1 Std 35 Min$/);
    const bedarf = Array.from(rand.querySelectorAll(".lt-bedarf li"));
    expect(bedarf.map((b) => b.textContent)).toEqual(["Verpflegung 9", "Ruhezeit 1×"]);
    expect(bedarf[1]!.className).toBe("lt-dringend");
    // „Zuletzt" führt, was am Platz markiert ist; der Abgang steht im Block „Abgerückt".
    expect(within(rand).getByRole("heading", { name: /^Zuletzt/ }).textContent).toBe("Zuletzt 1 in 15 Min");
    const bewegungen = Array.from(rand.querySelectorAll(".lt-bewegung")).map((b) => b.textContent!);
    expect(bewegungen).toHaveLength(1);
    expect(bewegungen[0]).toMatch(/^\d\d:\d\dEingetroffenTHW Müde B$/);
    expect(within(rand).getByRole("heading", { name: /^Abgerückt/ }).textContent).toBe("Abgerückt 1 Einheit");
  });

  it("nennt eine Folgemeldung in der Randspalte in zwei Zeilen: was sich geändert hat, dann wer", () => {
    const { id, sammlung } = einsatzMit([{ ort: "Brake", typ: 4, st: [0, 2, 6] }]);
    // Die Einheit ist seit zwei Stunden da und meldet sich jetzt mit geänderter Stärke noch einmal.
    const liste = structuredClone(einsaetzeLaden());
    liste.find((l) => l.id === id)!.eintraege[0]!.empfangenAm = Date.now() - 2 * 3_600_000;
    einsaetzeSpeichern(liste);
    const b = structuredClone(sammlung().eintraege[0]!.bogen);
    b.staerkeManuell = { fuehrer: 0, unterfuehrer: 2, mannschaft: 4, gesamt: 6 };
    meldungHinzufuegen(id, b);
    tafel(sammlung());
    const eintrag = screen.getByRole("complementary").querySelector(".lt-bewegung")!;
    expect(Array.from(eintrag.children).map((k) => k.textContent)).toEqual([expect.stringMatching(/^\d\d:\d\d$/), "Stärke 8 → 6 (−2)", "THW Brake B"]);
    // An der Karte steht die neue Stärke groß; die Marke nennt den Unterschied mit Vorzeichen, nicht in Grün.
    const marke = karte("THW Brake").querySelector(".lt-marke")!;
    expect(marke.textContent).toBe("Stärke −2");
    expect(marke.className).toBe("lt-marke lt-marke-folge");
    expect(karte("THW Brake").getAttribute("data-marke")).toBe("folge");
  });

  it("führt abgerückte Einheiten in der Randspalte, die letzten mit Uhrzeit, unabhängig davon, wie voll die Tafel ist", () => {
    const orte = ["Da", "Erste", "Zweite", "Dritte", "Vierte"];
    const { sammlung, id } = einsatzMit(orte.map((ort, i) => ({ ort, typ: [4, 6, 9, 16, 27][i]! })));
    // Vier Einheiten rücken nacheinander ab; die zuletzt abgerückte steht oben.
    const basis = Date.now();
    vi.useFakeTimers({ now: basis });
    for (let i = 1; i <= 4; i++) {
      vi.setSystemTime(basis + i * 60_000);
      statusMitZeitSetzen(id, sammlung().eintraege[i]!.id, MeldeStatus.ABGERUECKT);
    }
    vi.useRealTimers();
    tafel(sammlung(), { jetzt: basis + 5 * 60_000 });
    // Auf der Tafel stehen die anwesenden Einheiten, kein Block „Abgerückt" dazwischen.
    expect(karten().map((k) => k.querySelector(".lt-herkunft")!.textContent)).toEqual(["THW Da"]);
    expect(document.querySelector(".lt-flaeche .lt-abgang, .lt-flaeche .lt-gruppe-ab")).toBeNull();
    const block = within(screen.getByRole("complementary")).getByRole("heading", { name: /^Abgerückt/ }).closest("section")!;
    expect(block.querySelector("h2")!.textContent).toBe("Abgerückt 4 Einheiten");
    const zeilen = Array.from(block.querySelectorAll(".lt-abgaenge li"));
    expect(zeilen.map((z) => z.querySelector(".lt-ab-name")?.textContent ?? z.textContent)).toEqual(["THW Vierte FGr WP (A)", "THW Dritte FGr N", "THW Zweite FGr W (A)", "+ 1 weitere"]);
    expect(zeilen[0]!.querySelector(".lt-ab-zeit")!.textContent).toMatch(/^\d\d:\d\d$/);
  });

  it("stellt die abgerückten Einheiten auf die Tafel, wenn niemand mehr anwesend ist", () => {
    const { sammlung, id } = einsatzMit([{ ort: "Fort", typ: 6 }]);
    statusMitZeitSetzen(id, sammlung().eintraege[0]!.id, MeldeStatus.ABGERUECKT);
    tafel(sammlung());
    expect(karten()).toHaveLength(0);
    const kopf = document.querySelector(".lt-flaeche .lt-gruppe-ab")!;
    expect(kopf.textContent).toBe("Abgerückt 1 Einheit".replace(" 1", "1"));
    const abgang = document.querySelector(".lt-flaeche .lt-abgang")!;
    expect(abgang.querySelector(".lt-abgang-name")!.textContent).toBe("THW Fort FGr R (A)");
    expect(abgang.querySelector(".lt-abgang-zeit")!.textContent).toMatch(/^\d\d:\d\d$/);
    // Die Randspalte wiederholt die Liste dann nicht; ihr Zähler nennt die Zahl.
    const rand = screen.getByRole("complementary");
    expect(within(rand).queryByRole("heading", { name: /^Abgerückt/ })).toBeNull();
    expect(rand.querySelector(".lt-zaehler-ab")!.textContent).toBe("abgerückt1");
  });

  it("kennzeichnet eine Übung über die ganze Breite und unterscheidet leer von „alle abgerückt“", () => {
    const uebung = einsatzMit([], EinsatzArt.UEBUNG, "Wattsturm 2026", "Hooksiel");
    tafel(uebung.sammlung());
    expect(screen.getByRole("status").textContent).toBe("ÜBUNG – keine Echtlage");
    expect(screen.getByText("Noch keine Einheit gemeldet.")).toBeTruthy();
    expect(screen.getByText("Was im Hauptfenster aufgenommen wird, erscheint hier von selbst.")).toBeTruthy();
    expect(karten()).toHaveLength(0);
    cleanup();
    localStorage.clear();
    const fort = einsatzMit([{ ort: "Fort" }]);
    statusMitZeitSetzen(fort.id, fort.ids[0]!, MeldeStatus.ABGERUECKT);
    tafel(fort.sammlung());
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.getByText("Alle Einheiten sind abgerückt.")).toBeTruthy();
  });

  it("stellt Übungsmeldungen in einer echten Lage als letzte Gruppe hin: gekennzeichnet, ohne Summe, und die Stärke oben bleibt ohne sie", () => {
    const { sammlung } = einsatzMit([
      { ort: "Oldenburg (NI)", typ: 4, st: [0, 3, 6], zug: "1. Zug" },
      { ort: "Brake", typ: 4, st: [0, 2, 7], zug: "1. Zug", uebung: true, ruhezeit: true, auftrag: "Ausbildung Deichbau" },
    ]);
    tafel(sammlung());
    expect(document.querySelector(".lt-meldung")!.getAttribute("aria-label")).toBe("Stärke: 0 Führer, 3 Unterführer, 6 Mannschaft, gesamt 9");
    expect(screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual(["1. Zug", "Übung"]);
    const kopf = document.querySelector<HTMLElement>(".lt-gruppe-uebung")!;
    expect(kopf.textContent).toBe("Übung1 Einheitnicht gezählt");
    // Keine Summe am Kopf: Niemand soll sie zur Stärke oben dazurechnen.
    expect(kopf.querySelector(".lt-staerke")).toBeNull();

    const uebung = karte("THW Brake");
    expect(uebung.hasAttribute("data-uebung")).toBe(true);
    expect(Array.from(uebung.querySelectorAll(".lt-marke")).map((m) => [m.className, m.textContent])).toEqual([["lt-marke lt-marke-uebung", "Übung"]]);
    // Bedarf und „neu" gehören nicht in diese Lage: Die Karte warnt nicht, obwohl der Bogen Ruhezeit meldet und eben erst kam.
    expect(uebung.hasAttribute("data-achtung")).toBe(false);
    expect(uebung.hasAttribute("data-marke")).toBe(false);
    // Ihre Angaben stehen da wie bei jeder Einheit.
    expect(within(uebung).getByRole("group").getAttribute("aria-label")).toBe("Stärke: 0 Führer, 2 Unterführer, 7 Mannschaft, gesamt 9");
    // Vor dem Auftrag steht ihr Zug: Die Gruppe geht über alle Züge.
    expect(uebung.querySelector(".lt-auftrag")!.textContent).toBe("1. Zug · Ausbildung Deichbau");
    expect(uebung.querySelector(".lt-stand")!.textContent).toMatch(/^Stand /);
    expect(karte("THW Oldenburg (NI)").hasAttribute("data-uebung")).toBe(false);

    // Die Randspalte zählt und warnt ohne sie und nennt sie gleich bei der Zahl, wie die Einsatzansicht („Einheiten (+1 Übung)").
    const rand = screen.getByRole("complementary");
    expect(rand.querySelector(".lt-zaehler dd")!.textContent).toBe("1");
    expect(rand.querySelector(".lt-daneben")!.textContent).toBe("+ 1 Übung, nicht gezählt");
    expect(rand.querySelector(".lt-zaehler")!.nextElementSibling).toBe(rand.querySelector(".lt-daneben"));
    expect(rand.querySelector(".lt-bedarf")!.textContent).not.toContain("Ruhezeit");
    expect(document.querySelector(".lt-leer-block")).toBeNull();
  });

  it("zeigt eine Lage nur aus Übungsmeldungen: Der Hinweis nennt den Weg, die Karten stehen darunter, wer abgerückt ist, führt die Randspalte", () => {
    const { id, ids, sammlung } = einsatzMit([{ ort: "Alpha", uebung: true }, { ort: "Bravo", uebung: true }, { ort: "Fort" }]);
    statusMitZeitSetzen(id, ids[2]!, MeldeStatus.ABGERUECKT);
    tafel(sammlung());
    expect(document.querySelector(".lt-meldung")!.getAttribute("aria-label")).toBe("Stärke: 0 Führer, 0 Unterführer, 0 Mannschaft, gesamt 0");
    // Der Satz erklärt die Null und hat Vorrang vor „Alle Einheiten sind abgerückt": Es stehen ja Karten da.
    const hinweis = screen.getByText("Keine Einheit in der Lage (2 Übung, nicht gezählt).");
    expect(hinweis.closest(".lt-flaeche")).toBeNull();
    expect(screen.getByText("Übungsmeldungen zählen nur in einer Übung. Im Hauptfenster: „Als Übung führen…“")).toBeTruthy();
    expect(screen.queryByText("Alle Einheiten sind abgerückt.")).toBeNull();
    expect(karten().map((k) => k.querySelector(".lt-herkunft")!.textContent)).toEqual(["THW Alpha", "THW Bravo"]);
    expect(karten().every((k) => k.hasAttribute("data-uebung"))).toBe(true);
    // Auf der Tafel stehen Karten: Die abgerückte Einheit steht in der Randspalte, nicht als Block in der Fläche, und nicht nur als Zahl.
    expect(document.querySelector(".lt-flaeche .lt-abgang")).toBeNull();
    const rand = screen.getByRole("complementary");
    expect(within(rand).getByRole("heading", { name: /^Abgerückt/ })).toBeTruthy();
    expect(Array.from(rand.querySelectorAll(".lt-ab-name")).map((n) => n.textContent)).toEqual(["THW Fort"]);
    expect(rand.querySelector(".lt-zaehler-ab")).toBeNull();
  });

  it("führt in einer Übung keine eigene Gruppe: Jede Meldung zählt, und die Tafel trägt die Zeile „ÜBUNG“", () => {
    const { sammlung } = einsatzMit(
      [
        { ort: "Alpha", uebung: true, st: [0, 1, 4] },
        { ort: "Bravo", st: [0, 1, 3] },
      ],
      EinsatzArt.UEBUNG,
    );
    tafel(sammlung());
    expect(screen.getByRole("status").textContent).toBe("ÜBUNG – keine Echtlage");
    expect(document.querySelector(".lt-meldung")!.getAttribute("aria-label")).toBe("Stärke: 0 Führer, 2 Unterführer, 7 Mannschaft, gesamt 9");
    expect(karten()).toHaveLength(2);
    expect(document.querySelector(".lt-gruppe-uebung")).toBeNull();
    expect(document.querySelector(".lt-karte[data-uebung], .lt-marke-uebung")).toBeNull();
    expect(screen.queryByText(/nicht gezählt/)).toBeNull();
  });

  it("stellt die Hinweise der leeren Tafel über die vermessene Fläche: Der Satz rechnet mit der Höhe, die den Zellen bleibt", () => {
    const { id, ids, sammlung } = einsatzMit([{ ort: "Brake", typ: 4 }]);
    statusMitZeitSetzen(id, ids[0]!, MeldeStatus.ABGERUECKT);
    tafel(sammlung());
    const hinweis = screen.getByText("Alle Einheiten sind abgerückt.");
    expect(hinweis.closest(".lt-tafel")).not.toBeNull();
    expect(hinweis.closest(".lt-flaeche")).toBeNull();
    // Die abgerückte Einheit steht darunter in der Fläche.
    expect(document.querySelector(".lt-flaeche .lt-abgang")).not.toBeNull();
  });

  it("nennt einen abgeteilten Teil der Einheit hinter dem Typ: Zwei Teile sind zwei unterscheidbare Karten", () => {
    const { sammlung } = einsatzMit([
      { ort: "Oldenburg (NI)", typ: 4, teil: "Rest" },
      { ort: "Varel", typ: 4, teil: "Fachberater" },
    ]);
    tafel(sammlung());
    expect(karte("THW Oldenburg (NI)").querySelector(".lt-typ-lang")!.textContent).toBe("Bergungsgruppe (Rest)");
    expect(karte("THW Varel").querySelector(".lt-typ-kurz")!.textContent).toBe("B (Fachberater)");
  });

  it("teilt die Herkunft in Organisation und Standort: Bei Platzmangel wird der längere Teil gekürzt, der kürzere bleibt", () => {
    const { id, sammlung } = einsatzMit([{ ort: "Clausthal-Zellerfeld", typ: 4 }, { ort: "Oldenburg", typ: 4 }]);
    const liste = structuredClone(einsaetzeLaden());
    liste.find((l) => l.id === id)!.eintraege[1]!.bogen.einheit.organisationName = "Johanniter-Unfall-Hilfe Regionalverband Weser-Ems";
    einsaetzeSpeichern(liste);
    tafel(sammlung());
    const teile = (name: string) => Array.from(karte(name).querySelectorAll(".lt-herkunft > span")).map((s) => [s.className, s.textContent]);
    // Kurze Organisation, langer Ort: Der Ort darf gekürzt werden, „THW" bleibt.
    expect(teile("THW Clausthal-Zellerfeld")).toEqual([["lt-teil-fest", "THW"], ["lt-teil-weich", "Clausthal-Zellerfeld"]]);
    // Lange Organisation: Sie wird gekürzt, der Ort bleibt stehen. Er unterscheidet die Karten derselben Organisation.
    expect(teile("Johanniter-Unfall-Hilfe Regionalverband Weser-Ems Oldenburg")).toEqual([
      ["lt-teil-weich", "Johanniter-Unfall-Hilfe Regionalverband Weser-Ems"],
      ["lt-teil-fest", "Oldenburg"],
    ]);
  });

  it("lässt beim Funkrufnamen die Kennziffer stehen: Gekürzt wird davor", () => {
    const { sammlung } = einsatzMit([{ ort: "Brake", typ: 4, funk: [22, 51] }]);
    tafel(sammlung());
    const funkruf = karte("THW Brake").querySelector(".lt-funkruf")!;
    expect(funkruf.textContent).toBe("Heros Brake 22/51");
    expect(Array.from(funkruf.children).map((s) => [s.className, s.textContent])).toEqual([["lt-teil-weich", "Heros Brake"], ["lt-teil-fest", "22/51"]]);
  });

  it("sagt in der Überschrift von „Zuletzt“, wie viele Einträge zu sehen sind, statt still abzuschneiden", () => {
    const { sammlung } = einsatzMit([{ ort: "Eins", typ: 4 }, { ort: "Zwei", typ: 6 }]);
    const titel = () => within(screen.getByRole("complementary")).getByRole("heading", { name: /^Zuletzt/ }).textContent;
    const kasten = (links: number, oben: number, breite: number, hoehe: number) => ({ left: links, top: oben, right: links + breite, bottom: oben + hoehe, width: breite, height: hoehe }) as DOMRect;
    // Ohne Layout (Testumgebung) steht die Zahl der Bewegungen da.
    const erste = tafel(sammlung());
    expect(titel()).toBe("Zuletzt 2 in 15 Min");
    erste.unmount();

    // Die Liste ist 100 px hoch: Der erste Eintrag passt, der zweite liegt in der unsichtbaren Spalte daneben.
    const messung = vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
      if (this.classList.contains("lt-bewegungen")) return kasten(0, 0, 300, 100);
      if (this.classList.contains("lt-bewegung")) return this.previousElementSibling ? kasten(340, 0, 300, 60) : kasten(0, 0, 300, 60);
      return kasten(0, 0, 0, 0);
    });
    const zweite = tafel(sammlung());
    expect(titel()).toBe("Zuletzt 1 von 2 in 15 Min");
    zweite.unmount();

    // Die Liste hat gar keine Höhe (kleiner Fernseher, volle Randspalte): Die Überschrift verweist auf die Marken an den Karten.
    // Vorgefallen: Dieser Fall galt als „nicht gemessen", die Überschrift sprang hin und her, und die Tafel fiel aus.
    messung.mockImplementation(function (this: Element) {
      if (this.classList.contains("lt-bewegungen")) return kasten(0, 0, 300, 0);
      if (this.classList.contains("lt-bewegung")) return kasten(340, 0, 300, 60);
      return kasten(0, 0, 0, 0);
    });
    tafel(sammlung());
    expect(titel()).toBe("Zuletzt 2 in 15 Min · siehe Karten");
    messung.mockRestore();
  });

  it("meldet eine unlesbare Sammlung mit der Uhrzeit des letzten Stands", () => {
    const { sammlung } = einsatzMit([{ ort: "Brake" }]);
    tafel(sammlung(), { staleSeit: new Date(2026, 10, 10, 17, 40).getTime() });
    expect(screen.getByRole("alert").textContent).toMatch(/Sammlung nicht lesbar – letzter Stand von 17:40 Uhr/);
  });

  it("zeigt keine Personen: weder Namen noch Kontakte aus dem Bogen", () => {
    const e = einsatzAnlegen("Namen", EinsatzArt.EINSATZ);
    const b = neuerBogen();
    b.einheit.hierarchie[0]!.name = "Brake";
    const p = neuePerson();
    p.vorname = "Wilhelmine";
    p.nachname = "Musterfrau";
    p.kontakte = [{ art: 1, wert: "0170 1234567", dienstlich: true }] as never;
    b.personal = [p];
    meldungHinzufuegen(e.id, b);
    tafel(einsaetzeLaden().find((s) => s.id === e.id)!);
    const text = document.body.textContent!;
    expect(text).toContain("THW Brake");
    expect(text).not.toContain("Musterfrau");
    expect(text).not.toContain("Wilhelmine");
    expect(text).not.toContain("0170");
  });

  it("stellt die Helligkeitsstufe als Klasse und reicht die Bedienung durch", () => {
    const { sammlung } = einsatzMit([]);
    tafel(sammlung(), { stufe: "gedimmt", bedienung: <button type="button">Dunkler</button> });
    expect(document.querySelector("main.lt")!.className).toBe("lt lt-gedimmt");
    expect(within(document.querySelector<HTMLElement>(".lt-bedienung")!).getByRole("button", { name: "Dunkler" })).toBeTruthy();
  });
});

describe("Lagetafel: Satz und Blättern", () => {
  /** Dem DOM ohne Layout die Fläche eines Fernsehers geben (1920 × 1080), damit der Satz rechnet. */
  function fernseher() {
    vi.stubGlobal("innerWidth", 1920);
    vi.stubGlobal("innerHeight", 1080);
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockImplementation(function (this: HTMLElement) {
      return this.classList.contains("lt-flaeche") ? 1386 : 0;
    });
    vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockImplementation(function (this: HTMLElement) {
      return this.classList.contains("lt-flaeche") ? 852 : 0;
    });
  }

  beforeEach(() => localStorage.clear());
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("setzt wenige Einheiten groß auf eine Seite und reicht Schrift und Maße an die Stilvorlage", () => {
    fernseher();
    const { sammlung } = einsatzMit(Array.from({ length: 6 }, (_, i) => ({ ort: `Ort ${i + 1}`, typ: 4 })));
    tafel(sammlung());
    const main = document.querySelector<HTMLElement>("main.lt")!;
    expect(main.getAttribute("data-satz")).toBe("gesetzt");
    expect(main.getAttribute("data-fassung")).toBe("breit");
    expect(parseFloat(main.style.getPropertyValue("--lt-f"))).toBeGreaterThanOrEqual(33);
    expect(main.style.getPropertyValue("--lt-karte-h")).toBe("2.75");
    expect(main.style.getPropertyValue("--lt-spalten")).toBe("1");
    expect(karten()).toHaveLength(6);
    expect(document.querySelector(".lt-seitenzeile")).toBeNull();
  });

  it("nimmt die dreizeilige Fassung, wo Name und Auftrag in der breiten nicht nebeneinander passen", () => {
    fernseher();
    const { sammlung } = einsatzMit(
      Array.from({ length: 6 }, (_, i) => ({ ort: `Clausthal-Zellerfeld ${i + 1}`, typ: 4, funk: [22, 51], auftrag: "Beleuchtung und Stromversorgung der Einsatzstelle Nord" })),
    );
    tafel(sammlung());
    const main = document.querySelector<HTMLElement>("main.lt")!;
    expect(main.getAttribute("data-fassung")).toBe("drei");
    expect(main.style.getPropertyValue("--lt-spalten")).toBe("1");
    expect(main.style.getPropertyValue("--lt-karte-h")).toBe("3.7");
  });

  it("gibt der Spalte „wer“ der breiten Fassung die gemessene Breite des längsten Namens, ohne Messung den festen Anteil", () => {
    fernseher();
    const { sammlung } = einsatzMit(Array.from({ length: 6 }, (_, i) => ({ ort: `Ort ${i + 1}`, typ: 4, auftrag: "Führung" })));
    const { unmount } = tafel(sammlung());
    // jsdom misst keinen Text: Es bleibt beim Anteil der Stilvorlage.
    const main = () => document.querySelector<HTMLElement>("main.lt")!;
    expect(main().getAttribute("data-fassung")).toBe("breit");
    expect(main().style.getPropertyValue("--lt-wer")).toBe("42%");
    expect(main().style.getPropertyValue("--lt-zeichen")).toBe("2.95");
    unmount();

    // Mit Messung: jeder Text 400 px breit, die Karte 1386 px. Die Spalte nimmt den Namen und lässt dem Auftrag seinen Platz.
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockImplementation(function (this: HTMLElement) {
      return this.classList.contains("lt-flaeche") || this.classList.contains("lt-karte") ? 1386 : 0;
    });
    const messung = Range.prototype as { getBoundingClientRect?: () => DOMRect };
    messung.getBoundingClientRect = () => ({ width: 400 }) as DOMRect;
    try {
      tafel(sammlung());
      expect(main().style.getPropertyValue("--lt-wer")).toBe("400px");
    } finally {
      delete messung.getBoundingClientRect;
    }
  });

  it("trennt im Gruppenkopf den Namen von „(Fortsetzung)“: Der Name darf gekürzt werden, der Zusatz bleibt stehen", () => {
    fernseher();
    const { sammlung } = einsatzMit(Array.from({ length: 30 }, (_, i) => ({ ort: `Ort ${String(i + 1).padStart(2, "0")}`, typ: 4, zug: "1. Technischer Zug Oldenburg-Wesermarsch Nord" })).concat([{ ort: "Brake", typ: 4, zug: "2. Zug" }]));
    tafel(sammlung());
    const koepfe = Array.from(document.querySelectorAll(".lt-gruppe h3"));
    const fortgesetzt = koepfe.filter((h) => h.querySelector(".lt-fortsetzung"));
    expect(fortgesetzt.length).toBeGreaterThan(0);
    for (const h of fortgesetzt) {
      expect(h.textContent).toBe("1. Technischer Zug Oldenburg-Wesermarsch Nord (Fortsetzung)");
      expect(h.querySelector(".lt-gruppe-name")!.textContent).toBe("1. Technischer Zug Oldenburg-Wesermarsch Nord");
      expect(h.querySelector(".lt-fortsetzung")!.textContent).toBe("(Fortsetzung)");
    }
  });

  it("zeigt in der knappen Fassung den Typ in Kurzform", () => {
    fernseher();
    const { sammlung } = einsatzMit(Array.from({ length: 16 }, (_, i) => ({ ort: `Ort ${i + 1}`, typ: 16 })));
    tafel(sammlung());
    expect(document.querySelector("main.lt")!.getAttribute("data-fassung")).toBe("zwei");
    expect(karten()[0]!.querySelector(".lt-typ")!.textContent).toBe("FGr N");
  });

  it("blättert, wenn nicht alle Einheiten auf eine Seite passen, und zeigt jede Einheit auf genau einer Seite", () => {
    fernseher();
    vi.useFakeTimers();
    const { sammlung } = einsatzMit(Array.from({ length: 44 }, (_, i) => ({ ort: `Ort ${String(i + 1).padStart(2, "0")}`, typ: 4 })));
    tafel(sammlung());
    const sichtbar = () => karten().map((k) => k.querySelector(".lt-herkunft")!.textContent!);
    expect(screen.getByRole("status").textContent).toBe("Seite 1 von 2 – die Tafel blättert von selbst");
    const erste = sichtbar();
    expect(erste.length).toBeLessThan(44);
    act(() => void vi.advanceTimersByTime(SEITEN_TAKT_MS));
    expect(screen.getByRole("status").textContent).toMatch(/^Seite 2 von 2/);
    const zweite = sichtbar();
    expect(new Set([...erste, ...zweite]).size).toBe(44);
    expect(erste.filter((n) => zweite.includes(n))).toEqual([]);
    // Danach beginnt die Tafel wieder vorn.
    act(() => void vi.advanceTimersByTime(SEITEN_TAKT_MS));
    expect(screen.getByRole("status").textContent).toMatch(/^Seite 1 von 2/);
    expect(sichtbar()).toEqual(erste);
  });

  it("nennt beim Blättern, welche Züge die Seite zeigt, und führt in der Randspalte alle Züge mit ihrer Stärke", () => {
    fernseher();
    vi.useFakeTimers();
    // Zwölf Züge mit je vier Einheiten; im 3. Zug hat eine Einheit Bedarf.
    const { sammlung } = einsatzMit(
      Array.from({ length: 48 }, (_, i) => ({ ort: `Ort ${String(i + 1).padStart(2, "0")}`, typ: 4, zug: `${Math.floor(i / 4) + 1}. Zug`, st: [0, 2, 6] as [number, number, number], ruhezeit: i === 9 })),
    );
    tafel(sammlung());
    const status = () => screen.getByRole("status").textContent!;
    const seite1 = /^Seite 1 von (\d): 1\. Zug bis (\d+)\. Zug · weiter mit (\d+)\. Zug bis \d+\. Zug$/.exec(status());
    expect(seite1, status()).not.toBeNull();
    const letzter = Number(seite1![2]);
    expect(Number(seite1![3])).toBeGreaterThanOrEqual(letzter);

    const block = within(screen.getByRole("complementary")).getByRole("heading", { name: /^Züge/ }).closest("section")!;
    expect(block.querySelector("h2")!.textContent).toBe("Züge fett: auf dieser Seite");
    const zeilen = Array.from(block.querySelectorAll(".lt-zuege li"));
    // Alle zwölf Züge mit ihrer Gesamtstärke, auch die der anderen Seite.
    expect(zeilen.map((z) => z.textContent)).toEqual(Array.from({ length: 12 }, (_, i) => `${i + 1}. Zug32`));
    // Fett steht, was die laufende Seite zeigt.
    const hier = () => zeilen.filter((z) => z.hasAttribute("data-hier")).map((z) => z.querySelector(".lt-zug-name")!.textContent);
    expect(hier()).toEqual(Array.from({ length: letzter }, (_, i) => `${i + 1}. Zug`));
    // Der Zug mit Bedarf ist markiert, auch wenn seine Seite gerade nicht steht.
    expect(zeilen.filter((z) => z.hasAttribute("data-achtung")).map((z) => z.querySelector(".lt-zug-name")!.textContent)).toEqual(["3. Zug"]);
    act(() => void vi.advanceTimersByTime(SEITEN_TAKT_MS));
    expect(status()).toMatch(/^Seite 2 von/);
    expect(hier()).toContain("12. Zug");
    expect(hier()).not.toContain("1. Zug");
  });

  it("nennt die Übungsmeldungen beim Blättern auf jeder Seite in der Randspalte; die Übersicht führt nur die Züge, die zählen", () => {
    fernseher();
    vi.useFakeTimers();
    const { sammlung } = einsatzMit([
      ...Array.from({ length: 44 }, (_, i) => ({ ort: `Ort ${String(i + 1).padStart(2, "0")}`, typ: 4, zug: `${Math.floor(i / 4) + 1}. Zug`, st: [0, 2, 6] as [number, number, number] })),
      { ort: "Geübt 1", typ: 4, uebung: true },
      { ort: "Geübt 2", typ: 4, uebung: true },
    ]);
    tafel(sammlung());
    const status = () => screen.getByRole("status").textContent!;
    const rand = screen.getByRole("complementary");
    const uebungskarten = () => karten().filter((k) => k.hasAttribute("data-uebung")).map((k) => k.querySelector(".lt-herkunft")!.textContent);
    expect(status()).toMatch(/^Seite 1 von \d: 1\. Zug bis/);
    // Auf der ersten Seite steht keine Karte einer Übungsmeldung; dass es sie gibt, sagt die Randspalte trotzdem.
    expect(uebungskarten()).toEqual([]);
    expect(rand.querySelector(".lt-daneben")!.textContent).toBe("+ 2 Übung, nicht gezählt");
    const block = within(rand).getByRole("heading", { name: /^Züge/ }).closest("section")!;
    // Elf Züge mit ihrer Stärke. Die Übungsmeldungen stehen nicht dazwischen: Sie haben keine Stärke, die in die Lage zählt.
    expect(block.querySelector("h2")!.textContent).toBe("Züge fett: auf dieser Seite");
    expect(Array.from(block.querySelectorAll(".lt-zuege li")).map((z) => z.textContent)).toEqual(Array.from({ length: 11 }, (_, i) => `${i + 1}. Zug32`));
    // Die Stärke oben ist die der elf Züge.
    expect(document.querySelector(".lt-meldung")!.getAttribute("aria-label")).toBe("Stärke: 0 Führer, 88 Unterführer, 264 Mannschaft, gesamt 352");
    // Die Seite davor kündigt sie an („weiter mit … bis Übung"); auf der letzten Seite stehen ihre Karten, und die Seitenzeile nennt die Gruppe.
    const seiten = Number(/von (\d)/.exec(status())![1]);
    for (let i = 1; i < seiten; i++) act(() => void vi.advanceTimersByTime(SEITEN_TAKT_MS));
    const hier = /^Seite (\d) von \1: (.*?)(?: · weiter mit .*)?$/.exec(status());
    expect(hier, status()).not.toBeNull();
    expect(hier![2]).toMatch(/(^| bis )Übung$/);
    expect(uebungskarten()).toEqual(["THW Geübt 1", "THW Geübt 2"]);
    expect(rand.querySelector(".lt-daneben")!.textContent).toBe("+ 2 Übung, nicht gezählt");
  });

  it("lässt die Übersicht der Züge nachgeben: nur ganze Zeilen, der Ausschnitt folgt der laufenden Seite, und der Fuß steht außerhalb", () => {
    fernseher();
    vi.useFakeTimers();
    const { sammlung } = einsatzMit(
      Array.from({ length: 48 }, (_, i) => ({ ort: `Ort ${String(i + 1).padStart(2, "0")}`, typ: 4, zug: `${Math.floor(i / 4) + 1}. Zug`, st: [0, 2, 6] as [number, number, number] })),
    );
    // Dem DOM ohne Layout ein Fenster geben, in das drei der sechs Zeilen passen (Zeile 20 hoch, Fenster 68: die vierte wäre angeschnitten).
    const flaeche = (el: HTMLElement) => el.classList.contains("lt-flaeche");
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockImplementation(function (this: HTMLElement) {
      return flaeche(this) ? 1386 : this.classList.contains("lt-zuege-fenster") ? 300 : 0;
    });
    vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockImplementation(function (this: HTMLElement) {
      return flaeche(this) ? 852 : this.classList.contains("lt-zuege-fenster") ? 68 : 0;
    });
    vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockImplementation(function (this: HTMLElement) {
      return this.parentElement?.classList.contains("lt-zuege") ? 20 : 0;
    });
    tafel(sammlung());
    const rand = screen.getByRole("complementary");
    const block = within(rand).getByRole("heading", { name: /^Züge/ }).closest("section")!;
    const liste = block.querySelector<HTMLElement>(".lt-zuege")!;
    const zeilen = () => Array.from(liste.querySelectorAll<HTMLElement>("li"));
    const zuSehen = () => zeilen().filter((z) => z.style.visibility !== "hidden").map((z) => z.querySelector(".lt-zug-name")!.textContent);
    const fett = () => zeilen().filter((z) => z.hasAttribute("data-hier")).map((z) => z.querySelector(".lt-zug-name")!.textContent);

    // Erste Seite: der Anfang der Liste, nichts verschoben. Alle zwölf Züge bleiben im DOM (die Liste behält ihre Höhe).
    expect(block.querySelector("h2")!.textContent).toBe("Züge 6 von 12 · fett: auf dieser Seite");
    expect(zeilen()).toHaveLength(12);
    expect(zuSehen()).toEqual(["1. Zug", "2. Zug", "3. Zug", "4. Zug", "5. Zug", "6. Zug"]);
    expect(liste.style.transform).toBe("");
    expect(fett().length).toBeGreaterThan(0);
    expect(zuSehen()).toContain(fett()[0]);

    // Letzte Seite: Der Ausschnitt ist mitgewandert, die Züge der Seite sind zu sehen und stehen fett da.
    const status = () => screen.getByRole("status").textContent!;
    const seiten = Number(/von (\d)/.exec(status())![1]);
    for (let i = 1; i < seiten; i++) act(() => void vi.advanceTimersByTime(SEITEN_TAKT_MS));
    expect(status()).toMatch(new RegExp(`^Seite ${seiten} von ${seiten}`));
    expect(fett()).toContain("12. Zug");
    expect(fett().every((name) => zuSehen().includes(name!))).toBe(true);
    expect(zuSehen()).toHaveLength(6);
    // Verschoben wird in ganzen Zeilen und höchstens bis zur letzten (drei von sechs Zeilen passen: höchstens drei Zeilen weit).
    const schub = /^translateY\(-(\d+)px\)$/.exec(liste.style.transform);
    expect(schub, liste.style.transform).not.toBeNull();
    expect(Number(schub![1]) % 20).toBe(0);
    expect(Number(schub![1])).toBeLessThanOrEqual(60);
    expect(block.querySelector("h2")!.textContent).toBe("Züge 6 von 12 · fett: auf dieser Seite");

    // Datenstand und Bedienung stehen unter der Hülle, die misst und abschneidet, nicht in ihr.
    const huelle = rand.querySelector(".lt-rand-inhalt")!;
    expect(huelle.contains(block)).toBe(true);
    expect(rand.querySelector(".lt-fuss")!.parentElement).toBe(rand);
    expect(huelle.contains(rand.querySelector(".lt-fuss"))).toBe(false);
  });

  it("zeigt die Übersicht der Züge nur beim Blättern: Auf einer Seite stehen ihre Köpfe ohnehin alle da", () => {
    fernseher();
    const { sammlung } = einsatzMit(Array.from({ length: 8 }, (_, i) => ({ ort: `Ort ${i + 1}`, typ: 4, zug: `${Math.floor(i / 4) + 1}. Zug` })));
    tafel(sammlung());
    expect(document.querySelector(".lt-seitenzeile")).toBeNull();
    expect(within(screen.getByRole("complementary")).queryByRole("heading", { name: /^Züge/ })).toBeNull();
  });

  it("beginnt vorn, wenn sich die Zahl der Seiten ändert: Takt und Balken laufen dann gemeinsam neu los", () => {
    fernseher();
    vi.useFakeTimers();
    const viele = (anzahl: number) => einsatzMit(Array.from({ length: anzahl }, (_, i) => ({ ort: `Ort ${String(i + 1).padStart(2, "0")}`, typ: 4 }))).sammlung();
    const zwei = viele(44);
    const zeige = (einsatz: ReturnType<typeof viele>) => <Lagetafel einsatz={einsatz} jetzt={Date.now()} beginn={null} funkruf={null} staleSeit={null} stufe="dunkel" bedienung={null} />;
    const { rerender } = render(zeige(zwei));
    const status = () => screen.queryByRole("status")?.textContent ?? "";
    act(() => void vi.advanceTimersByTime(SEITEN_TAKT_MS));
    expect(status()).toMatch(/^Seite 2 von 2/);
    // Kurz vor dem nächsten Umblättern kommen Einheiten dazu, die Tafel braucht mehr Seiten: Sie steht wieder auf Seite 1 …
    act(() => void vi.advanceTimersByTime(SEITEN_TAKT_MS - 2000));
    rerender(zeige(viele(90)));
    expect(status()).toMatch(/^Seite 1 von [3-9]/);
    // … und bleibt dort einen vollen Takt, nicht nur den Rest des alten.
    act(() => void vi.advanceTimersByTime(SEITEN_TAKT_MS - 1000));
    expect(status()).toMatch(/^Seite 1 von/);
    act(() => void vi.advanceTimersByTime(1000));
    expect(status()).toMatch(/^Seite 2 von/);
    // Passt die Lage zwischendurch auf eine Seite, steigt die Tafel danach nicht mitten im Zählen wieder ein.
    rerender(zeige(viele(6)));
    expect(status()).toBe("");
    act(() => void vi.advanceTimersByTime(SEITEN_TAKT_MS * 3));
    rerender(zeige(zwei));
    expect(status()).toMatch(/^Seite 1 von 2/);
  });
});

describe("Lagemonitor: Zeilen oder Tafel", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("nacht-modus");
  });
  afterEach(cleanup);

  it("bleibt ohne Wahl bei den Zeilen", () => {
    const { id } = einsatzMit([{ ort: "Brake" }]);
    render(<Lagemonitor einsatzId={id} />);
    expect(document.querySelector("main.lm")).not.toBeNull();
    expect(document.querySelector("main.lt")).toBeNull();
  });

  it("zeigt die Tafel, wenn sie gewählt ist, mit Beginn, Funkrufname und Stufe des Monitors", async () => {
    const { id } = einsatzMit([{ ort: "Brake", typ: 4, st: [0, 3, 6] }]);
    einsatzFunkrufSetzen(id, "Heros Brake 21/10", [id]);
    einsatzbeginnSetzen(id, Date.now() - 30 * 60_000, [id]);
    localStorage.setItem(ANSICHT_SCHLUESSEL, "tafel");
    localStorage.setItem(STUFE_SCHLUESSEL, "gedimmt");
    render(<Lagemonitor einsatzId={id} />);
    expect((await screen.findByRole("heading", { level: 1 })).textContent).toBe("Heros Brake 21/10");
    expect(document.querySelector("main.lt")!.className).toBe("lt lt-gedimmt");
    expect(document.querySelector("main.lm")).toBeNull();
    expect(document.querySelector(".lt-dauer")!.textContent).toMatch(/^Beginn \d\d:\d\d · seit 30 Min$/);
    expect(document.title).toBe("Lage – Hochwasser Weser");
    // Dieselbe Leiter wie in der Zeilenansicht: aus Gedimmt führt ein Tipp auf Dunkel.
    expect(document.querySelector(".lm-stufe")!.textContent).toBe("Stufe: Gedimmt");
    fireEvent.click(screen.getByRole("button", { name: "Heller" }));
    expect(document.querySelector("main.lt")!.className).toBe("lt lt-dunkel");
    expect(localStorage.getItem(STUFE_SCHLUESSEL)).toBe("dunkel");
  });

  it("wechselt im Monitor zwischen den Ansichten und merkt die Wahl", async () => {
    const { id } = einsatzMit([{ ort: "Brake" }]);
    render(<Lagemonitor einsatzId={id} />);
    fireEvent.click(screen.getByRole("button", { name: "Tafel zeigen" }));
    await vi.waitFor(() => expect(document.querySelector("main.lt")).not.toBeNull());
    expect(localStorage.getItem(ANSICHT_SCHLUESSEL)).toBe("tafel");
    expect(screen.getByRole("button", { name: "Vollbild" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Schließen" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Zeilen zeigen" }));
    expect(document.querySelector("main.lm")).not.toBeNull();
    expect(document.querySelector("main.lt")).toBeNull();
    expect(localStorage.getItem(ANSICHT_SCHLUESSEL)).toBeNull();
  });

  it("bietet den Wechsel in beiden Darstellungen sichtbar an, als Handlung beschriftet und nicht hinter „Optionen“", async () => {
    const { id } = einsatzMit([{ ort: "Brake" }]);
    render(<Lagemonitor einsatzId={id} />);
    // Vorgefallen: In den Zeilen steckte der Knopf im zugeklappten Bereich „Optionen"; wer gewechselt hatte, fand nicht zurück.
    const zurTafel = screen.getByRole("button", { name: "Tafel zeigen" });
    expect(zurTafel.closest("details")).toBeNull();
    expect(zurTafel.closest(".lm-fuss")).not.toBeNull();
    fireEvent.click(zurTafel);
    await vi.waitFor(() => expect(document.querySelector("main.lt")).not.toBeNull());
    const zuDenZeilen = screen.getByRole("button", { name: "Zeilen zeigen" });
    expect(zuDenZeilen.closest(".lt-bedienung")).not.toBeNull();
    // „Ansicht: …" las sich neben „Stufe: Dunkel" wie ein Zustand: Diese Schreibweise gibt es nicht mehr.
    expect(screen.queryByRole("button", { name: /^Ansicht:/ })).toBeNull();
  });

  it("folgt der Wahl aus dem anderen Fenster, ohne dass jemand an den Fernseher muss", async () => {
    const { id } = einsatzMit([{ ort: "Brake" }]);
    render(<Lagemonitor einsatzId={id} />);
    expect(document.querySelector("main.lm")).not.toBeNull();
    // Die Einsatzansicht stellt um: Das Monitor-Fenster bekommt das Speicher-Ereignis.
    localStorage.setItem(ANSICHT_SCHLUESSEL, "tafel");
    act(() => void window.dispatchEvent(new StorageEvent("storage", { key: ANSICHT_SCHLUESSEL, newValue: "tafel" })));
    await vi.waitFor(() => expect(document.querySelector("main.lt")).not.toBeNull());
    localStorage.removeItem(ANSICHT_SCHLUESSEL);
    act(() => void window.dispatchEvent(new StorageEvent("storage", { key: ANSICHT_SCHLUESSEL, newValue: null })));
    expect(document.querySelector("main.lm")).not.toBeNull();
  });

  it("zeigt Papierkorb und fehlenden Einsatz in beiden Ansichten gleich", () => {
    localStorage.setItem(ANSICHT_SCHLUESSEL, "tafel");
    render(<Lagemonitor einsatzId="gibt-es-nicht" />);
    expect(screen.getByText(/nicht \(mehr\) vorhanden/)).toBeTruthy();
    expect(screen.getByLabelText("Uhrzeit und Datum")).toBeTruthy();
  });

  it("lässt die Ansicht in der Einsatzansicht wählen, wo gearbeitet wird", () => {
    render(<LagemonitorBlock einsatzId="e1" alleIds={["e1"]} />);
    const gruppe = screen.getByRole("group", { name: "Darstellung am Fernseher" });
    const zeilen = within(gruppe).getByRole("radio", { name: /^Zeilen/ }) as HTMLInputElement;
    const tafelWahl = within(gruppe).getByRole("radio", { name: /^Tafel/ }) as HTMLInputElement;
    expect(zeilen.checked).toBe(true);
    fireEvent.click(tafelWahl);
    expect(tafelWahl.checked).toBe(true);
    expect(localStorage.getItem(ANSICHT_SCHLUESSEL)).toBe("tafel");
    fireEvent.click(zeilen);
    expect(localStorage.getItem(ANSICHT_SCHLUESSEL)).toBeNull();
  });

  it("meldet in der Einsatzansicht, wenn sich die Wahl nicht speichern lässt, und zeigt sie nicht als getroffen", () => {
    render(<LagemonitorBlock einsatzId="e1" alleIds={["e1"]} />);
    const gruppe = screen.getByRole("group", { name: "Darstellung am Fernseher" });
    const zeilen = within(gruppe).getByRole("radio", { name: /^Zeilen/ }) as HTMLInputElement;
    const tafelWahl = within(gruppe).getByRole("radio", { name: /^Tafel/ }) as HTMLInputElement;
    const voll = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("voll", "QuotaExceededError");
    });
    fireEvent.click(tafelWahl);
    voll.mockRestore();
    // Die Wahl wirkt nur über den Speicher: Ohne ihn stellt sich kein Monitor um, also steht sie auch hier nicht als gewählt da.
    expect(tafelWahl.checked).toBe(false);
    expect(zeilen.checked).toBe(true);
    expect(screen.getByRole("status").textContent).toMatch(/^Die Darstellung konnte nicht gespeichert werden/);
    // Gelingt das Speichern wieder, verschwindet die Meldung.
    fireEvent.click(tafelWahl);
    expect(tafelWahl.checked).toBe(true);
    expect(screen.queryByText(/konnte nicht gespeichert werden/)).toBeNull();
  });

  it("gilt in diesem Fenster auch, wenn sich die Wahl nicht speichern lässt", async () => {
    const { id } = einsatzMit([{ ort: "Brake" }]);
    render(<Lagemonitor einsatzId={id} />);
    const voll = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("voll", "QuotaExceededError");
    });
    fireEvent.click(screen.getByRole("button", { name: "Tafel zeigen" }));
    await vi.waitFor(() => expect(document.querySelector("main.lt")).not.toBeNull());
    voll.mockRestore();
    expect(localStorage.getItem(ANSICHT_SCHLUESSEL)).toBeNull();
  });
});

// jsdom rechnet kein Layout und keine Farben: Die Stilregeln der Tafel werden gerechnet (wie in der Zeilenansicht, Runde 10).
describe("Lagetafel, Stil", () => {
  const css = readFileSync("src/app/lagetafel.css", "utf8");
  const stufen = { gedimmt: "main.lt.lt-gedimmt", dunkel: "main.lt", hell: "main.lt.lt-hell" } as const;

  const farbe = (stufe: string, name: string): string => {
    const start = css.indexOf(stufe + " {");
    const block = css.slice(start, css.indexOf("}", start));
    const m = new RegExp(`${name}:\\s*(#[0-9a-fA-F]{3,6})\\b`).exec(block);
    if (!m) {
      if (stufe === "main.lt") throw new Error(`${name} fehlt in der Grundstufe`);
      return farbe("main.lt", name); // nicht überschrieben: es gilt die Grundstufe
    }
    return m[1]!.length === 4 ? "#" + [...m[1]!.slice(1)].map((c) => c + c).join("") : m[1]!;
  };
  const kanaele = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const rel = (hex: string) => {
    const l = kanaele(hex).map((c) => {
      const x = c / 255;
      return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * l[0]! + 0.7152 * l[1]! + 0.0722 * l[2]!;
  };
  const kontrast = (a: string, b: string) => {
    const [x, y] = [rel(a), rel(b)].sort((p, q) => q - p);
    return (x! + 0.05) / (y! + 0.05);
  };

  it("hält auf jeder Stufe den Kontrast: Schrift und Signale 4,5:1, Linien 3:1, auch auf der Kartenfläche", () => {
    for (const [name, stufe] of Object.entries(stufen)) {
      const grund = farbe(stufe, "--lt-grund");
      const flaeche = farbe(stufe, "--lt-flaeche");
      for (const ton of ["--lt-text", "--lt-text-2", "--lt-achtung", "--lt-neu"]) {
        expect(kontrast(farbe(stufe, ton), grund), `${name} ${ton} auf Grund`).toBeGreaterThanOrEqual(4.5);
        expect(kontrast(farbe(stufe, ton), flaeche), `${name} ${ton} auf Karte`).toBeGreaterThanOrEqual(4.5);
      }
      expect(kontrast(farbe(stufe, "--lt-linie"), grund), `${name} Linie`).toBeGreaterThanOrEqual(3);
      // Die Übung steht als gefüllte Zeile da: Ihre Schrift muss auf dem Rot tragen.
      expect(kontrast(farbe(stufe, "--lt-auf-uebung"), farbe(stufe, "--lt-uebung")), `${name} Übung`).toBeGreaterThanOrEqual(4.5);
      // Übungsmeldungen in einer echten Lage tragen das Rot als Schrift (Gruppenkopf, Marke). Ihre Karten sind hohl und
      // stehen auf dem Grund der Tafel: Auf der Kartenfläche reichte es in „Gedimmt" nicht.
      expect(kontrast(farbe(stufe, "--lt-uebung"), grund), `${name} Übung als Schrift`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("ordnet die Stufen nach Leuchtdichte: Gedimmt < Dunkel < Hell, in Dunkel kein Bildpunkt über ~205 (R10-L4)", () => {
    const hellster = (stufe: string) => Math.max(...kanaele(farbe(stufe, "--lt-text")));
    expect(rel(farbe(stufen.gedimmt, "--lt-text"))).toBeLessThan(rel(farbe(stufen.dunkel, "--lt-text")));
    expect(rel(farbe(stufen.dunkel, "--lt-grund"))).toBeLessThan(rel(farbe(stufen.hell, "--lt-grund")));
    expect(hellster(stufen.gedimmt)).toBeLessThan(hellster(stufen.dunkel));
    expect(hellster(stufen.dunkel)).toBeLessThanOrEqual(205);
    // Die helle Unterlage der Zeichen wird mitgedämpft: Weiß (255) bleibt in Dunkel und Gedimmt unter der Grenze.
    const daempfung = (stufe: string) => {
      const start = css.indexOf(stufe + " {");
      return Number(/--lt-zeichen-filter:\s*brightness\(([\d.]+)\)/.exec(css.slice(start, css.indexOf("}", start)))![1]);
    };
    expect(255 * daempfung(stufen.dunkel)).toBeLessThanOrEqual(205);
    expect(daempfung(stufen.gedimmt)).toBeLessThan(daempfung(stufen.dunkel));
  });

  it("trägt Zustand nie allein über Farbe: Warnzeichen am Bedarf und an den Sammelwarnungen (R9-K6)", () => {
    for (const regel of [".lt-marke-achtung::before", ".lt-bedarf li.lt-dringend::before", ".lt-datenstand.lt-warnung::before"]) {
      expect(css, regel).toContain(`${regel} { content: "\\26A0`);
    }
  });

  it("behält Bernstein mit Warnzeichen dem Bedarf vor: Der Stand einer Einheit und eine geänderte Stärke stehen in Schriftfarbe", () => {
    // Vorgefallen: Jeder Stand über einer Stunde trug Bernstein und Dreieck, in der großen Lage 44 von 44 Karten. Die eine
    // Einheit mit Ruhezeit stand zwischen lauter gleichen Zeichen. In Fassung „zwei" entfiel neben einer Marke dazu das Wort
    // „Stand": „⚠ Ruhezeit ⚠ 01:13" las sich als Ruhezeit ab 01:13.
    expect(css).not.toContain("lt-stand-alt");
    expect(css).not.toMatch(/\.lt-stand-wort \{ display: none/);
    expect(css).toMatch(/^\.lt-stand \{[^}]*color: var\(--lt-text-2\);/m);
    expect(css).toMatch(/^\.lt-marke-folge \{ color: var\(--lt-text\); \}/m);
    // Der Balken des Bedarfs ist breiter als die anderen: zu unterscheiden auch ohne Farbe.
    expect(css).toMatch(/\.lt-karte\[data-achtung\] \{ border-left-color: var\(--lt-achtung\); box-shadow: inset 0\.14em 0 0 var\(--lt-achtung\); \}/);
    // Marken so groß wie die Zeile des Auftrags.
    expect(css).toMatch(/^\.lt-marke \{[^}]*font-size: 0\.7em;/m);
  });

  it("rechnet das Grundmaß wie die Messung in lagetafel-ui.tsx und füllt genau das Bild", () => {
    expect(css).toMatch(/--lt-e:\s*min\(1vh, 0\.5625vw\);/);
    const grund = css.slice(css.indexOf("main.lt {"), css.indexOf("}", css.indexOf("main.lt {")));
    expect(grund).toMatch(/height: 100dvh;/);
    expect(grund).toMatch(/overflow: hidden;/);
  });

  it("lässt Karten und Gruppenköpfen ihre Abstände: Die Rücksetzregel der Tafel erfasst keine Listenpunkte", () => {
    // Vorgefallen: „main.lt :is(…, li, …) { margin: 0; padding: 0 }" wog schwerer als „.lt-karte" und nahm allen Karten
    // Fuge und Polster. Der Satz rechnete mit Abständen, die es im Bild nicht gab.
    const ruecksetzen = /main\.lt :is\(([^)]*)\) \{ margin: 0; padding: 0;/.exec(css)![1]!.split(",").map((x) => x.trim());
    expect(ruecksetzen).not.toContain("li");
    expect(css).toMatch(/\.lt-karte \{[^}]*margin-top: calc\(var\(--lt-fuge\) \* 1em\);[^}]*padding: 0\.28em/s);
    expect(css).toMatch(/\.lt-gruppe \{[^}]*margin-top: calc\(var\(--lt-absatz\) \* 1em\);/s);
    expect(css).toMatch(/\.lt-spalte > :first-child \{ margin-top: 0; \}/);
  });

  it("lässt Marken nie über Typ, Funkrufname oder Zeichen laufen: Der Bedarf wird gekürzt, die Marke der Bewegung bleibt ganz", () => {
    // Vorgefallen: „.lt-marken { overflow: visible; justify-content: flex-end }" mit starren Marken. Reichte das Feld nicht,
    // ragten sie nach links über die Nachbarn, bei drei Bedarfsangaben bis über das taktische Zeichen.
    const regel = (wahl: string) => new RegExp(`^${wahl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} \\{([^}]*)\\}`, "m").exec(css)![1]!;
    expect(regel(".lt-marken")).not.toMatch(/overflow: visible|flex-end/);
    expect(css).toMatch(/\.lt-karte > \*, \.lt-kopfzeile > \*, \.lt-wie > \* \{[^}]*overflow: hidden;/);
    expect(regel(".lt-marke")).toMatch(/flex: none;/);
    expect(regel(".lt-marke-achtung")).toMatch(/flex: 0 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis;/);
  });

  it("hält Stärke und Stand in jeder Fassung in ihrer Breite und nimmt Zeichen und Spalte „wer“ aus dem Satz", () => {
    const raster = Array.from(css.matchAll(/main\.lt\[data-fassung="(zwei|drei|breit)"\] \.lt-karte \{[^}]*grid-template-columns: ([^;]*);/g));
    expect(raster.map((m) => m[1])).toEqual(["zwei", "drei", "breit"]);
    for (const [, fassung, spuren] of raster) {
      expect(spuren, fassung).toMatch(/^calc\(var\(--lt-zeichen\) \* 1em\) /);
      expect(spuren, fassung).toMatch(/ max-content$/);
    }
    expect(raster[2]![2]).toContain("var(--lt-wer)");
    // Name und Stärke teilen die erste Zeile unter sich auf: Der Name hängt nicht an der Breite des Stands darunter.
    expect(css).toMatch(/main\.lt:is\(\[data-fassung="zwei"\], \[data-fassung="drei"\]\) \.lt-kopfzeile \{ grid-area: kopf; display: flex;/);
    // Ein Typ ohne Kurzform bekommt in der knappen Fassung eine Obergrenze, damit Auftrag und Marken Platz behalten.
    expect(css).toMatch(/main\.lt\[data-fassung="zwei"\] \.lt-typ \{ max-width: 14em;/);
  });

  it("kürzt einen langen Zugnamen mit Auslassung und lässt „(Fortsetzung)“ stehen", () => {
    // Vorgefallen: Die Rücksetzregel erlaubt Überschriften den Umbruch („text-wrap: wrap") und wog schwerer als das geerbte
    // „nowrap" des Kopfs. Die zweite Zeile lag unter seiner Kante: „(Fortsetzung)" war nie zu sehen.
    expect(css).toMatch(/main\.lt \.lt-gruppe h3 \{[^}]*white-space: nowrap;/);
    expect(css).toMatch(/\.lt-gruppe-name \{ min-width: 0; overflow: hidden; text-overflow: ellipsis; \}/);
    expect(css).toMatch(/\.lt-fortsetzung \{ flex: none;/);
  });

  it("zeigt in der Randspalte nur ganze Bewegungen, auch die erste, und lässt einen Auftrag ohne Platz ganz weg", () => {
    expect(css).toMatch(/\.lt-bewegungen::before \{ content: ""; width: 100%; height: 0; margin-bottom: calc\(var\(--lt-e\) \* -1\.1\); \}/);
    expect(css).toMatch(/row-gap: calc\(var\(--lt-e\) \* 1\.1\);/);
    expect(css).toMatch(/@container \(max-width: 4em\) \{\s*\.lt-auftrag-text \{ display: none; \}/);
  });

  it("hält die Knöpfe der Helligkeit an ihrer Stelle und die Überschriften der Randspalte einzeilig", () => {
    // „Heller (weiß)" heißt auf der hellen Stufe „Heller": Ohne feste Breiten rückte „Dunkler" beim Wechsel 56 px zur Seite.
    expect(css).toMatch(/\.lt-bedienung \.lm-stufenleiste \.lm-knopf \{ flex: none; width: 4\.9em;/);
    expect(css).toMatch(/\.lt-bedienung \.lm-stufenleiste \.lm-knopf \+ \.lm-knopf \{ width: 7\.6em; \}/);
    expect(css).toMatch(/\.lt-bedienung \.lm-stufenleiste \{[^}]*flex-wrap: nowrap;/);
    // Die Überschrift von „Zuletzt" beschreibt die Liste darunter; bräche sie um, änderte sie deren Höhe.
    expect(css).toMatch(/main\.lt \.lt-block h2 \{[^}]*white-space: nowrap; overflow: hidden; text-overflow: ellipsis;/);
  });

  it("kürzt im Kopf den Namen des Einsatzes vor dem Ort und setzt am Telefon die Wörter der Stärkemeldung als eine Zeile", () => {
    expect(css).toMatch(/\.lt-einsatz-name \{ flex: 0 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; \}/);
    expect(css).toMatch(/\.lt-einsatz-name \+ \.lt-ort \{ flex: none; max-width: 75%; \}/);
    const telefon = css.slice(css.indexOf("@media (max-width: 960px)"));
    // Die Schrift der Meldung richtet sich nach der Zahl der Ziffern; die Wörter stehen als Legende darunter.
    expect(telefon).toMatch(/var\(--lt-m-ziffern, 8\) \* 0\.62 \+ 1\.5/);
    expect(telefon).toMatch(/\.lt-m-wort \{ display: none; \}/);
    expect(telefon).toMatch(/main\.lt \.lt-m-legende \{ display: block;/);
    expect(css).toMatch(/^\.lt-m-legende \{ display: none; \}/m);
  });

  it("bewegt nur den Balken beim Blättern und schaltet ihn bei reduzierter Bewegung ab", () => {
    expect(css.match(/animation:/g)).toHaveLength(2);
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\) \{\s*\.lt-seitenlauf \{ animation: none; \}/);
    expect(css).not.toMatch(/transition:/);
  });

  it("rollt am Telefon als eine Spalte und hält dort die Mindestschrift des Monitors (R8-L5)", () => {
    const abfrage = "(max-width: 960px), (max-height: 560px), (max-aspect-ratio: 6/5)";
    const telefon = css.slice(css.indexOf(`@media ${abfrage}`));
    // Stilvorlage und Komponente entscheiden mit derselben Abfrage, wann die Tafel rollt statt zu setzen.
    expect(css).toContain(`@media ${abfrage} {`);
    expect(readFileSync("src/app/lagetafel-ui.tsx", "utf8")).toContain(`const SCHMAL = "${abfrage}";`);
    expect(telefon).toMatch(/--lm-min:\s*calc\(var\(--lt-b\) \* 0\.875\)/);
    expect(telefon).toMatch(/height: auto;/);
    expect(telefon).toMatch(/overflow: visible;/);
    expect(telefon).toMatch(/font-size: var\(--lm-min\)/);
  });
});
