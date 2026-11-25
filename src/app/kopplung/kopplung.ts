/**
 * Kopplung zweier Geräte am selben Meldekopf (neu im Meldekopf, ADR-009).
 *
 * Das Telefon scannt draußen, der Rechner im Fahrzeug zeigt die Übersicht:
 * Beide führen dieselbe Sammlung und schicken einander jeden geänderten Stand
 * über eine direkte Verbindung im lokalen Netz (verbindung.ts). Jedes Gerät
 * behält alles in seinem eigenen Speicher; reißt die Verbindung, arbeitet jedes
 * für sich weiter, und der nächste Code-Tausch gleicht ab.
 *
 * Dieses Modul hält die eine laufende Kopplung des Fensters zusammen:
 * Verbindung, Abgleich-Sitzung (sitzung.ts), Takt und den Zustand für die
 * Oberfläche (zustand.ts). Es lädt erst, wenn jemand koppelt.
 */

import { frageJaNein } from "@bos/oberflaeche/dialoge";
import { entwirreScanText } from "../eingang/tastaturbelegung";
import { SpeicherVollFehler } from "../eintrag-zeiten";
import { AbgleichSitzung } from "./sitzung";
import {
  KLOPFER,
  TUEREN,
  angebotAdressen,
  antwortAusFingerabdruck,
  fingerabdruckVon,
  kennwoerterAbleiten,
  klopfLesen,
  klopfZeichen,
  signalDekodieren,
  signalKodieren,
  tuerAngebote,
  tuerKennwoerter,
  tuerPortsLesen,
} from "./signal";
import { GETRENNT_SATZ as GETRENNT_HIER_SATZ } from "./texte";
import {
  angebotErzeugen,
  klopfen,
  kopplungMoeglich,
  tuerenOeffnen,
  rufPlatzVorbereiten,
  rufZertifikat,
  type Angebot,
  type RufPlatz,
  type Tueren,
  type Verbindung,
  type VerbindungsHorcher,
  type VerbindungsLage,
} from "./verbindung";
import { kopplungsStandMelden, kopplungsZustand, kopplungsZustandSetzen, kopplungsZustandZuruecksetzen } from "./zustand";

/** So oft schaut die Kopplung, ob sich der Stand dieses Geräts geändert hat. */
export const TAKT_MS = 1000;

export const KEIN_WEBRTC_SATZ = "Dieser Browser kann keine direkte Verbindung zu einem zweiten Gerät aufbauen.";
export const NICHT_ZUSTANDE_SATZ = "Die Verbindung kam nicht zustande. Sind beide Geräte im selben Netz (WLAN oder Hotspot)? Bitte neu koppeln.";
export const ANTWORT_STATT_ANGEBOT_SATZ =
  "Das ist ein Antwort-Code. Er gehört auf das Gerät, das die Kopplung begonnen hat (dort „Antwort scannen…“).";
export const ANGEBOT_STATT_ANTWORT_SATZ =
  "Das ist kein Antwort-Code. Hier wird der Code gebraucht, den das zweite Gerät nach dem Scannen zeigt.";

let sitzung: AbgleichSitzung | null = null;
/** Die Verbindung, über die gerade abgeglichen wird. */
let aktiv: Verbindung | null = null;
/** Erkennungsmarke der aktiven Verbindung: Ereignisse anderer Verbindungen gelten ihr nicht. */
let aktivMarke: object | null = null;
let angebot: Angebot | null = null;
/** Die erste Verbindung der Kopplung, aus dem Code-Tausch. */
let erste: Verbindung | null = null;
let ersteMarke: object | null = null;
let takt: ReturnType<typeof setInterval> | undefined;
/** Zählt jede neue Kopplung hoch: Ereignisse einer abgelösten Kopplung gelten nicht mehr. */
let lauf = 0;
let schnappschuss = "";
let wachsperre: { release: () => Promise<void> } | null = null;

// Wiederverbinden ohne neuen Code (verbindung.ts, „Rückruf-Plätze"). Das erste Gerät hört, das zweite ruft.
let rolle: "hoerer" | "rufer" | null = null;
/** Hörer: wartende Verbindungen, die das zweite Gerät anrufen kann. */
const plaetze = new Map<number, { angebot: Angebot; marke: object; beantwortet: boolean }>();
let platzNr = 0;
/** Rufer: Plätze des Hörers, zu denen dieses Gerät eine Antwort bereithält. */
let rufPlaetze: { nr: number; platz: RufPlatz }[] = [];
let zertifikat: Promise<RTCCertificate | undefined> | null = null;
let rufVersuch: { marke: object; platz: number; verbindung: Verbindung | null; uhr: ReturnType<typeof setTimeout> } | null = null;
let rufUhr: ReturnType<typeof setTimeout> | undefined;
let rufZahl = 0;
let aufgebenUhr: ReturnType<typeof setTimeout> | undefined;
let puls: ReturnType<typeof setInterval> | undefined;
let pulsZuletzt = 0;
let pongOffen: ReturnType<typeof setTimeout> | undefined;
/** Erstes Gerät: die Türen, an denen das zweite seinen Fingerabdruck anklopft (signal.ts, „Anklopfen"). */
let tueren: Tueren | null = null;
let tuerTakt: ReturnType<typeof setInterval> | undefined;
/** Erstes Gerät: Die Antwort des zweiten ist gesetzt (gescannt oder angeklopft); eine zweite gilt nicht mehr. */
let antwortGesetzt = false;

/** So oft liest das erste Gerät seine Türen. */
const TUER_TAKT_MS = 200;
/** Zweites Gerät: so viele Durchgänge des Anklopfens, falls einer nicht ankommt. */
const KLOPF_RUNDEN = 3;
/** Zweites Gerät: so lange wartet es nach einem Durchgang auf die Verbindung, bevor es noch einmal klopft. */
const KLOPF_WARTEN_MS = 6000;

/** So viele wartende Plätze hält der Hörer bereit. */
const PLAETZE = 2;
/** Kommt ein Anruf in dieser Zeit nicht durch, wird er abgebrochen und später wiederholt. */
const RUF_FRIST_MS = 15_000;
/** Pausen zwischen den Anrufen; danach bleibt es bei der letzten. */
const RUF_PAUSEN_MS = [1000, 3000, 5000, 10_000, 20_000, 30_000];
/** So lange heißt eine gerissene Verbindung „unterbrochen"; danach „getrennt", auch wenn das Gerät es weiter versucht. */
const AUFGEBEN_MS = 45_000;
/** Stand die Uhr dieses Fensters länger still, war das Gerät eingeschlafen: Die Verbindung wird geprüft. */
const SCHLAF_MS = 20_000;
/** So lange hat das andere Gerät Zeit, auf die Nachfrage zu antworten. */
const PONG_FRIST_MS = 3000;

function lesen(text: string): ReturnType<typeof signalDekodieren> {
  // Ein Handscanner mit falscher Tastaturbelegung verdreht den Code; das lässt sich zurückrechnen.
  const lesbar = (t: string) => {
    try {
      signalDekodieren(t);
      return true;
    } catch {
      return false;
    }
  };
  return signalDekodieren(entwirreScanText(text.trim(), lesbar));
}

/** Alles, was die App im Speicher hält, als ein Text: der billige Vorab-Vergleich vor dem Abdruck. */
function speicherSchnappschuss(): string {
  try {
    const s = globalThis.localStorage;
    const teile: string[] = [];
    for (let i = 0; i < s.length; i++) {
      const k = s.key(i);
      if (k?.startsWith("eeb.")) teile.push(k, s.getItem(k) ?? "");
    }
    return teile.join("\u0000");
  } catch {
    return String(Date.now());
  }
}

async function wachHalten(): Promise<void> {
  // Geht der Bildschirm des Telefons aus, friert der Browser die Seite ein und die Verbindung reißt.
  try {
    const sperre = (navigator as Navigator & { wakeLock?: { request: (art: "screen") => Promise<{ release: () => Promise<void> }> } }).wakeLock;
    if (!sperre || wachsperre || document.visibilityState !== "visible") return;
    wachsperre = await sperre.request("screen");
  } catch {
    /* nicht erlaubt oder nicht vorhanden: Die Kopplung läuft trotzdem, solange der Bildschirm an ist */
  }
}

function wachLassen(): void {
  void wachsperre?.release().catch(() => undefined);
  wachsperre = null;
}

function beiSichtwechsel(): void {
  if (document.visibilityState !== "visible") {
    wachsperre = null; // der Browser gibt die Sperre beim Verbergen selbst frei
    return;
  }
  const phase = kopplungsZustand().phase;
  if (phase === "verbunden" || phase === "unterbrochen") void wachHalten();
  aufgewacht();
}

function beiSeitenende(): void {
  // Das andere Gerät soll wissen, dass von hier niemand mehr anruft und niemand mehr wartet.
  aktiv?.sofortSenden({ art: "ende" });
}

function taktStoppen(): void {
  clearInterval(takt);
  takt = undefined;
}

function tuerenSchliessen(): void {
  clearInterval(tuerTakt);
  tuerTakt = undefined;
  tueren?.schliessen();
  tueren = null;
}

/**
 * Erstes Gerät: Türen lesen. Stehen die jüngsten {@link KLOPFER} Klopfer für einen Fingerabdruck mit stimmendem
 * Prüfbyte, ist das die Antwort des zweiten Geräts. Die jüngsten, weil ein zweiter Durchgang auf einen misslungenen folgt.
 */
async function tuerenLesen(nr: number): Promise<void> {
  const t = tueren;
  const a = angebot;
  if (!t || !a || antwortGesetzt || nr !== lauf) return;
  const klopfer = await t.lesen();
  if (klopfer.length < KLOPFER || antwortGesetzt || nr !== lauf || angebot !== a) return;
  const fp = klopfLesen(klopfer.slice(-KLOPFER).map((k) => k.tuer));
  if (!fp) return;
  antwortGesetzt = true;
  try {
    await a.antwortAnnehmen(antwortAusFingerabdruck(fp, a.sdp, await kennwoerterAbleiten(a.sdp)));
  } catch {
    antwortGesetzt = false;
  }
}

/**
 * Zweites Gerät: den eigenen Fingerabdruck an die Türen des ersten klopfen. Antwortet eine Tür nicht, sind die Türen
 * von hier nicht erreichbar: Dann bleibt der Antwort-Code im Dialog der Weg.
 */
async function anklopfen(nr: number, fingerabdruck: Uint8Array, tuerSdps: readonly string[]): Promise<void> {
  const zeichen = klopfZeichen(fingerabdruck);
  const laeuft = () => nr === lauf && kopplungsZustand().phase === "verbindet";
  for (let runde = 0; runde < KLOPF_RUNDEN && laeuft(); runde++) {
    for (const z of zeichen) {
      if (!laeuft()) return;
      const sdp = tuerSdps[z];
      if (!sdp || !(await klopfen(sdp))) {
        if (laeuft()) {
          const d = kopplungsZustand().dialog;
          if (d) kopplungsZustandSetzen({ dialog: { ...d, selbst: false } });
        }
        return;
      }
    }
    await new Promise((r) => setTimeout(r, KLOPF_WARTEN_MS));
  }
  if (laeuft()) {
    const d = kopplungsZustand().dialog;
    if (d) kopplungsZustandSetzen({ dialog: { ...d, selbst: false } });
  }
}

function rufenStoppen(): void {
  clearTimeout(rufUhr);
  rufUhr = undefined;
  if (rufVersuch) {
    clearTimeout(rufVersuch.uhr);
    const v = rufVersuch.verbindung;
    rufVersuch = null;
    v?.schliessen();
  }
}

function aufraeumen(): void {
  taktStoppen();
  rufenStoppen();
  tuerenSchliessen();
  antwortGesetzt = false;
  clearTimeout(aufgebenUhr);
  clearTimeout(pongOffen);
  pongOffen = undefined;
  clearInterval(puls);
  puls = undefined;
  wachLassen();
  document.removeEventListener("visibilitychange", beiSichtwechsel);
  window.removeEventListener("pagehide", beiSeitenende);
  window.removeEventListener("online", aufgewacht);
  const v = aktiv;
  const e = erste;
  aktiv = null;
  aktivMarke = null;
  angebot = null;
  erste = null;
  ersteMarke = null;
  sitzung = null;
  rolle = null;
  zertifikat = null;
  v?.schliessen();
  e?.schliessen();
  for (const p of plaetze.values()) p.angebot.verbindung.schliessen();
  plaetze.clear();
  for (const p of rufPlaetze) p.platz.verwerfen();
  rufPlaetze = [];
  rufZahl = 0;
}

/** Kann sich dieses Gerät ohne neuen Code wieder verbinden? */
function wiederverbindbar(): boolean {
  if (rolle === "hoerer") return [...plaetze.values()].some((p) => p.beantwortet);
  return rolle === "rufer" && rufPlaetze.some((p) => p.platz.nutzbar());
}

/** Hörer: genug wartende Plätze bereithalten und dem zweiten Gerät anbieten. */
function plaetzeAuffuellen(nr: number): void {
  if (rolle !== "hoerer" || nr !== lauf) return;
  // Angebote, auf die noch keine Antwort kam (die Verbindung riss dazwischen), gehen noch einmal hinaus.
  for (const [platz, p] of plaetze) if (!p.beantwortet) void aktiv?.senden({ art: "platz", nr: platz, sdp: p.angebot.sdp }).catch(() => undefined);
  for (let i = plaetze.size; i < PLAETZE; i++) {
    const platz = ++platzNr;
    const marke = {};
    void angebotErzeugen(horcher(nr, marke)).then(
      (a) => {
        if (nr !== lauf || rolle !== "hoerer") {
          a.verbindung.schliessen();
          return;
        }
        plaetze.set(platz, { angebot: a, marke, beantwortet: false });
        void aktiv?.senden({ art: "platz", nr: platz, sdp: a.sdp }).catch(() => undefined);
      },
      () => undefined,
    );
  }
}

/** Rufer: Das erste Gerät bietet einen wartenden Platz an. */
async function platzAnnehmen(nr: number, platz: number, sdp: string): Promise<void> {
  const da = rufPlaetze.find((p) => p.nr === platz);
  if (da) {
    void aktiv?.senden({ art: "platz-antwort", nr: platz, sdp: da.platz.antwortSdp }).catch(() => undefined);
    return;
  }
  zertifikat ??= rufZertifikat();
  const z = await zertifikat;
  const neu = await rufPlatzVorbereiten(sdp, z);
  if (nr !== lauf || rolle !== "rufer") {
    neu.verwerfen();
    return;
  }
  rufPlaetze.push({ nr: platz, platz: neu });
  // Ältere Plätze sind beim Hörer verbraucht oder ersetzt.
  while (rufPlaetze.length > PLAETZE + 1) rufPlaetze.shift()?.platz.verwerfen();
  void aktiv?.senden({ art: "platz-antwort", nr: platz, sdp: neu.antwortSdp }).catch(() => undefined);
}

/** Rufer: einen wartenden Platz des ersten Geräts anrufen. Scheitert der Anruf, folgt der nächste nach einer Pause. */
function rufen(nr: number): void {
  clearTimeout(rufUhr);
  rufUhr = undefined;
  if (nr !== lauf || rolle !== "rufer" || aktiv || rufVersuch) return;
  const nutzbar = rufPlaetze.filter((p) => p.platz.nutzbar());
  if (nutzbar.length === 0) {
    const z = kopplungsZustand();
    // Im Aufbau (der Antwort-Code steht noch da) sagt es der Dialog; eine Leiste „getrennt" gäbe es für nichts.
    if (z.phase === "verbindet") kopplungsZustandSetzen({ phase: "aus", dialog: z.dialog ? { ...z.dialog, fehler: NICHT_ZUSTANDE_SATZ } : null });
    else endgueltigGetrennt();
    return;
  }
  // Eine eingefrorene oder verdeckte Seite ruft nicht: Der Anruf liefe ins Leere. Beim Aufwachen geht es weiter.
  if (document.visibilityState !== "visible") return;
  const ziel = nutzbar[rufZahl % nutzbar.length]!;
  const pause = RUF_PAUSEN_MS[Math.min(rufZahl, RUF_PAUSEN_MS.length - 1)]!;
  rufZahl++;
  const marke = {};
  const naechster = () => {
    if (rufVersuch?.marke !== marke) return;
    clearTimeout(rufVersuch.uhr);
    const v = rufVersuch.verbindung;
    rufVersuch = null;
    v?.schliessen();
    if (nr === lauf && !aktiv) rufUhr = setTimeout(() => rufen(nr), pause);
  };
  rufVersuch = { marke, platz: ziel.nr, verbindung: null, uhr: setTimeout(naechster, RUF_FRIST_MS) };
  ziel.platz.anrufen(horcher(nr, marke)).then(
    (v) => {
      if (rufVersuch?.marke === marke) rufVersuch.verbindung = v;
      else if (aktivMarke !== marke) v.schliessen();
    },
    naechster,
  );
}

function endgueltigGetrennt(): void {
  const z = kopplungsZustand();
  clearTimeout(aufgebenUhr);
  rufenStoppen();
  wachLassen();
  kopplungsZustandSetzen({ phase: "getrennt", wartet: false, seit: z.seit ?? Date.now(), dialog: null });
}

/** Die aktive Verbindung ist weg (gerissen oder von hier aufgegeben). */
function aktivVerloren(nr: number): void {
  const z = kopplungsZustand();
  taktStoppen();
  aktiv = null;
  aktivMarke = null;
  angebot = null;
  clearTimeout(pongOffen);
  pongOffen = undefined;
  if (!wiederverbindbar()) {
    endgueltigGetrennt();
    return;
  }
  const seit = z.phase === "unterbrochen" && z.seit != null ? z.seit : Date.now();
  kopplungsZustandSetzen({ phase: "unterbrochen", wartet: true, seit, dialog: null });
  clearTimeout(aufgebenUhr);
  aufgebenUhr = setTimeout(() => {
    if (nr !== lauf || aktiv) return;
    wachLassen();
    kopplungsZustandSetzen({ phase: "getrennt", wartet: true });
  }, AUFGEBEN_MS);
  rufZahl = 0;
  rufen(nr);
}

/** Lebt die Verbindung noch? Nach dem Aufwachen sagt es der Browser erst nach vielen Sekunden; eine Nachfrage sagt es sofort. */
function nachfragen(nr: number): void {
  if (!aktiv || pongOffen) return;
  const marke = aktivMarke;
  aktiv.sofortSenden({ art: "ping" });
  pongOffen = setTimeout(() => {
    pongOffen = undefined;
    if (nr !== lauf || aktivMarke !== marke || !aktiv) return;
    const v = aktiv;
    aktivVerloren(nr);
    v.schliessen();
  }, PONG_FRIST_MS);
}

/** Das Fenster ist wieder da (Bildschirm an, Netz zurück, Uhr stand still): Verbindung prüfen, sonst gleich anrufen. */
function aufgewacht(): void {
  const nr = lauf;
  if (aktiv) nachfragen(nr);
  else if (rolle === "rufer" && !rufVersuch && (kopplungsZustand().wartet || kopplungsZustand().phase === "verbindet")) {
    rufZahl = 0;
    rufen(nr);
  }
}

function pulsSchlag(): void {
  const jetzt = Date.now();
  const stand = jetzt - pulsZuletzt;
  pulsZuletzt = jetzt;
  if (stand > SCHLAF_MS) aufgewacht();
  offenMelden();
}

function fehlerSatz(e: unknown): string {
  if (e instanceof SpeicherVollFehler) return "Der Speicher dieses Geräts ist voll: Der Stand des anderen Geräts konnte nicht übernommen werden.";
  return "Ein Stand des anderen Geräts ließ sich nicht übernehmen.";
}

function pruefen(): void {
  if (!sitzung || kopplungsZustand().phase !== "verbunden") return;
  const jetzt = speicherSchnappschuss();
  if (jetzt === schnappschuss) return;
  schnappschuss = jetzt;
  if (sitzung.pruefen() === null) kopplungBeenden("Die Sammlung gibt es auf diesem Gerät nicht mehr. Die Kopplung ist beendet.");
  else offenMelden();
}

function steuerNachricht(nr: number, n: { art?: unknown; nr?: unknown; sdp?: unknown }): boolean {
  if (n.art === "ping") {
    aktiv?.sofortSenden({ art: "pong" });
    return true;
  }
  if (n.art === "pong") {
    clearTimeout(pongOffen);
    pongOffen = undefined;
    return true;
  }
  if (n.art === "erhalten") {
    if (sitzung?.quittung((n as { kennung?: unknown }).kennung)) kopplungsZustandSetzen({ abgleichAm: Date.now() });
    offenMelden();
    return true;
  }
  if (n.art === "ende") {
    kopplungBeenden(`Das andere Gerät hat die Kopplung getrennt. ${GETRENNT_HIER_SATZ}`, false);
    return true;
  }
  if (n.art === "platz" && typeof n.nr === "number" && typeof n.sdp === "string") {
    if (rolle === "rufer") void platzAnnehmen(nr, n.nr, n.sdp).catch(() => undefined);
    return true;
  }
  if (n.art === "platz-antwort" && typeof n.nr === "number" && typeof n.sdp === "string") {
    const p = rolle === "hoerer" ? plaetze.get(n.nr) : undefined;
    if (p && !p.beantwortet) {
      p.beantwortet = true;
      p.angebot.antwortAnnehmen(n.sdp).catch(() => {
        p.angebot.verbindung.schliessen();
        plaetze.delete(n.nr as number);
      });
    }
    return true;
  }
  return false;
}

/** Horcher einer Verbindung. `marke` unterscheidet sie von den anderen dieser Kopplung (wartende Plätze, Anrufe). */
function horcher(nr: number, marke: object): VerbindungsHorcher {
  let verbindung: Verbindung | null = null;
  const eigene = (): Verbindung | null => {
    if (verbindung) return verbindung;
    if (rufVersuch?.marke === marke) return rufVersuch.verbindung;
    for (const p of plaetze.values()) if (p.marke === marke) return p.angebot.verbindung;
    return ersteMarke === marke ? erste : null;
  };
  return {
    onLage: (lage: VerbindungsLage) => {
      if (nr !== lauf) return;
      if (lage === "verbunden") {
        if (aktivMarke !== marke) {
          // Eine neue Verbindung steht: die erste nach dem Code-Tausch, ein angerufener Platz oder ein gelungener Anruf.
          const neu = eigene();
          if (!neu) return;
          verbindung = neu;
          const alt = aktiv;
          aktiv = neu;
          aktivMarke = marke;
          alt?.schliessen();
          for (const [platz, p] of plaetze) if (p.marke === marke) plaetze.delete(platz);
          if (rufVersuch?.marke === marke) {
            clearTimeout(rufVersuch.uhr);
            // Der angerufene Platz ist beim ersten Gerät jetzt die laufende Verbindung: Er lässt sich nicht noch einmal anrufen.
            const verbraucht = rufVersuch.platz;
            rufPlaetze = rufPlaetze.filter((p) => {
              if (p.nr !== verbraucht) return true;
              p.platz.verwerfen();
              return false;
            });
            rufVersuch = null;
          }
          clearTimeout(rufUhr);
          clearTimeout(aufgebenUhr);
          clearTimeout(pongOffen);
          pongOffen = undefined;
          rufZahl = 0;
          sitzung?.neuVerbunden();
        }
        kopplungsZustandSetzen({ phase: "verbunden", wartet: false, seit: null, hinweis: "", dialog: null });
        tuerenSchliessen();
        void wachHalten();
        schnappschuss = "";
        if (!takt) takt = setInterval(pruefen, TAKT_MS);
        pruefen();
        plaetzeAuffuellen(nr);
      } else if (lage === "unterbrochen") {
        if (aktivMarke !== marke) return;
        kopplungsZustandSetzen({ phase: "unterbrochen", wartet: wiederverbindbar(), seit: Date.now() });
        // Der Browser wartet noch rund zehn Sekunden, bevor er aufgibt; die Nachfrage klärt es in drei.
        nachfragen(nr);
      } else if (lage === "getrennt") {
        if (aktivMarke === marke) {
          aktivVerloren(nr);
          return;
        }
        // Eine Nebenverbindung ist zu Ende: ein wartender Platz, ein Anruf, oder die abgelöste alte Verbindung.
        for (const [platz, p] of plaetze) if (p.marke === marke) plaetze.delete(platz);
        if (rufVersuch?.marke === marke) {
          const v = rufVersuch;
          clearTimeout(v.uhr);
          rufVersuch = null;
          if (!aktiv) rufUhr = setTimeout(() => rufen(nr), RUF_PAUSEN_MS[Math.min(rufZahl, RUF_PAUSEN_MS.length - 1)]);
          return;
        }
        if (ersteMarke === marke && !aktiv && kopplungsZustand().phase === "verbindet") {
          // Vor dem ersten Stand gescheitert: Der Dialog sagt es, eine Leiste „getrennt" gäbe es für nichts.
          const z = kopplungsZustand();
          angebot = null;
          kopplungsZustandSetzen({
            phase: "aus",
            dialog: z.dialog ? { ...z.dialog, fehler: NICHT_ZUSTANDE_SATZ } : null,
          });
        }
      }
    },
    onNachricht: (nachricht: unknown) => {
      if (nr !== lauf || !sitzung || aktivMarke !== marke) return;
      if (nachricht && typeof nachricht === "object" && steuerNachricht(nr, nachricht as { art?: unknown })) return;
      try {
        const r = sitzung.empfangen(nachricht);
        if (r.abgelehnt) {
          kopplungBeenden(
            r.abgelehnt === "geloescht"
              ? "Die Sammlung liegt auf diesem Gerät im Papierkorb. Die Kopplung ist beendet; vom anderen Gerät wurde nichts übernommen."
              : "Das andere Gerät führt eine andere Sammlung. Die Kopplung ist beendet.",
          );
          return;
        }
        schnappschuss = speicherSchnappschuss();
        kopplungsZustandSetzen({
          einsatzId: r.einsatzId,
          // Die Zentrale hat eben einen Stand des Sammlers eingespielt; der Sammler wartet auf die Quittung.
          ...(sitzung.rolle === "zentrale" ? { abgleichAm: Date.now() } : {}),
          hinweis: r.widersprueche > 0 ? "Beide Geräte haben dasselbe geändert. Die Einsatzansicht nennt die Stellen." : kopplungsZustand().hinweis,
        });
        if (r.geaendert) kopplungsStandMelden(r.einsatzId);
      } catch (e) {
        kopplungsZustandSetzen({ hinweis: fehlerSatz(e) });
      }
    },
  };
}

function neueSitzung(einsatzId: string | null, nr: number, als: "zentrale" | "sammler"): AbgleichSitzung {
  return new AbgleichSitzung(
    einsatzId,
    (n) => {
      const v = aktiv;
      if (!v || nr !== lauf) return;
      // Ob etwas angekommen ist, sagt erst die Quittung der Zentrale, nicht das gelungene Senden.
      v.senden(n).catch(() => {
        // Nicht hinausgegangen: Beim nächsten Verbindungsaufbau geht der ganze Stand neu.
        if (nr === lauf) sitzung?.neuVerbunden();
      });
    },
    als,
  );
}

/** Sammler: Wie viele eigene Meldungen hat die Zentrale noch nicht bestätigt? Zählt auch ohne Verbindung weiter. */
function offenMelden(): void {
  if (!sitzung || sitzung.rolle !== "sammler") return;
  const offen = sitzung.offen();
  if (offen !== kopplungsZustand().offen) kopplungsZustandSetzen({ offen });
}

/** Sammler: Hat die Zentrale diese Meldung bestätigt? */
export function kopplungUebertragen(eintragId: string): boolean {
  return !!sitzung?.uebertragen(eintragId);
}

function beginnen(): number {
  aufraeumen();
  document.addEventListener("visibilitychange", beiSichtwechsel);
  window.addEventListener("pagehide", beiSeitenende);
  window.addEventListener("online", aufgewacht);
  pulsZuletzt = Date.now();
  puls = setInterval(pulsSchlag, 2000);
  return ++lauf;
}

/** Erstes Gerät: Kopplung für die offene Sammlung beginnen und den ersten Code zeigen. */
export async function kopplungStarten(einsatzId: string): Promise<void> {
  const nr = beginnen();
  kopplungsZustandSetzen({ phase: "verbindet", rolle: "zentrale", offen: 0, einsatzId, abgleichAm: null, seit: null, wartet: false, hinweis: "", dialog: { art: "angebot", code: "" } });
  if (!kopplungMoeglich()) {
    kopplungsZustandSetzen({ phase: "aus", dialog: { art: "angebot", code: "", fehler: KEIN_WEBRTC_SATZ } });
    return;
  }
  try {
    sitzung = neueSitzung(einsatzId, nr, "zentrale");
    rolle = "hoerer";
    const marke = {};
    ersteMarke = marke;
    // Ein Zertifikat für das Angebot und die Türen: Das zweite Gerät kennt aus dem Code nur einen Fingerabdruck.
    const zert = await rufZertifikat();
    const a = await angebotErzeugen(horcher(nr, marke), zert);
    if (nr !== lauf) {
      a.verbindung.schliessen();
      return;
    }
    angebot = a;
    erste = a.verbindung;
    // Türen, an denen das zweite Gerät seinen Fingerabdruck anklopft: Dann braucht das erste weder Kamera noch Eingabe.
    const ohneTueren = !!(globalThis as { __eebKopplungOhneTueren?: boolean }).__eebKopplungOhneTueren;
    const t = zert && !ohneTueren ? await tuerenOeffnen(zert, angebotAdressen(a.sdp), (i) => tuerKennwoerter(a.sdp, i), tuerPortsLesen, TUEREN) : null;
    if (nr !== lauf) {
      t?.schliessen();
      return;
    }
    tueren = t;
    if (t) tuerTakt = setInterval(() => void tuerenLesen(nr), TUER_TAKT_MS);
    kopplungsZustandSetzen({ dialog: { art: "angebot", code: signalKodieren({ art: "angebot", sdp: a.sdp }, t?.ports), selbst: !!t } });
  } catch {
    if (nr === lauf) kopplungsZustandSetzen({ phase: "aus", dialog: { art: "angebot", code: "", fehler: "Dieses Gerät konnte keine Verbindung vorbereiten." } });
  }
}

/** „Zweites Gerät koppeln…" und „Neu koppeln…": Eine laufende Kopplung wird nicht still abgelöst. */
export async function kopplungBeginnenMitRueckfrage(einsatzId: string): Promise<void> {
  const phase = kopplungsZustand().phase;
  if (phase === "verbunden" || phase === "unterbrochen") {
    const neu = await frageJaNein({
      titel: "Es besteht schon eine Kopplung",
      text: "Neu koppeln trennt die bestehende Verbindung zum zweiten Gerät. Was beide Geräte gespeichert haben, bleibt erhalten.",
      ok: "Neu koppeln",
    });
    if (!neu) return;
  }
  await kopplungStarten(einsatzId);
}

/** Erstes Gerät: den gescannten Antwort-Code des zweiten Geräts einsetzen. Wirft mit einem Satz für den Scanner. */
export async function kopplungAntwortAnnehmen(text: string): Promise<void> {
  const s = lesen(text);
  if (s.art !== "antwort") throw new Error(ANGEBOT_STATT_ANTWORT_SATZ);
  if (!angebot) throw new Error("Die Kopplung wurde inzwischen abgebrochen. Bitte neu beginnen.");
  // Inzwischen angeklopft: Die Antwort ist dieselbe, die Verbindung baut sich schon auf.
  if (antwortGesetzt) return;
  antwortGesetzt = true;
  try {
    await angebot.antwortAnnehmen(s.sdp);
  } catch {
    antwortGesetzt = false;
    throw new Error("Der Antwort-Code passt nicht zu dieser Kopplung. Bitte beide Codes neu tauschen.");
  }
}

/**
 * Zweites Gerät: Der Scanner hat einen Kopplungs-Code gelesen. Erzeugt die
 * Antwort und zeigt sie als Code. Wirft mit einem Satz für den Scanner.
 */
export async function kopplungAngebotGescannt(text: string): Promise<void> {
  const s = lesen(text);
  if (s.art !== "angebot") throw new Error(ANTWORT_STATT_ANGEBOT_SATZ);
  if (!kopplungMoeglich()) throw new Error(KEIN_WEBRTC_SATZ);
  const nr = beginnen();
  kopplungsZustandSetzen({ phase: "verbindet", rolle: "sammler", offen: 0, einsatzId: null, abgleichAm: null, seit: null, wartet: false, hinweis: "", dialog: { art: "antwort", code: "" } });
  try {
    sitzung = neueSitzung(null, nr, "sammler");
    rolle = "rufer";
    zertifikat = rufZertifikat();
    // Das Angebot des ersten Geräts ist der erste wartende Platz: Dieses Gerät ruft ihn an, bis dort die Antwort
    // gesetzt ist (gescannt oder eingetippt, das kann Minuten dauern), mit denselben Pausen wie nach einem Abriss.
    const platz = await rufPlatzVorbereiten(s.sdp, await zertifikat, await kennwoerterAbleiten(s.sdp));
    if (nr !== lauf) {
      platz.verwerfen();
      return;
    }
    rufPlaetze = [{ nr: 0, platz }];
    // Anklopfen geht nur, wenn das erste Gerät Türen offen hat und sich die Kennwörter dieses Geräts selbst ableiten kann.
    const selbst = !!s.tueren && s.tueren.length === TUEREN && platz.vorgabeGilt;
    kopplungsZustandSetzen({ dialog: { art: "antwort", code: signalKodieren({ art: "antwort", sdp: platz.antwortSdp }), selbst } });
    rufen(nr);
    if (selbst) void tuerAngebote(s.sdp, s.tueren!).then((sdps) => anklopfen(nr, fingerabdruckVon(platz.antwortSdp), sdps));
  } catch {
    if (nr === lauf) {
      aufraeumen();
      kopplungsZustandZuruecksetzen();
    }
    throw new Error("Der Kopplungs-Code ließ sich nicht verwenden. Bitte am ersten Gerät neu beginnen.");
  }
}

/** Für den Scanner der Aufnahme: wie {@link kopplungAngebotGescannt}, aber mit dem Fehlersatz als Rückgabe (leer = angenommen). */
export async function kopplungCodeGescannt(text: string): Promise<string> {
  try {
    await kopplungAngebotGescannt(text);
    return "";
  } catch (e) {
    return e instanceof Error && e.message ? e.message : "Der Kopplungs-Code ließ sich nicht verwenden.";
  }
}

/**
 * Kopplung beenden; mit `hinweis` bleibt die Leiste mit dem Grund stehen, ohne verschwindet sie. `melden`: dem anderen
 * Gerät sagen, dass von hier niemand mehr anruft oder wartet — es zeigt dann gleich „getrennt" statt zu warten.
 */
export function kopplungBeenden(hinweis = "", melden = true): void {
  lauf++;
  const z = kopplungsZustand();
  const v = aktiv;
  if (v && melden && v.sofortSenden({ art: "ende" })) {
    // Erst hinausgehen lassen, dann schließen: Ein sofort geschlossener Kanal verwirft, was noch nicht gesendet ist.
    aktiv = null;
    setTimeout(() => v.schliessen(), 400);
  }
  aufraeumen();
  if (hinweis) kopplungsZustandSetzen({ phase: "getrennt", wartet: false, seit: z.seit ?? Date.now(), hinweis, dialog: null });
  else kopplungsZustandZuruecksetzen();
}

// Für die Verhaltenstests: die laufende Verbindung ohne Abschied kappen, wie es ein eingeschlafenes Telefon tut.
(globalThis as { __eebKopplungAbriss?: () => void }).__eebKopplungAbriss = () => aktiv?.schliessen();

/** Den Code-Dialog schließen. Steht die Verbindung noch nicht, ist die Kopplung damit abgebrochen. */
export function kopplungDialogSchliessen(): void {
  const z = kopplungsZustand();
  if (z.phase === "verbindet" || z.phase === "aus") kopplungBeenden();
  else kopplungsZustandSetzen({ dialog: null });
}
