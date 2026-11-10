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
 *  2. **Jede Einheit hat ihren Platz.** Geordnet wird nach Zug und
 *     Eintreffzeit, nicht nach der letzten Meldung. Was sich ändert, wird am
 *     Platz markiert (`lagetafel.ts`).
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
import { alterText, anwesendenAlterText, dtgTeile, uhrTeile, uhrzeitText, type Bewegung } from "./lagemonitor";
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
  zeichenFuerTafel,
} from "./lagetafel";
import { zeichenLaden } from "./zeichen-bild";

/** So lange steht eine Seite, bevor die Tafel weiterblättert. */
export const SEITEN_TAKT_MS = 12_000;
/** Ab diesem Alter der letzten Meldung wird der Datenstand abgesetzt (wie in der Zeilenansicht, R7-K8). */
const VERALTET_MS = 60 * 60_000;
/**
 * Unter dieser Fenstergröße läuft die Tafel als eine Spalte zum Rollen: Telefon, flaches Querformat und Hochformat
 * (im Hochformat schrumpfte das am Querformat bemessene Bild sonst auf unlesbare Schrift). Dieselbe Abfrage wie in lagetafel.css.
 */
const SCHMAL = "(max-width: 640px), (max-height: 480px), (max-aspect-ratio: 6/5)";

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

function Karte({ e, fassung, jetzt }: { e: TafelEinheit; fassung: KartenFassung; jetzt: number }) {
  return (
    <li className="lt-karte" data-marke={e.marke?.art} data-achtung={e.bedarf.length > 0 || undefined}>
      <span className="lt-zeichen">
        <TafelZeichen einheit={e.einheit} />
      </span>
      <span className="lt-herkunft">{e.herkunft}</span>
      <StaerkeKlein s={e.staerke} soll={e.soll} />
      <Typ e={e} fassung={fassung} />
      {e.funkruf && <span className="lt-funkruf">{e.funkruf}</span>}
      {e.auftrag && <span className="lt-auftrag">{e.auftrag}</span>}
      {(e.marke || e.bedarf.length > 0) && (
        <span className="lt-marken">
          {e.marke && <span className={`lt-marke lt-marke-${e.marke.art}`}>{e.marke.text}</span>}
          {e.bedarf.length > 0 && <span className="lt-marke lt-marke-achtung">{e.bedarf.join(", ")}</span>}
        </span>
      )}
      {/* Der Stand der Angaben steht an jeder Einheit; ab einer Stunde in Warnfarbe und mit Zeichen (wie R11-K1, R14-K1). */}
      <span className={`lt-stand${e.standAlt ? " lt-stand-alt" : ""}`} title={e.standAlt ? "Der Stand der Angaben ist älter als eine Stunde" : undefined}>
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
          <h3>
            {g.titel}
            {zelle.fortsetzung && <span className="lt-fortsetzung"> (Fortsetzung)</span>}
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
            Abgerückt
            {zelle.fortsetzung && <span className="lt-fortsetzung"> (Fortsetzung)</span>}
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
      <span className="lt-bewegung-art">{b.art}</span>
      <span className="lt-bewegung-name">{name}</span>
      {/* Der Zusatz steht in eigener Zeile: „Stärke 8 → 6 (−2)" bricht sonst mitten im Pfeil um. */}
      {b.nachgetragen != null && <span className="lt-bewegung-zusatz">nachgetragen, da seit {uhrzeitText(b.nachgetragen, jetzt)}</span>}
      {b.detail && <span className="lt-bewegung-zusatz">{b.detail}</span>}
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
  // Der Satz hängt nur an Zahl und Gliederung der Einheiten und an der Fläche, nicht an jedem Takt der Uhr.
  const satz = useMemo(
    () =>
      schmal || !masse
        ? null
        : tafelSatz(tb.gruppen.map((g) => ({ kopf: g.kopf, anzahl: g.einheiten.length })), abgaenge, masse),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [schmal, masse, zaehlung, abgaenge],
  );
  // Ohne Messung (kein Layout) und am Telefon: alles in einer Spalte, die Seite rollt.
  const seiten = satz ? satz.seiten : [[tafelFortlaufend(tb.gruppen.map((g) => ({ kopf: g.kopf, anzahl: g.einheiten.length })), abgaenge)]];
  const fassung: KartenFassung = satz ? satz.fassung : "drei";

  const [blatt, setBlatt] = useState(0);
  useEffect(() => {
    if (seiten.length < 2) return;
    const t = window.setInterval(() => setBlatt((n) => n + 1), SEITEN_TAKT_MS);
    return () => window.clearInterval(t);
  }, [seiten.length]);
  const seite = blatt % seiten.length;

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
        <div className="lt-flaeche" ref={flaeche}>
          {s.einheiten === 0 && (
            <>
              <p className="lt-leer">{leerText}</p>
              {/* Der Monitor ist reine Anzeige: Wer davorsteht, soll wissen, dass er nichts tun muss. */}
              <p className="lt-leer-zusatz">Was im Hauptfenster aufgenommen wird, erscheint hier von selbst.</p>
            </>
          )}
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
            <p className="lt-seitenzeile" role="status" key={`s${seite}`}>
              <span className="lt-seitenlauf" style={{ animationDuration: `${SEITEN_TAKT_MS}ms` }} aria-hidden="true" />
              Seite {seite + 1} von {seiten.length}
              <span className="lt-seitenhinweis"> – die Tafel blättert von selbst</span>
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
          {bild.abgerueckt > 0 && (
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

        {bild.bewegungen.length > 0 && (
          <section className="lt-block lt-block-zuletzt" aria-labelledby="lt-zuletzt-titel">
            <h2 id="lt-zuletzt-titel">Zuletzt</h2>
            {/* Was nicht mehr in die Spalte passt, bricht in eine zweite um, die nicht zu sehen ist: Es stehen nur ganze Einträge da. */}
            <ul className="lt-bewegungen">
              {bild.bewegungen.map((b) => (
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
