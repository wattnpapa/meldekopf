/**
 * Lagetafel: die Tafel-Ansicht des Lagemonitors.
 *
 * Neu im Meldekopf, neben der übernommenen Zeilenansicht (`lagemonitor-ui.tsx`).
 * Gedacht für den großen Fernseher im Führungsfahrzeug, auf den alle schauen:
 * die Führung am Tisch, die Führungsgehilfen am Gerät, der Gruppenführer in
 * der Tür. Daraus folgen vier Regeln, an denen sich jede Änderung messen muss:
 *
 *  1. **Nach Leseabstand gestaffelt.** Oben stehen Stärke und Uhr so groß, dass
 *     sie von draußen lesbar sind; in der Mitte die Einheiten für alle im
 *     Fahrzeug; am Rand und klein, was nur braucht, wer davor sitzt.
 *  2. **Jede Einheit hat ihren Platz.** Geordnet wird nach Organisation und
 *     Eintreffzeit, nicht nach der letzten Meldung. Was sich ändert, wird am
 *     Platz markiert (`lagetafel.ts`). Wer abgerückt ist, steht mit Uhrzeit
 *     in der Randspalte, unabhängig davon, wie voll die Tafel ist.
 *  3. **Das taktische Zeichen ist das Bild der Einheit**, auf heller Unterlage
 *     wie die Karte an der Magnettafel.
 *  4. **Die Tafel füllt sich.** Die Schrift ist so groß, wie die Zahl der
 *     Einheiten erlaubt; reicht die Mindestgröße nicht, blättert die Tafel,
 *     statt Einheiten wegzulassen.
 *
 * Reine Anzeige wie die Zeilenansicht: Daten, Takt, Helligkeitsstufe und das
 * Fenster verwaltet `Lagemonitor`, hier kommt nur an, was zu zeigen ist.
 * Gezeigt werden Zahlen und Einheitsnamen, keine Personen.
 */

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from "react";
import "./lagetafel.css";
import type { Einheit, Staerke } from "@bos/eeb-format/model";
import type { Einsatzsammlung } from "@bos/meldekopf/einsaetze";
import { BEWEGUNG_FENSTER_MS, alterText, anwesendenAlterText, dtgTeile, uhrTeile, uhrzeitText, type Bewegung } from "./lagemonitor";
import { bedarfTeile } from "./lagemonitor-ui";
import {
  SATZ,
  dauerZeile,
  tafelFortlaufend,
  tafelSatz,
  tafelbild,
  wochentag,
  type KartenFassung,
  type TafelEinheit,
  type TafelMasse,
  type TafelZelle,
  type Tafelbild,
  werBreite,
  zeichenFuerTafel,
} from "./lagetafel";
import { zeichenLaden } from "./zeichen-bild";

/** So lange steht eine Seite, bevor die Tafel weiterblättert. */
export const SEITEN_TAKT_MS = 12_000;
/** So viele abgerückte Einheiten nennt die Randspalte mit Uhrzeit, die zuletzt abgerückten zuerst; der Rest steht als Zahl da. */
const ABGAENGE_AM_RAND = 3;
/** Ab diesem Alter der letzten Meldung wird der Datenstand abgesetzt (wie in der Zeilenansicht, R7-K8). */
const VERALTET_MS = 60 * 60_000;
/**
 * Unter dieser Fenstergröße läuft die Tafel als eine Spalte zum Rollen: Telefon, kleines Fenster, flaches Querformat und
 * Hochformat (dort schrumpfte das am Querformat bemessene Bild sonst auf unlesbare Schrift). Die Grenze liegt unter dem
 * kleinsten Fernseher (1280 × 720). Dieselbe Abfrage wie in lagetafel.css.
 */
const SCHMAL = "(max-width: 960px), (max-height: 560px), (max-aspect-ratio: 6/5)";

export interface LagetafelProps {
  einsatz: Einsatzsammlung;
  jetzt: number;
  /** Von Hand gesetzter Einsatzbeginn (ms) oder `null`. */
  beginn: number | null;
  /** Funkrufname der eigenen Führungsstelle oder `null`. */
  funkruf: string | null;
  /** Die Sammlung ist gerade nicht lesbar: Zeitpunkt des letzten gültigen Stands (ms), sonst `null`. */
  staleSeit: number | null;
  stufe: "dunkel" | "gedimmt" | "hell";
  /** Bedienung des Monitors: Helligkeit, Ansicht, Vollbild, Schließen. */
  bedienung: ReactNode;
}

function useSchmal(): boolean {
  const [schmal, setSchmal] = useState(() => typeof window.matchMedia === "function" && window.matchMedia(SCHMAL).matches);
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const abfrage = window.matchMedia(SCHMAL);
    const horcher = () => setSchmal(abfrage.matches);
    horcher();
    abfrage.addEventListener("change", horcher);
    return () => abfrage.removeEventListener("change", horcher);
  }, []);
  return schmal;
}

/** Größe der Fläche für die Einheiten; `null`, solange es nichts zu messen gibt (kein Layout). */
function useFlaeche(ref: RefObject<HTMLElement | null>): TafelMasse | null {
  const [masse, setMasse] = useState<TafelMasse | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const messen = () => {
      const breite = el.clientWidth;
      const hoehe = el.clientHeight;
      // Dieselbe Rechnung wie --lt-e in lagetafel.css: ein Hundertstel der Höhe des größten 16:9-Bildes im Fenster.
      const einheit = Math.min(window.innerHeight, window.innerWidth * 0.5625) / 100;
      setMasse((alt) => {
        if (!(breite > 0 && hoehe > 0 && einheit > 0)) return null;
        return alt && alt.breite === breite && alt.hoehe === hoehe && alt.einheit === einheit ? alt : { breite, hoehe, einheit };
      });
    };
    messen();
    if (typeof ResizeObserver === "undefined") return;
    const beobachter = new ResizeObserver(messen);
    beobachter.observe(el);
    return () => beobachter.disconnect();
  }, [ref]);
  return masse;
}

const px = (wert: string) => Number.parseFloat(wert) || 0;

/**
 * Breite der Spalte „wer" (Herkunft und Typ) der breiten Fassung in Pixeln; `null` ohne Messung, dann gilt der feste
 * Anteil der Stilvorlage. Gemessen wird der Text selbst (Range), nicht sein Kasten: Das Ergebnis hängt so nicht an der
 * Breite, die es bestimmt, und kennt auch die volle Länge eines gekürzten Namens. Die Rechnung steht in `werBreite`.
 */
function useWerBreite(flaeche: RefObject<HTMLElement | null>, aktiv: boolean): number | null {
  const [breite, setBreite] = useState<number | null>(null);
  // Kommt die Schrift der App erst nach dem ersten Bild, wird noch einmal gemessen.
  const [, setSchriftDa] = useState(false);
  useEffect(() => {
    let lebt = true;
    void document.fonts?.ready.then(() => lebt && setSchriftDa(true));
    return () => {
      lebt = false;
    };
  }, []);
  // Nach jedem Durchgang: Namen, Typen und Schriftgröße können sich mit jeder Meldung ändern.
  useLayoutEffect(() => {
    const el = flaeche.current;
    const erste = aktiv ? el?.querySelector<HTMLElement>(".lt-karte") : null;
    if (!el || !erste || typeof Range === "undefined" || typeof Range.prototype.getBoundingClientRect !== "function") {
      setBreite(null);
      return;
    }
    const stil = getComputedStyle(erste);
    const platz = erste.clientWidth - px(stil.paddingLeft) - px(stil.paddingRight) - SATZ.zeichen * px(stil.fontSize);
    const messung = document.createRange();
    // Besteht ein Feld aus Teilen (Organisation und Standort, Kennwort und Kennziffer), zählt jeder Teil in voller Länge
    // und der Abstand dazwischen: Ein gekürzter Teil ragt unter seinen Nachbarn, die Hülle allein mäße zu wenig.
    const text = (teil: Element | null | undefined): number => {
      if (!teil) return 0;
      const kinder = Array.from(teil.children);
      if (kinder.length > 1 && getComputedStyle(teil).display.includes("flex")) {
        return kinder.reduce((summe, kind) => summe + text(kind), 0) + px(getComputedStyle(teil).columnGap) * (kinder.length - 1);
      }
      messung.selectNodeContents(teil);
      return messung.getBoundingClientRect().width;
    };
    const bedarf = { herkunft: 0, typ: 0, frei: platz };
    for (const karte of el.querySelectorAll<HTMLElement>(".lt-karte")) {
      const herkunft = karte.querySelector<HTMLElement>(".lt-herkunft");
      const typ = karte.querySelector<HTMLElement>(".lt-typ");
      if (herkunft) bedarf.herkunft = Math.max(bedarf.herkunft, text(herkunft) + px(getComputedStyle(herkunft).paddingRight));
      // Ein Typ ohne Kurzform zählt wie der Name; sonst der ausgeschriebene Typ, soweit Platz ist (für ihn springt die Kurzform ein).
      const lang = typ?.querySelector(".lt-typ-lang");
      if (typ && !lang) bedarf.herkunft = Math.max(bedarf.herkunft, text(typ) + px(getComputedStyle(typ).paddingRight));
      if (typ && lang) bedarf.typ = Math.max(bedarf.typ, text(lang) + px(getComputedStyle(typ).paddingRight));
      // Was die rechte Seite dieser Karte braucht: oben der Auftrag, unten Funkrufname und Marken, dahinter Stärke und Stand.
      const spuren = getComputedStyle(karte).gridTemplateColumns.split(" ").map(px);
      const rechts = (spuren[4] ?? 0) + Math.max(text(karte.querySelector(".lt-auftrag")), text(karte.querySelector(".lt-funkruf")) + (spuren[3] ?? 0));
      bedarf.frei = Math.min(bedarf.frei, platz - rechts);
    }
    // Bruchteile gehen zugunsten dessen, was nicht gekürzt werden soll: Der Bedarf von Name und Typ wird aufgerundet,
    // der Platz, den Auftrag und Funkrufname lassen, abgerundet.
    const neu = werBreite({ herkunft: Math.ceil(bedarf.herkunft), typ: Math.ceil(bedarf.typ), frei: Math.floor(bedarf.frei) - 1 }, platz);
    setBreite((alt) => (alt === neu ? alt : neu));
  });
  return breite;
}

/**
 * Wie viele Einträge einer Liste ganz zu sehen sind; `null`, solange es nichts zu messen gibt (kein Layout). Die Liste
 * „Zuletzt" zeigt nur ganze Einträge, der Rest liegt in einer unsichtbaren Spalte (lagetafel.css): Wie viele es sind,
 * weiß erst der Browser, und die Überschrift soll es sagen, statt still abzuschneiden.
 */
function useGanzSichtbar(liste: RefObject<HTMLElement | null>): number | null {
  const [zahl, setZahl] = useState<number | null>(null);
  const zaehlen = () => {
    const el = liste.current;
    const rahmen = el?.getBoundingClientRect();
    // Ohne Breite gibt es kein Layout (Testumgebung). Eine Liste ohne Höhe dagegen ist gemessen: Es passt kein Eintrag.
    // Die Unterscheidung ist nötig: Sonst spränge die Überschrift zwischen „unbekannt" und „keiner" hin und her.
    if (!el || !rahmen || !(rahmen.width > 0)) return setZahl(null);
    let ganz = 0;
    for (const kind of Array.from(el.children)) {
      const k = kind.getBoundingClientRect();
      if (k.left < rahmen.right - 1 && k.bottom <= rahmen.bottom + 0.5) ganz++;
    }
    setZahl((alt) => (alt === ganz ? alt : ganz));
  };
  // Nach jedem Durchgang (neue Bewegung, andere Höhe der Nachbarn) und bei jeder Größenänderung der Liste.
  useLayoutEffect(zaehlen);
  useEffect(() => {
    const el = liste.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const beobachter = new ResizeObserver(zaehlen);
    beobachter.observe(el);
    return () => beobachter.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liste.current]);
  return zahl;
}

const einheitenWort = (n: number) => (n === 1 ? "Einheit" : "Einheiten");

type Zeichensammlung = Awaited<ReturnType<typeof zeichenLaden>>;
/** Die nachgeladene Zeichensammlung und die schon zugerichteten Zeichen: Jedes Zeichen wird einmal gebaut. */
let sammlung: Zeichensammlung | null = null;
const zeichenVorrat = new Map<string, string>();

/** Durchsichtiges Rechteck im Format des Zeichens: hält den Platz, bis die Sammlung geladen ist. */
const ZEICHEN_LEER = "data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20256%20172%22%2F%3E";

/**
 * Taktisches Zeichen der Einheit auf heller Unterlage, auf das Band des Zeichens beschnitten (`zeichenFuerTafel`).
 * Die Sammlung (rund 340 KB) kommt wie in `zeichen-bild.tsx` erst bei Bedarf.
 */
function TafelZeichen({ einheit }: { einheit: Einheit }) {
  const [geladen, setGeladen] = useState(sammlung != null);
  useEffect(() => {
    if (sammlung) return;
    let aktiv = true;
    zeichenLaden().then(
      (b) => {
        sammlung = b;
        if (aktiv) setGeladen(true);
      },
      () => undefined,
    );
    return () => {
      aktiv = false;
    };
  }, []);
  // Das Zeichen hängt an Organisation und Einheitentyp, nicht an der einzelnen Meldung.
  const schluessel = `${einheit.organisation}|${einheit.einheitsTyp?.code ?? ""}|${einheit.einheitsTyp?.freitext ?? ""}`;
  let url = zeichenVorrat.get(schluessel);
  if (!url && geladen && sammlung) {
    url = sammlung.svgDataUrl(zeichenFuerTafel(sammlung.einheitSymbolSvg(einheit)));
    zeichenVorrat.set(schluessel, url);
  }
  return <img src={url ?? ZEICHEN_LEER} alt="" aria-hidden="true" data-zeichen={url ? "geladen" : "laedt"} />;
}

function staerkeAnsage(s: Staerke): string {
  return `Stärke: ${s.fuehrer} Führer, ${s.unterfuehrer} Unterführer, ${s.mannschaft} Mannschaft, gesamt ${s.gesamt}`;
}

/** Die Stärkemeldung als Schriftbild: „5 / 25 / 85 // 115", die Gesamtstärke unterstrichen, jede Zahl mit ihrem Wort. */
function StaerkeGross({ s }: { s: Staerke }) {
  return (
    <div className="lt-meldung" role="group" aria-label={staerkeAnsage(s)}>
      {/* Das Wort hängt unter seiner Zahl, ohne ihre Breite zu bestimmen: Die Striche stehen so eng wie geschrieben. */}
      <span className="lt-m-zahl" aria-hidden="true"><span className="lt-m-ziffern">{s.fuehrer}</span><span className="lt-m-wort">Führer</span></span>
      <span className="lt-m-strich" aria-hidden="true">/</span>
      <span className="lt-m-zahl" aria-hidden="true"><span className="lt-m-ziffern">{s.unterfuehrer}</span><span className="lt-m-wort">Unterführer</span></span>
      <span className="lt-m-strich" aria-hidden="true">/</span>
      <span className="lt-m-zahl" aria-hidden="true"><span className="lt-m-ziffern">{s.mannschaft}</span><span className="lt-m-wort">Mannschaft</span></span>
      <span className="lt-m-strich" aria-hidden="true">//</span>
      <span className="lt-m-zahl lt-m-gesamt" aria-hidden="true"><span className="lt-m-ziffern">{s.gesamt}</span><span className="lt-m-wort">gesamt</span></span>
    </div>
  );
}

/** Stärke einer Einheit oder Gruppe in der Schreibweise der Meldung, die Gesamtstärke hervorgehoben. */
function StaerkeKlein({ s, soll }: { s: Staerke; soll?: boolean }) {
  return (
    <span className="lt-staerke" role="group" aria-label={staerkeAnsage(s) + (soll ? " (Sollstärke, nicht gemeldet)" : "")}>
      {soll && <abbr className="lt-soll" title="Sollstärke, nicht gemeldet">S</abbr>}
      <span className="lt-fum" aria-hidden="true">{s.fuehrer}/{s.unterfuehrer}/{s.mannschaft}//</span>
      <b aria-hidden="true">{s.gesamt}</b>
    </span>
  );
}

/**
 * Typ der Einheit. Abgeschnitten wird er nie: In der knappen Fassung steht die Kurzform; sonst der ausgeschriebene
 * Typ, und wo dessen Zeile zu kurz ist, die Kurzform an seiner Stelle. Die Wahl trifft die Stilvorlage ohne Messung
 * (`.lt-typ-wahl` in lagetafel.css): Der lange Name deckt die Kurzform zu, solange er in die Zeile passt.
 */
function Typ({ e, fassung }: { e: TafelEinheit; fassung: KartenFassung }) {
  if (!e.typ) return null;
  if (fassung === "zwei") return <span className="lt-typ">{e.typKurz}</span>;
  if (e.typKurz === e.typ) return <span className="lt-typ">{e.typ}</span>;
  return (
    <span className="lt-typ lt-typ-wahl">
      <span className="lt-typ-kurz" aria-hidden="true">{e.typKurz}</span>
      <span className="lt-typ-anker" />
      <span className="lt-typ-lang">{e.typ}</span>
    </span>
  );
}

/**
 * Herkunft in zwei Teilen, Organisation und Standort. Reicht die Zeile nicht, wird der längere Teil gekürzt und der
 * kürzere bleibt ganz: bei „Johanniter-Unfall-Hilfe … Oldenburg" die Organisation, damit der Ort bleibt, der sonst
 * gleichnamige Karten unterscheidet; bei „THW Clausthal-Zellerfeld" der Ort.
 */
function Herkunft({ e }: { e: TafelEinheit }) {
  const organisation = e.ort ? e.herkunft.slice(0, e.herkunft.length - e.ort.length - 1) : "";
  if (!organisation) {
    return (
      <span className="lt-herkunft">
        <span className="lt-teil-weich">{e.herkunft}</span>
      </span>
    );
  }
  const ortWeich = e.ort.length > organisation.length;
  return (
    <span className="lt-herkunft">
      <span className={ortWeich ? "lt-teil-fest" : "lt-teil-weich"}>{organisation}</span>{" "}
      <span className={ortWeich ? "lt-teil-weich" : "lt-teil-fest"}>{e.ort}</span>
    </span>
  );
}

/**
 * Funkrufname. Die Kennziffer am Ende unterscheidet die Fahrzeuge („22/51"); Kennwort und Ort davor wiederholen meist
 * die Herkunft. Gekürzt wird deshalb vorn, die Kennziffer bleibt stehen.
 */
function Funkruf({ name }: { name: string }) {
  const teile = /^(.*\S)\s+(\S*\d\S*)$/.exec(name);
  return (
    <span className="lt-funkruf">
      {teile ? (
        <>
          <span className="lt-teil-weich">{teile[1]}</span> <span className="lt-teil-fest">{teile[2]}</span>
        </>
      ) : (
        <span className="lt-teil-weich">{name}</span>
      )}
    </span>
  );
}

function Karte({ e, fassung, jetzt }: { e: TafelEinheit; fassung: KartenFassung; jetzt: number }) {
  return (
    <li className="lt-karte" data-marke={e.marke?.art} data-achtung={e.bedarf.length > 0 || undefined}>
      <span className="lt-zeichen">
        <TafelZeichen einheit={e.einheit} />
      </span>
      {/* Name und Stärke teilen sich die erste Zeile unter sich: Der Name reicht bis an die Stärke, wie breit der Stand darunter auch ist. */}
      <span className="lt-kopfzeile">
        <Herkunft e={e} />
        <StaerkeKlein s={e.staerke} soll={e.soll} />
      </span>
      <Typ e={e} fassung={fassung} />
      {/* Funkrufname, Auftrag und Marken: in der Fassung „drei" zusammen die dritte Zeile, sonst je ein Feld der Karte (lagetafel.css). */}
      {(e.funkruf || e.auftrag || e.marke || e.bedarf.length > 0) && (
        <span className="lt-wie">
          {e.funkruf && <Funkruf name={e.funkruf} />}
          {e.auftrag && (
            <span className="lt-auftrag">
              <span className="lt-auftrag-text">{e.auftrag}</span>
            </span>
          )}
          {(e.marke || e.bedarf.length > 0) && (
            <span className="lt-marken">
              {e.marke && <span className={`lt-marke lt-marke-${e.marke.art}`}>{e.marke.text}</span>}
              {e.bedarf.length > 0 && <span className="lt-marke lt-marke-achtung">{e.bedarf.join(", ")}</span>}
            </span>
          )}
        </span>
      )}
      {/* Der Stand der Angaben steht an jeder Einheit, immer mit seinem Wort (eine nackte Uhrzeit neben „Ruhezeit" läse sich
          als deren Beginn) und ohne Warnfarbe: Bernstein mit Zeichen gehört dem Bedarf. Wie viele Stände alt sind, sagt die
          Randspalte einmal gesammelt. */}
      <span className="lt-stand">
        <span className="lt-stand-wort">Stand </span>
        {uhrzeitText(e.stand, jetzt)}
      </span>
    </li>
  );
}

function Zelle({ zelle, tb, fassung, jetzt }: { zelle: TafelZelle; tb: Tafelbild; fassung: KartenFassung; jetzt: number }) {
  switch (zelle.art) {
    case "kopf": {
      const g = tb.gruppen[zelle.gruppe]!;
      return (
        <li className="lt-gruppe">
          {/* Ein langer Name wird gekürzt, „(Fortsetzung)" bleibt stehen: Es sagt, dass die Gruppe weiter vorn beginnt. */}
          <h3>
            <span className="lt-gruppe-name">{g.titel}</span>
            {zelle.fortsetzung && <> <span className="lt-fortsetzung">(Fortsetzung)</span></>}
          </h3>
          <span className="lt-gruppe-zahl">{g.einheiten.length} {einheitenWort(g.einheiten.length)}</span>
          <StaerkeKlein s={g.staerke} />
        </li>
      );
    }
    case "einheit":
      return <Karte e={tb.gruppen[zelle.gruppe]!.einheiten[zelle.index]!} fassung={fassung} jetzt={jetzt} />;
    case "abgang-kopf":
      return (
        <li className="lt-gruppe lt-gruppe-ab">
          <h3>
            <span className="lt-gruppe-name">Abgerückt</span>
            {zelle.fortsetzung && <> <span className="lt-fortsetzung">(Fortsetzung)</span></>}
          </h3>
          <span className="lt-gruppe-zahl">{tb.abgerueckt.length} {einheitenWort(tb.abgerueckt.length)}</span>
        </li>
      );
    case "abgang": {
      const a = tb.abgerueckt[zelle.index]!;
      return (
        <li className="lt-abgang">
          <span className="lt-abgang-zeit">{a.zeit != null ? uhrzeitText(a.zeit, jetzt) : "–"}</span>
          <span className="lt-abgang-name">{a.name}</span>
        </li>
      );
    }
    case "abgang-rest":
      return (
        <li className="lt-abgang">
          <span className="lt-abgang-rest">+ {zelle.anzahl} weitere</span>
        </li>
      );
  }
}

function zellenSchluessel(z: TafelZelle, tb: Tafelbild): string {
  switch (z.art) {
    case "kopf":
      return `k:${tb.gruppen[z.gruppe]!.schluessel}:${z.fortsetzung ? "f" : "a"}`;
    case "einheit":
      return `e:${tb.gruppen[z.gruppe]!.einheiten[z.index]!.id}`;
    case "abgang-kopf":
      return `ak:${z.fortsetzung ? "f" : "a"}`;
    case "abgang":
      return `a:${tb.abgerueckt[z.index]!.id}`;
    case "abgang-rest":
      return "a:rest";
  }
}

/** Eine Bewegung der letzten Minuten für die Randspalte: Uhrzeit, was, wer. */
function BewegungZeile({ b, name, jetzt }: { b: Bewegung; name: string; jetzt: number }) {
  return (
    <li className="lt-bewegung">
      <span className="lt-bewegung-zeit">{uhrzeitText(b.zeit, jetzt)}</span>
      {/* Eine Folgemeldung nennt gleich, was sich geändert hat („Stärke 8 → 6 (−2)"): zwei Zeilen statt drei, damit mehr Einträge in die Spalte passen. */}
      <span className="lt-bewegung-art">{b.detail ?? b.art}</span>
      <span className="lt-bewegung-name">{name}</span>
      {b.nachgetragen != null && <span className="lt-bewegung-zusatz">nachgetragen, da seit {uhrzeitText(b.nachgetragen, jetzt)}</span>}
    </li>
  );
}

export default function Lagetafel({ einsatz, jetzt, beginn, funkruf, staleSeit, stufe, bedienung }: LagetafelProps) {
  const tb = tafelbild(einsatz, jetzt);
  const bild = tb.bild;
  const s = bild.summen;
  const zeit = new Date(jetzt);
  const uhr = uhrTeile(zeit);
  const dtg = dtgTeile(zeit);

  const schmal = useSchmal();
  const flaeche = useRef<HTMLDivElement>(null);
  const masse = useFlaeche(flaeche);
  const zaehlung = tb.gruppen.map((g) => `${g.kopf ? "k" : "o"}${g.einheiten.length}`).join(",");
  const abgaenge = tb.abgerueckt.length;
  // Auf halbe Schriftbreiten gerundet: Ein Zeichen mehr im Auftrag soll den Satz nicht neu rechnen lassen.
  const halbe = (em: number) => Math.ceil(em * 2) / 2;
  const bedarf = { breit: halbe(tb.bedarf.breit), drei: halbe(tb.bedarf.drei), zwei: halbe(tb.bedarf.zwei) };
  // Der Satz hängt nur an Zahl und Gliederung der Einheiten und an der Fläche, nicht an jedem Takt der Uhr.
  const satz = useMemo(
    () =>
      schmal || !masse
        ? null
        : tafelSatz(tb.gruppen.map((g) => ({ kopf: g.kopf, anzahl: g.einheiten.length })), abgaenge, masse, bedarf),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [schmal, masse, zaehlung, abgaenge, bedarf.breit, bedarf.drei, bedarf.zwei],
  );
  // Ohne Messung (kein Layout) und am Telefon: alles in einer Spalte, die Seite rollt.
  const seiten = satz ? satz.seiten : [[tafelFortlaufend(tb.gruppen.map((g) => ({ kopf: g.kopf, anzahl: g.einheiten.length })), abgaenge)]];
  const fassung: KartenFassung = satz ? satz.fassung : "drei";

  const wer = useWerBreite(flaeche, satz?.fassung === "breit");

  // Blättern. Ändert sich die Zahl der Seiten, beginnt die Tafel vorn: Takt und Balken laufen dann gemeinsam neu los,
  // und nach einer Lage, die auf eine Seite passte, steht wieder Seite 1 da.
  const seitenZahl = seiten.length;
  const [lauf, setLauf] = useState({ seiten: seitenZahl, blatt: 0 });
  if (lauf.seiten !== seitenZahl) setLauf({ seiten: seitenZahl, blatt: 0 });
  useEffect(() => {
    if (seitenZahl < 2) return;
    const t = window.setInterval(() => setLauf((l) => ({ ...l, blatt: l.blatt + 1 })), SEITEN_TAKT_MS);
    return () => window.clearInterval(t);
  }, [seitenZahl]);
  const blatt = lauf.seiten === seitenZahl ? lauf.blatt : 0;
  const seite = blatt % seitenZahl;

  // Welche Gruppen auf welcher Seite stehen: für die Seitenzeile („THW bis DRK").
  const gruppenDer = (i: number): number[] => {
    const nummern = new Set<number>();
    for (const z of (seiten[i] ?? []).flat()) if (z.art === "kopf" || z.art === "einheit") nummern.add(z.gruppe);
    return [...nummern].sort((a, b) => a - b);
  };
  const spanne = (i: number): string | null => {
    const mitKopf = gruppenDer(i).filter((g) => tb.gruppen[g]?.kopf);
    if (mitKopf.length === 0) return null;
    const von = tb.gruppen[mitKopf[0]!]!.titel;
    const bis = tb.gruppen[mitKopf[mitKopf.length - 1]!]!.titel;
    return von === bis ? von : `${von} bis ${bis}`;
  };
  const hier = seitenZahl > 1 ? spanne(seite) : null;
  const weiter = seitenZahl > 1 ? spanne((seite + 1) % seitenZahl) : null;

  // Abgerückte Einheiten: Sind noch Einheiten da, nennt die Randspalte die letzten mit Uhrzeit; sonst stehen sie auf der Tafel.
  const abgaengeAmRand = s.einheiten > 0 ? tb.abgerueckt.slice(0, ABGAENGE_AM_RAND) : [];
  // „Zuletzt" führt, was am Platz markiert ist und wieder kam; Abgänge stehen im eigenen Block darüber.
  const bewegungen = bild.bewegungen.filter((b) => b.art !== "Abgerückt");
  const zuletzt = useRef<HTMLUListElement>(null);
  const zuletztSichtbar = useGanzSichtbar(zuletzt);

  const dauer = dauerZeile(beginn, bild, jetzt);
  const uebungTeil = bild.uebungenDaneben > 0 ? `${bild.uebungenDaneben} ${bild.uebungenDaneben === 1 ? "Übungsmeldung" : "Übungsmeldungen"} nicht gezählt` : "";
  const letzteAlt = bild.letzteMeldung != null && jetzt - bild.letzteMeldung >= VERALTET_MS;
  const alterAnwesende = bild.zeitenPruefen ? null : anwesendenAlterText(bild.anwesendenAlter, jetzt);
  const leerText =
    bild.abgerueckt > 0
      ? "Alle Einheiten sind abgerückt."
      : bild.uebungenDaneben > 0
        ? `Keine Einheit in der Lage (${bild.uebungenDaneben} Übung, nicht gezählt).`
        : "Noch keine Einheit gemeldet.";

  const stil = {
    "--lt-karte-h": SATZ.karte[fassung].hoehe,
    "--lt-kopf-h": SATZ.kopf,
    "--lt-absatz": SATZ.absatz,
    "--lt-fuge": SATZ.fuge,
    "--lt-abgang-h": SATZ.abgang,
    "--lt-spalten": satz?.spalten ?? 1,
    "--lt-seitenzeile": SATZ.seitenzeile,
    "--lt-zeichen": SATZ.zeichen,
    "--lt-wer": wer != null ? `${wer}px` : `${SATZ.wer.vorgabe * 100}%`,
    // Für die schmale Darstellung: Die Stärkemeldung richtet ihre Schrift nach der Zahl ihrer Ziffern, statt aus dem Bild zu ragen.
    "--lt-m-ziffern": `${s.staerke.fuehrer}${s.staerke.unterfuehrer}${s.staerke.mannschaft}${s.staerke.gesamt}`.length,
    ...(satz ? { "--lt-f": `${satz.schrift}px` } : {}),
  } as CSSProperties;

  return (
    <main className={`lt lt-${stufe}`} style={stil} data-fassung={fassung} data-satz={satz ? "gesetzt" : "fortlaufend"}>
      {(bild.uebung || staleSeit != null) && (
        <div className="lt-hinweise">
          {bild.uebung && <div className="lt-uebung" role="status">ÜBUNG – keine Echtlage</div>}
          {staleSeit != null && (
            <div className="lt-unlesbar" role="alert">
              Sammlung nicht lesbar – letzter Stand von {new Date(staleSeit).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} Uhr;
              Hauptfenster: „Daten sichern…“
            </div>
          )}
        </div>
      )}

      <header className="lt-kopf">
        <div className="lt-wo">
          {/* Wie in der Zeilenansicht: erst der eigene Funkrufname, darunter der Einsatz; ohne Funkrufname rückt der Einsatz nach oben. */}
          <h1>{funkruf ?? einsatz.name}</h1>
          {(funkruf || bild.ort?.trim()) && (
            <p className="lt-einsatz">
              {funkruf && <span className="lt-einsatz-name">{einsatz.name}</span>}
              {bild.ort?.trim() && <span className="lt-ort">{bild.ort.trim()}</span>}
            </p>
          )}
        </div>
        <div className="lt-staerke-gross">
          <StaerkeGross s={s.staerke} />
          {/* Nur in der schmalen Darstellung: Dort stehen die Wörter nicht unter den Zahlen (sie liefen ineinander), sondern als eine Zeile darunter. */}
          <p className="lt-m-legende" aria-hidden="true">Führer / Unterführer / Mannschaft // gesamt</p>
          {/* Reine Sollstärke steckt in der Gesamtstärke: Der Vorbehalt gehört an die Zahl, die vorgelesen wird (R9-K1). */}
          {bild.sollstaerke.einheiten > 0 && <p className="lt-vorbehalt">davon {bild.sollstaerke.personen} Sollstärke (S), nicht gemeldet</p>}
        </div>
        <div className="lt-uhr" aria-label="Uhrzeit und Datum">
          <strong>{uhr.zeit}</strong>
          <span className="lt-datum">{wochentag(zeit)}, {uhr.datum}</span>
          {/* Die Zeitgruppe zum Abschreiben auf den Meldevordruck. */}
          <span className="lt-dtg">DTG {dtg.tag}{dtg.zeit}{dtg.monat}{dtg.jahr}</span>
        </div>
      </header>

      <section className="lt-tafel" aria-labelledby="lt-tafel-titel">
        <h2 id="lt-tafel-titel" className="nur-sr">Einheiten</h2>
        {/* Über der Fläche, nicht in ihr: Der Satz rechnet mit der Höhe, die für die Zellen wirklich bleibt. */}
        {s.einheiten === 0 && (
          <div className="lt-leer-block">
            <p className="lt-leer">{leerText}</p>
            {/* Der Monitor ist reine Anzeige: Wer davorsteht, soll wissen, dass er nichts tun muss. */}
            <p className="lt-leer-zusatz">Was im Hauptfenster aufgenommen wird, erscheint hier von selbst.</p>
          </div>
        )}
        <div className="lt-flaeche" ref={flaeche}>
          {seiten.map((spalten, i) =>
            i === seite ? (
              <div className="lt-seite" key={i}>
                {spalten.map((zellen, j) => (
                  <ul className="lt-spalte" key={j}>
                    {zellen.map((z) => (
                      <Zelle key={zellenSchluessel(z, tb)} zelle={z} tb={tb} fassung={fassung} jetzt={jetzt} />
                    ))}
                  </ul>
                ))}
              </div>
            ) : null,
          )}
          {seiten.length > 1 && (
            // Der Balken läuft je Seite einmal durch: Wer „seine" Einheit sucht, sieht, wann umgeblättert wird.
            <p className="lt-seitenzeile" role="status" key={`${seitenZahl}:${blatt}`}>
              <span className="lt-seitenlauf" style={{ animationDuration: `${SEITEN_TAKT_MS}ms` }} aria-hidden="true" />
              Seite {seite + 1} von {seiten.length}
              {hier ? (
                <span className="lt-seitenhinweis">
                  : {hier}
                  {weiter && weiter !== hier && <> · weiter mit {weiter}</>}
                </span>
              ) : (
                <span className="lt-seitenhinweis"> – die Tafel blättert von selbst</span>
              )}
            </p>
          )}
        </div>
      </section>

      <aside className="lt-rand" aria-label="Lage, Bedarf und letzte Bewegungen">
        <dl className="lt-zaehler">
          <div>
            <dt>{einheitenWort(s.einheiten)}</dt>
            <dd>{s.einheiten}</dd>
          </div>
          <div>
            <dt>{s.fahrzeuge === 1 ? "Fahrzeug" : "Fahrzeuge"}</dt>
            <dd>{s.fahrzeuge}</dd>
          </div>
          {bild.abgerueckt > 0 && abgaengeAmRand.length === 0 && (
            <div className="lt-zaehler-ab">
              <dt>abgerückt</dt>
              <dd>{bild.abgerueckt}</dd>
            </div>
          )}
        </dl>
        {dauer && <p className="lt-dauer">{dauer}</p>}
        {uebungTeil && <p className="lt-dauer">{uebungTeil}</p>}

        {bild.einheiten.length > 0 && (
          <section className="lt-block" aria-labelledby="lt-bedarf-titel">
            <h2 id="lt-bedarf-titel">Bedarf</h2>
            <ul className="lt-bedarf">
              {bedarfTeile(bild.bedarf).map((t) => (
                <li key={t.text} className={t.dringend ? "lt-dringend" : undefined}>{t.text}</li>
              ))}
            </ul>
          </section>
        )}

        {/* Wer abgerückt ist, steht hier verlässlich mit Uhrzeit: unabhängig davon, wie voll die Tafel ist, und länger als
            die Viertelstunde von „Zuletzt". Sonst ließe sich „Ist die Fachgruppe noch da?" nicht von der Tafel beantworten. */}
        {abgaengeAmRand.length > 0 && (
          <section className="lt-block lt-block-ab" aria-labelledby="lt-ab-titel">
            <h2 id="lt-ab-titel">
              Abgerückt <span className="lt-block-zusatz">{tb.abgerueckt.length} {einheitenWort(tb.abgerueckt.length)}</span>
            </h2>
            <ul className="lt-abgaenge">
              {abgaengeAmRand.map((a) => (
                <li key={a.id}>
                  <span className="lt-ab-zeit">{a.zeit != null ? uhrzeitText(a.zeit, jetzt) : "–"}</span>
                  <span className="lt-ab-name">{a.name}</span>
                </li>
              ))}
              {tb.abgerueckt.length > abgaengeAmRand.length && <li className="lt-ab-rest">+ {tb.abgerueckt.length - abgaengeAmRand.length} weitere</li>}
            </ul>
          </section>
        )}

        {bewegungen.length > 0 && (
          <section className="lt-block lt-block-zuletzt" aria-labelledby="lt-zuletzt-titel">
            {/* Zu sehen sind nur so viele Einträge, wie in die Spalte passen: Die Überschrift sagt, wie viele von wie vielen. */}
            <h2 id="lt-zuletzt-titel">
              Zuletzt{" "}
              <span className="lt-block-zusatz">
                {zuletztSichtbar != null && zuletztSichtbar > 0 && zuletztSichtbar < bewegungen.length ? `${zuletztSichtbar} von ${bewegungen.length}` : bewegungen.length} in {BEWEGUNG_FENSTER_MS / 60_000} Min
                {/* Passt kein Eintrag in die Spalte, verweist die Überschrift auf die Karten: Jede dieser Bewegungen ist dort markiert. */}
                {zuletztSichtbar === 0 && " · siehe Karten"}
              </span>
            </h2>
            {/* Was nicht mehr in die Spalte passt, bricht in eine zweite um, die nicht zu sehen ist: Es stehen nur ganze Einträge da. */}
            <ul className="lt-bewegungen" ref={zuletzt}>
              {bewegungen.map((b) => (
                <BewegungZeile key={b.id} b={b} name={tb.namen.get(b.eintrag) ?? b.name} jetzt={jetzt} />
              ))}
            </ul>
          </section>
        )}

        <div className="lt-fuss">
          {(bild.zeitenPruefen || bild.letzteMeldung != null) && (
            <p className={`lt-datenstand${bild.zeitenPruefen || letzteAlt ? " lt-warnung" : ""}`}>
              {bild.zeitenPruefen ? "Meldezeiten liegen in der Zukunft – Zeiten prüfen (Geräteuhr?)" : `letzte Meldung ${alterText(bild.letzteMeldung!, jetzt)}`}
            </p>
          )}
          {alterAnwesende && <p className="lt-datenstand lt-warnung">{alterAnwesende}</p>}
          <div className="lt-bedienung">{bedienung}</div>
        </div>
      </aside>
    </main>
  );
}
