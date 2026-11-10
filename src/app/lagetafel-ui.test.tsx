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
}

/** Einsatz mit Einheiten anlegen, wie die App es tut; liefert die gespeicherte Sammlung. */
function einsatzMit(einheiten: Einheit[], art = EinsatzArt.EINSATZ, name = "Hochwasser Weser", ort = "Brake") {
  const e = einsatzAnlegen(name, art, ort);
  const ids: string[] = [];
  for (const x of einheiten) {
    const b = neuerBogen();
    b.einheit.hierarchie[0]!.name = x.ort;
    if (x.typ != null) b.einheit.einheitsTyp = typeof x.typ === "number" ? { code: x.typ } : { freitext: x.typ };
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
  if (einheiten.some((x) => x.auftrag)) {
    const liste = structuredClone(einsaetzeLaden());
    const s = liste.find((l) => l.id === e.id)!;
    einheiten.forEach((x, i) => {
      if (x.auftrag) s.eintraege[i]!.notiz = x.auftrag;
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

  it("setzt den Stand einer Einheit ab einer Stunde in Warnfarbe ab und nennt weiter die Uhrzeit", () => {
    const { sammlung } = einsatzMit([{ ort: "Alt" }, { ort: "Frisch" }]);
    const liste = structuredClone(einsaetzeLaden());
    liste[0]!.eintraege[0]!.empfangenAm = Date.now() - 5 * 3_600_000;
    einsaetzeSpeichern(liste);
    tafel(sammlung());
    expect(karte("THW Alt").querySelector(".lt-stand")!.className).toContain("lt-stand-alt");
    expect(karte("THW Alt").querySelector(".lt-stand")!.textContent).toMatch(/^Stand /);
    expect(karte("THW Frisch").querySelector(".lt-stand")!.className).not.toContain("lt-stand-alt");
    // Die Randspalte sagt, wie viele es sind (R11-K1).
    expect(document.querySelector(".lt-datenstand.lt-warnung")!.textContent).toMatch(/älteste Meldung vor 5 Std 0 Min, 1 von 2 älter als 1 Std/);
  });

  it("führt in der Randspalte Zähler, Dauer, Bedarf und die letzten Bewegungen mit Uhrzeit", () => {
    const { sammlung, id } = einsatzMit([{ ort: "Müde", typ: 4, ruhezeit: true, st: [0, 3, 6] }, { ort: "Fort" }]);
    statusMitZeitSetzen(id, sammlung().eintraege[1]!.id, MeldeStatus.ABGERUECKT);
    tafel(sammlung(), { beginn: Date.now() - 95 * 60_000 });
    const rand = screen.getByRole("complementary");
    const zaehler = Array.from(rand.querySelectorAll(".lt-zaehler > div")).map((d) => `${d.querySelector("dd")!.textContent} ${d.querySelector("dt")!.textContent}`);
    expect(zaehler).toEqual(["1 Einheit", "0 Fahrzeuge", "1 abgerückt"]);
    expect(rand.querySelector(".lt-dauer")!.textContent).toBe("seit Beginn 1 Std 35 Min");
    const bedarf = Array.from(rand.querySelectorAll(".lt-bedarf li"));
    expect(bedarf.map((b) => b.textContent)).toEqual(["Verpflegung 9", "Ruhezeit 1×"]);
    expect(bedarf[1]!.className).toBe("lt-dringend");
    expect(within(rand).getByRole("heading", { name: /^Zuletzt/ }).textContent).toBe("Zuletzt 2 in 15 Min");
    const bewegungen = Array.from(rand.querySelectorAll(".lt-bewegung")).map((b) => b.textContent!);
    expect(bewegungen.some((b) => /^\d\d:\d\dAbgerücktTHW Fort$/.test(b))).toBe(true);
    expect(bewegungen.some((b) => /^\d\d:\d\dEingetroffenTHW Müde B$/.test(b))).toBe(true);
  });

  it("listet abgerückte Einheiten hinter den anwesenden, mit Uhrzeit", () => {
    const { sammlung, id } = einsatzMit([{ ort: "Da", typ: 4 }, { ort: "Fort", typ: 6 }]);
    statusMitZeitSetzen(id, sammlung().eintraege[1]!.id, MeldeStatus.ABGERUECKT);
    tafel(sammlung());
    expect(karten().map((k) => k.querySelector(".lt-herkunft")!.textContent)).toEqual(["THW Da"]);
    const kopf = document.querySelector(".lt-gruppe-ab")!;
    expect(kopf.textContent).toBe("Abgerückt1 Einheit");
    const abgang = document.querySelector(".lt-abgang")!;
    expect(abgang.querySelector(".lt-abgang-name")!.textContent).toBe("THW Fort FGr R (A)");
    expect(abgang.querySelector(".lt-abgang-zeit")!.textContent).toMatch(/^\d\d:\d\d$/);
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
    expect(document.querySelector(".lt-dauer")!.textContent).toBe("seit Beginn 30 Min");
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
    fireEvent.click(screen.getByRole("button", { name: "Ansicht: Tafel" }));
    await vi.waitFor(() => expect(document.querySelector("main.lt")).not.toBeNull());
    expect(localStorage.getItem(ANSICHT_SCHLUESSEL)).toBe("tafel");
    expect(screen.getByRole("button", { name: "Vollbild" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Schließen" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Ansicht: Zeilen" }));
    expect(document.querySelector("main.lm")).not.toBeNull();
    expect(document.querySelector("main.lt")).toBeNull();
    expect(localStorage.getItem(ANSICHT_SCHLUESSEL)).toBeNull();
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
    const gruppe = screen.getByRole("group", { name: "Ansicht am Fernseher" });
    const zeilen = within(gruppe).getByRole("radio", { name: /^Zeilen/ }) as HTMLInputElement;
    const tafelWahl = within(gruppe).getByRole("radio", { name: /^Tafel/ }) as HTMLInputElement;
    expect(zeilen.checked).toBe(true);
    fireEvent.click(tafelWahl);
    expect(tafelWahl.checked).toBe(true);
    expect(localStorage.getItem(ANSICHT_SCHLUESSEL)).toBe("tafel");
    fireEvent.click(zeilen);
    expect(localStorage.getItem(ANSICHT_SCHLUESSEL)).toBeNull();
  });

  it("gilt in diesem Fenster auch, wenn sich die Wahl nicht speichern lässt", async () => {
    const { id } = einsatzMit([{ ort: "Brake" }]);
    render(<Lagemonitor einsatzId={id} />);
    const voll = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("voll", "QuotaExceededError");
    });
    fireEvent.click(screen.getByRole("button", { name: "Ansicht: Tafel" }));
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

  it("trägt Zustand nie allein über Farbe: Warnzeichen an Bedarf und altem Stand (R9-K6)", () => {
    for (const regel of [".lt-marke-achtung::before", ".lt-stand-alt::before", ".lt-bedarf li.lt-dringend::before", ".lt-datenstand.lt-warnung::before"]) {
      expect(css, regel).toContain(`${regel} { content: "\\26A0`);
    }
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

  it("bewegt nur den Balken beim Blättern und schaltet ihn bei reduzierter Bewegung ab", () => {
    expect(css.match(/animation:/g)).toHaveLength(2);
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\) \{\s*\.lt-seitenlauf \{ animation: none; \}/);
    expect(css).not.toMatch(/transition:/);
  });

  it("rollt am Telefon als eine Spalte und hält dort die Mindestschrift des Monitors (R8-L5)", () => {
    const abfrage = "(max-width: 640px), (max-height: 480px), (max-aspect-ratio: 6/5)";
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
