/**
 * Eine Gegenstelle der Kopplung (neu im Meldekopf, ADR-009): alles, was dieses Gerät mit genau einem anderen Gerät
 * verbindet — die laufende Verbindung, die wartenden Plätze in beide Richtungen, das Wiederverbinden und die
 * Abgleich-Sitzung.
 *
 * Bis 2026-11-25 gab es davon genau eine je Fenster (kopplung.ts hielt sie als Zustand des Moduls). Seit eine Zentrale
 * mehrere Sammler führt, ist sie ein eigener Baustein: Die Zentrale hält bis zu fünf, ein Sammler eine. Was mehrere
 * Gegenstellen teilen (Zertifikat, Kennung der Seite, Gedächtnis, Wachhalten, die Horcher am Fenster), reicht
 * kopplung.ts als {@link Umfeld} herein.
 */

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
  klopfKennwoerter,
  tuerAdressenLesen,
  klopfZeichen,
  signalDekodieren,
  signalKodieren,
  tuerAngebote,
  tuerKennwoerter,
  tuerPortsLesen,
} from "./signal";
import type { GemerkterPlatz } from "./merker";
import { GETRENNT_SATZ } from "./texte";
import {
  angebotErzeugen,
  eigeneAdressen,
  klopfen,
  tuerenOeffnen,
  anklopfenMoeglich,
  rufPlatzVorbereiten,
  rufPlatzWiederherstellen,
  type Angebot,
  type RufPlatz,
  type Tueren,
  type Verbindung,
  type VerbindungsHorcher,
  type VerbindungsLage,
} from "./verbindung";
import type { KopplungsDialog, KopplungsPhase } from "./zustand";

/** So oft schaut die Kopplung, ob sich der Stand dieses Geräts geändert hat. */
export const TAKT_MS = 1000;

export const NICHT_ZUSTANDE_SATZ = "Die Verbindung kam nicht zustande. Sind beide Geräte im selben Netz (WLAN oder Hotspot)? Bitte neu koppeln.";
/** Die Zentrale hat das Anklopfen des Sammlers empfangen: Am Netz lag es nicht. */
export const ERREICHT_ABER_NICHT_SATZ =
  "Das zweite Gerät hat dieses erreicht, die Verbindung kam trotzdem nicht zustande. Die Geräte sind im selben Netz. Bitte „Neu beginnen“ und am zweiten Gerät den neuen Code scannen.";
export const ANGEBOT_STATT_ANTWORT_SATZ = "Das ist kein Antwort-Code. Hier wird der Code gebraucht, den das zweite Gerät nach dem Scannen zeigt.";
export const NEU_GELADEN_SATZ =
  "Die Seite wurde neu geladen, und das zweite Gerät ist nicht zu erreichen. Dieses Gerät versucht es weiter. Wurde dort ebenfalls neu geladen, hilft nur: „Weiteres Gerät koppeln…“ und am zweiten Gerät den Code scannen. Was dort aufgenommen wurde, bleibt dort gespeichert.";

/** So oft liest das erste Gerät seine Türen. */
const TUER_TAKT_MS = 200;
/** Zweites Gerät: so viele Durchgänge des Anklopfens, falls einer nicht ankommt. */
const KLOPF_RUNDEN = 3;
/** Zweites Gerät: so lange wartet es nach einem Durchgang auf die Verbindung, bevor es noch einmal klopft. */
const KLOPF_WARTEN_MS = 6000;
/** So viele wartende Plätze hält jedes Gerät für das andere bereit. */
const PLAETZE = 2;
/** Kommt ein Anruf in dieser Zeit nicht durch, wird er abgebrochen und später wiederholt. */
const RUF_FRIST_MS = 15_000;
/**
 * Beim ersten Koppeln ruft der Sammler länger und ohne wachsende Pausen: Die Zentrale kennt ihn erst, wenn das Anklopfen
 * fertig oder der Antwort-Code gescannt ist, und sie gibt nach rund 15 Sekunden auf, wenn dann gerade kein Anruf läuft.
 * (Erster Gerätetest 2026-11-25: Im echten WLAN dauert das Anklopfen länger als im Prüfstand; die Zentrale fiel in eine
 * Pause zwischen zwei Anrufen und meldete „Die Verbindung kam nicht zustande".)
 */
const ERST_RUF_FRIST_MS = 30_000;
const ERST_RUF_PAUSE_MS = 500;
/** Pausen zwischen den Anrufen; danach bleibt es bei der letzten. */
const RUF_PAUSEN_MS = [1000, 3000, 5000, 10_000, 20_000, 30_000];
/** So lange heißt eine gerissene Verbindung „unterbrochen"; danach „getrennt", auch wenn das Gerät es weiter versucht. */
const AUFGEBEN_MS = 45_000;
/** So lange hat das andere Gerät Zeit, auf die Nachfrage zu antworten. */
const PONG_FRIST_MS = 3000;

/** Zustand einer Gegenstelle, wie ihn die Oberfläche braucht. */
export interface GegenstellenZustand {
  phase: KopplungsPhase;
  einsatzId: string | null;
  abgleichAm: number | null;
  seit: number | null;
  hinweis: string;
  wartet: boolean;
  /** Sammler: so viele eigene Meldungen hat die Zentrale noch nicht bestätigt. */
  offen: number;
  dialog: KopplungsDialog | null;
  /** Name des anderen Geräts, sobald es ihn genannt hat. */
  name: string;
  /** Dauerhafte Kennung des anderen Geräts (nicht der Seite): Koppelt dasselbe Gerät neu, löst es seinen alten Eintrag ab. */
  geraet: string;
}

/** Was mehrere Gegenstellen teilen; kopplung.ts stellt es bereit. */
export interface Umfeld {
  /** `zentrale`: Dieses Gerät führt die Lage und hört. `sammler`: Es nimmt auf und ruft. */
  rolle: "zentrale" | "sammler";
  /** Kennung dieser Seite, bei jedem Laden neu. */
  seite: string;
  zertifikat: () => Promise<RTCCertificate | undefined>;
  /** Nummer für einen neuen wartenden Platz; über alle Gegenstellen und über das Neuladen hinweg eindeutig. */
  naechsterPlatz: () => number;
  /** Der Zustand dieser Gegenstelle hat sich geändert. */
  geaendert: () => void;
  /** Das Gemerkte neu schreiben (merker.ts). */
  merken: () => void;
  /** Ein Abgleich hat die Sammlung geändert: Die Ansicht liest neu. */
  standGeaendert: (einsatzId: string) => void;
  /** Sammler: Name und dauerhafte Kennung dieses Geräts, für das andere. */
  vorstellung: () => { name: string; geraet: string } | null;
  /** Das andere Gerät hat sich vorgestellt. */
  vorgestellt: (g: Gegenstelle) => void;
  /** Diese Gegenstelle ist zu Ende; mit `hinweis` bleibt sie als „getrennt" stehen. */
  beendet: (g: Gegenstelle, hinweis: string) => void;
  /** Die ganze Kopplung ist zu Ende (die Sammlung gibt es nicht mehr). */
  alleBeenden: (hinweis: string) => void;
}

export interface Gegenstelle {
  readonly kennung: string;
  zustand: () => GegenstellenZustand;
  /** Zentrale: Angebot und Türen anlegen, den Code zeigen. */
  anbieten: (einsatzId: string) => Promise<void>;
  /** Zentrale: den gescannten Antwort-Code einsetzen. Wirft mit einem Satz für den Scanner. */
  antwortAnnehmen: (s: ReturnType<typeof signalDekodieren>) => Promise<void>;
  /** Sammler: auf ein gescanntes Angebot antworten und anklopfen. Wirft, wenn es sich nicht verwenden lässt. */
  antworten: (s: ReturnType<typeof signalDekodieren>) => Promise<void>;
  /** Nach dem Neuladen: mit gemerkten Plätzen wieder anrufen. */
  fortsetzen: (einsatzId: string | null, zertifikat: RTCCertificate, plaetze: readonly GemerkterPlatz[], bestaetigt: readonly string[], name: string, geraet: string) => void;
  /** Beenden. `melden`: dem anderen Gerät Bescheid geben. Mit `hinweis` bleibt die Gegenstelle als „getrennt" stehen. */
  beenden: (hinweis?: string, melden?: boolean) => void;
  /** Das Fenster ist wieder da (Bildschirm an, Netz zurück, Uhr stand still). */
  aufgewacht: () => void;
  /** Regelmäßig: zählen, was noch nicht bestätigt ist. */
  pulsSchlag: () => void;
  /** Sammler: Hat die Zentrale diese Meldung bestätigt? */
  uebertragen: (eintragId: string) => boolean;
  /** Was sich über ein Neuladen merken lässt; `null`, wenn es nichts fortzusetzen gibt. */
  merkDaten: () => { kennung: string; name: string; geraet: string; plaetze: GemerkterPlatz[]; bestaetigt: string[] } | null;
  /** Sammler: den (geänderten) Namen dieses Geräts noch einmal nennen. */
  vorstellen: () => void;
  /** Für die Verhaltenstests: die laufende Verbindung ohne Abschied kappen. */
  abriss: () => void;
}

function fehlerSatz(e: unknown): string {
  if (e instanceof SpeicherVollFehler) return "Der Speicher dieses Geräts ist voll: Der Stand des anderen Geräts konnte nicht übernommen werden.";
  return "Ein Stand des anderen Geräts ließ sich nicht übernehmen.";
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

export function neueGegenstelle(kennung: string, u: Umfeld): Gegenstelle {
  const zentrale = u.rolle === "zentrale";
  let zu: GegenstellenZustand = { phase: "aus", einsatzId: null, abgleichAm: null, seit: null, hinweis: "", wartet: false, offen: 0, dialog: null, name: "", geraet: "" };
  /** Zu Ende: Nichts wird mehr gemerkt, kein Ereignis gilt mehr. */
  let tot = false;

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
  let schnappschuss = "";
  /** Eigene wartende Verbindungen, die das andere Gerät anrufen kann. */
  const plaetze = new Map<number, { angebot: Angebot; marke: object; beantwortet: boolean }>();
  /** Plätze des anderen Geräts, zu denen dieses eine Antwort bereithält. */
  let rufPlaetze: { nr: number; seite: string; platz: RufPlatz }[] = [];
  /** Zentrale, nach dem Neuladen ihrer Seite: Sie ruft an, bis die Verbindung wieder steht. */
  let fortgesetzt = false;
  let rufVersuch: { marke: object; platz: number; verbindung: Verbindung | null; uhr: ReturnType<typeof setTimeout> } | null = null;
  let rufUhr: ReturnType<typeof setTimeout> | undefined;
  let rufZahl = 0;
  let aufgebenUhr: ReturnType<typeof setTimeout> | undefined;
  let pongOffen: ReturnType<typeof setTimeout> | undefined;
  /** Zentrale: die Türen, an denen der Sammler seinen Fingerabdruck anklopft (signal.ts, „Anklopfen"). */
  let tueren: Tueren | null = null;
  let tuerTakt: ReturnType<typeof setInterval> | undefined;
  /** Zentrale: Die Antwort ist gesetzt (gescannt oder angeklopft); eine zweite gilt nicht mehr. */
  let antwortGesetzt = false;

  function setze(teil: Partial<GegenstellenZustand>): void {
    zu = { ...zu, ...teil };
    u.geaendert();
  }

  /** Wer ruft an, wenn die Verbindung weg ist? Der Sammler immer; die Zentrale nur nach dem Neuladen ihrer Seite. */
  const darfRufen = () => !zentrale || fortgesetzt;

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
   * Zentrale: Türen lesen. Stehen die jüngsten {@link KLOPFER} Klopfer für einen Fingerabdruck mit stimmendem Prüfbyte,
   * ist das die Antwort des Sammlers. Die jüngsten, weil ein zweiter Durchgang auf einen misslungenen folgt.
   */
  async function tuerenLesen(): Promise<void> {
    const t = tueren;
    const a = angebot;
    if (!t || !a || antwortGesetzt || tot) return;
    const klopfer = await t.lesen();
    if (antwortGesetzt || tot || angebot !== a) return;
    // Für die Anzeige: Kommt vom zweiten Gerät überhaupt etwas an?
    if (zu.dialog && zu.dialog.netz && klopfer.length !== zu.dialog.netz.klopfer) setze({ dialog: { ...zu.dialog, netz: { ...zu.dialog.netz, klopfer: klopfer.length } } });
    if (klopfer.length < KLOPFER) return;
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
   * Sammler: den eigenen Fingerabdruck an die Türen der Zentrale klopfen. Antwortet eine Tür nicht, sind die Türen von
   * hier nicht erreichbar: Dann bleibt der Antwort-Code im Dialog der Weg.
   */
  async function anklopfen(fingerabdruck: Uint8Array, tuerSdps: readonly string[], kennwoerter: { ufrag: string; pwd: string }): Promise<void> {
    const zeichen = klopfZeichen(fingerabdruck);
    const laeuft = () => !tot && zu.phase === "verbindet";
    const netz = (teil: { erreichbar?: boolean; klopfer?: number }) => {
      if (laeuft() && zu.dialog) setze({ dialog: { ...zu.dialog, netz: { eigene: [], ...zu.dialog.netz, ...teil } } });
    };
    const ohne = () => {
      if (laeuft() && zu.dialog) setze({ dialog: { ...zu.dialog, selbst: false } });
      // Der Antwort-Code ist jetzt der Weg: Dafür muss dieses Gerät anrufen, bis er an der Zentrale gescannt ist.
      rufen();
    };
    for (let runde = 0; runde < KLOPF_RUNDEN && laeuft(); runde++) {
      let nr = 0;
      for (const z of zeichen) {
        if (!laeuft()) return;
        const sdp = tuerSdps[z];
        if (!sdp || !(await klopfen(sdp, kennwoerter))) {
          netz({ erreichbar: false });
          ohne();
          return;
        }
        nr++;
        if (nr === 1 || nr % 6 === 0 || nr === zeichen.length) netz({ erreichbar: true, klopfer: nr });
      }
      // Erst jetzt anrufen: Die Zentrale setzt die Antwort gleich nach dem letzten Klopfer und soll dann genau einen
      // laufenden Anruf vorfinden, keine Reste früherer Versuche.
      rufen();
      await new Promise((r) => setTimeout(r, KLOPF_WARTEN_MS));
    }
    if (laeuft() && zu.dialog) setze({ dialog: { ...zu.dialog, selbst: false } });
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

  /** Alles schließen, was diese Gegenstelle hält. Danach gilt kein Ereignis mehr. */
  function aufraeumen(): void {
    tot = true;
    taktStoppen();
    rufenStoppen();
    tuerenSchliessen();
    clearTimeout(aufgebenUhr);
    clearTimeout(pongOffen);
    pongOffen = undefined;
    const v = aktiv;
    const e = erste;
    aktiv = null;
    aktivMarke = null;
    angebot = null;
    erste = null;
    ersteMarke = null;
    sitzung = null;
    v?.schliessen();
    e?.schliessen();
    for (const p of plaetze.values()) p.angebot.verbindung.schliessen();
    plaetze.clear();
    for (const p of rufPlaetze) p.platz.verwerfen();
    rufPlaetze = [];
  }

  /** Kann sich dieses Gerät ohne neuen Code wieder verbinden? Entweder das andere kann hier anrufen, oder dieses dort. */
  function wiederverbindbar(): boolean {
    return [...plaetze.values()].some((p) => p.beantwortet) || (darfRufen() && rufPlaetze.some((p) => p.platz.nutzbar()));
  }

  /**
   * Genug wartende Plätze bereithalten und dem anderen Gerät anbieten. Beide Geräte tun das: Die Zentrale wartet auf den
   * Sammler, der nach dem Aufwachen anruft; der Sammler wartet auf die Zentrale, die nach dem Neuladen ihrer Seite anruft.
   */
  function plaetzeAuffuellen(): void {
    if (tot) return;
    // Angebote, auf die noch keine Antwort kam (die Verbindung riss dazwischen), gehen noch einmal hinaus.
    for (const [platz, p] of plaetze) if (!p.beantwortet) void aktiv?.senden({ art: "platz", nr: platz, seite: u.seite, sdp: p.angebot.sdp }).catch(() => undefined);
    for (let i = plaetze.size; i < PLAETZE; i++) {
      const platz = u.naechsterPlatz();
      const marke = {};
      void angebotErzeugen(horcher(marke)).then(
        (a) => {
          if (tot) {
            a.verbindung.schliessen();
            return;
          }
          plaetze.set(platz, { angebot: a, marke, beantwortet: false });
          void aktiv?.senden({ art: "platz", nr: platz, seite: u.seite, sdp: a.sdp }).catch(() => undefined);
        },
        () => undefined,
      );
    }
  }

  /** Das andere Gerät bietet einen wartenden Platz an. */
  async function platzAnnehmen(platz: number, seite: string, sdp: string): Promise<void> {
    const da = rufPlaetze.find((p) => p.nr === platz);
    if (da) {
      void aktiv?.senden({ art: "platz-antwort", nr: platz, sdp: da.platz.antwortSdp }).catch(() => undefined);
      return;
    }
    const neu = await rufPlatzVorbereiten(sdp, await u.zertifikat());
    if (tot) {
      neu.verwerfen();
      return;
    }
    rufPlaetze.push({ nr: platz, seite, platz: neu });
    // Ältere Plätze sind beim anderen Gerät verbraucht oder ersetzt.
    while (rufPlaetze.length > PLAETZE + 1) rufPlaetze.shift()?.platz.verwerfen();
    u.merken();
    void aktiv?.senden({ art: "platz-antwort", nr: platz, sdp: neu.antwortSdp }).catch(() => undefined);
  }

  /** Einen wartenden Platz des anderen Geräts anrufen. Scheitert der Anruf, folgt der nächste nach einer Pause. */
  function rufen(): void {
    clearTimeout(rufUhr);
    rufUhr = undefined;
    if (tot || !darfRufen() || aktiv || rufVersuch) return;
    // Die jüngsten Plätze zuerst: Ein älterer kann beim anderen Gerät schon verbraucht sein, ohne dass es hier ankam.
    const nutzbar = rufPlaetze.filter((p) => p.platz.nutzbar()).sort((a, b) => b.nr - a.nr);
    if (nutzbar.length === 0) {
      // Im Aufbau (der Antwort-Code steht noch da) sagt es der Dialog; eine Leiste „getrennt" gäbe es für nichts.
      if (zu.phase === "verbindet") setze({ phase: "aus", dialog: zu.dialog ? { ...zu.dialog, fehler: NICHT_ZUSTANDE_SATZ } : null });
      else endgueltigGetrennt();
      return;
    }
    // Eine eingefrorene oder verdeckte Seite ruft nicht: Der Anruf liefe ins Leere. Beim Aufwachen geht es weiter.
    if (document.visibilityState !== "visible") return;
    const ziel = nutzbar[rufZahl % nutzbar.length]!;
    const erst = zu.phase === "verbindet";
    const pause = erst ? ERST_RUF_PAUSE_MS : RUF_PAUSEN_MS[Math.min(rufZahl, RUF_PAUSEN_MS.length - 1)]!;
    rufZahl++;
    const marke = {};
    const naechster = () => {
      if (rufVersuch?.marke !== marke) return;
      clearTimeout(rufVersuch.uhr);
      const v = rufVersuch.verbindung;
      rufVersuch = null;
      v?.schliessen();
      if (!tot && !aktiv) rufUhr = setTimeout(rufen, pause);
    };
    rufVersuch = { marke, platz: ziel.nr, verbindung: null, uhr: setTimeout(naechster, erst ? ERST_RUF_FRIST_MS : RUF_FRIST_MS) };
    ziel.platz.anrufen(horcher(marke)).then(
      (v) => {
        if (rufVersuch?.marke === marke) rufVersuch.verbindung = v;
        else if (aktivMarke !== marke) v.schliessen();
      },
      naechster,
    );
  }

  /** Kein Weg mehr zurück ohne neuen Code: Die Gegenstelle bleibt als „getrennt" stehen, gemerkt wird sie nicht mehr. */
  function endgueltigGetrennt(): void {
    const seit = zu.seit ?? Date.now();
    const hinweis = zu.hinweis;
    aufraeumen();
    zu = { ...zu, phase: "getrennt", wartet: false, seit, dialog: null, hinweis };
    u.beendet(selbst, hinweis || GETRENNT_SATZ);
  }

  /** Die aktive Verbindung ist weg (gerissen oder von hier aufgegeben). */
  function aktivVerloren(): void {
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
    const seit = zu.phase === "unterbrochen" && zu.seit != null ? zu.seit : Date.now();
    setze({ phase: "unterbrochen", wartet: true, seit, dialog: null });
    aufgebenPlanen();
    rufZahl = 0;
    rufen();
  }

  function aufgebenPlanen(hinweis = ""): void {
    clearTimeout(aufgebenUhr);
    aufgebenUhr = setTimeout(() => {
      if (tot || aktiv) return;
      setze({ phase: "getrennt", wartet: true, ...(hinweis ? { hinweis } : {}) });
    }, AUFGEBEN_MS);
  }

  /** Lebt die Verbindung noch? Nach dem Aufwachen sagt es der Browser erst nach vielen Sekunden; eine Nachfrage sagt es sofort. */
  function nachfragen(): void {
    if (!aktiv || pongOffen) return;
    const marke = aktivMarke;
    aktiv.sofortSenden({ art: "ping" });
    pongOffen = setTimeout(() => {
      pongOffen = undefined;
      if (tot || aktivMarke !== marke || !aktiv) return;
      const v = aktiv;
      aktivVerloren();
      v.schliessen();
    }, PONG_FRIST_MS);
  }

  function aufgewacht(): void {
    if (tot) return;
    if (aktiv) nachfragen();
    else if (darfRufen() && !rufVersuch && (zu.wartet || zu.phase === "verbindet")) {
      rufZahl = 0;
      rufen();
    }
  }

  /** Sammler: Wie viele eigene Meldungen hat die Zentrale noch nicht bestätigt? Zählt auch ohne Verbindung weiter. */
  function offenMelden(): void {
    if (!sitzung || zentrale) return;
    const offen = sitzung.offen();
    if (offen !== zu.offen) setze({ offen });
  }

  function pruefen(): void {
    if (!sitzung || zu.phase !== "verbunden") return;
    const jetzt = speicherSchnappschuss();
    if (jetzt === schnappschuss) return;
    schnappschuss = jetzt;
    if (sitzung.pruefen() === null) u.alleBeenden("Die Sammlung gibt es auf diesem Gerät nicht mehr. Die Kopplung ist beendet.");
    else offenMelden();
  }

  function vorstellen(): void {
    const v = u.vorstellung();
    aktiv?.sofortSenden({ art: "hallo", seite: u.seite, ...(v ?? {}) });
  }

  function steuerNachricht(n: { art?: unknown; nr?: unknown; sdp?: unknown; seite?: unknown; name?: unknown; geraet?: unknown; kennung?: unknown }): boolean {
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
      if (sitzung?.quittung(n.kennung)) {
        setze({ abgleichAm: Date.now() });
        u.merken();
      }
      offenMelden();
      return true;
    }
    if (n.art === "ende") {
      beenden(`${zentrale ? `${zu.name || "Ein Sammler"} hat` : "Das andere Gerät hat"} die Kopplung getrennt. ${GETRENNT_SATZ}`, false);
      return true;
    }
    if (n.art === "hallo") {
      // Das andere Gerät nennt die Kennung seiner Seite: Plätze einer früheren Seite gibt es dort nicht mehr.
      if (typeof n.seite === "string") {
        const seite = n.seite;
        rufPlaetze = rufPlaetze.filter((p) => {
          if (p.seite === seite) return true;
          p.platz.verwerfen();
          return false;
        });
      }
      const name = typeof n.name === "string" ? n.name.trim().slice(0, 40) : "";
      const geraet = typeof n.geraet === "string" ? n.geraet.slice(0, 64) : "";
      if (name || geraet) {
        setze({ ...(name ? { name } : {}), ...(geraet ? { geraet } : {}) });
        u.vorgestellt(selbst);
      }
      u.merken();
      return true;
    }
    if (n.art === "platz" && typeof n.nr === "number" && typeof n.sdp === "string") {
      void platzAnnehmen(n.nr, typeof n.seite === "string" ? n.seite : "", n.sdp).catch(() => undefined);
      return true;
    }
    if (n.art === "platz-antwort" && typeof n.nr === "number" && typeof n.sdp === "string") {
      const nr = n.nr;
      const p = plaetze.get(nr);
      if (p && !p.beantwortet) {
        p.beantwortet = true;
        p.angebot.antwortAnnehmen(n.sdp).catch(() => {
          p.angebot.verbindung.schliessen();
          plaetze.delete(nr);
        });
      }
      return true;
    }
    return false;
  }

  /** Horcher einer Verbindung. `marke` unterscheidet sie von den anderen dieser Gegenstelle (wartende Plätze, Anrufe). */
  function horcher(marke: object): VerbindungsHorcher {
    let verbindung: Verbindung | null = null;
    const eigene = (): Verbindung | null => {
      if (verbindung) return verbindung;
      if (rufVersuch?.marke === marke) return rufVersuch.verbindung;
      for (const p of plaetze.values()) if (p.marke === marke) return p.angebot.verbindung;
      return ersteMarke === marke ? erste : null;
    };
    return {
      onLage: (lage: VerbindungsLage) => {
        if (tot) return;
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
              // Der angerufene Platz ist beim anderen Gerät jetzt die laufende Verbindung: Er lässt sich nicht noch einmal anrufen.
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
            fortgesetzt = false;
            sitzung?.neuVerbunden();
            vorstellen();
          }
          setze({ phase: "verbunden", wartet: false, seit: null, hinweis: "", dialog: null });
          tuerenSchliessen();
          u.merken();
          schnappschuss = "";
          if (!takt) takt = setInterval(pruefen, TAKT_MS);
          pruefen();
          plaetzeAuffuellen();
        } else if (lage === "unterbrochen") {
          if (aktivMarke !== marke) return;
          setze({ phase: "unterbrochen", wartet: wiederverbindbar(), seit: Date.now() });
          // Der Browser wartet noch rund zehn Sekunden, bevor er aufgibt; die Nachfrage klärt es in drei.
          nachfragen();
        } else if (lage === "getrennt") {
          if (aktivMarke === marke) {
            aktivVerloren();
            return;
          }
          // Eine Nebenverbindung ist zu Ende: ein wartender Platz, ein Anruf, oder die abgelöste alte Verbindung.
          for (const [platz, p] of plaetze) if (p.marke === marke) plaetze.delete(platz);
          if (rufVersuch?.marke === marke) {
            clearTimeout(rufVersuch.uhr);
            rufVersuch = null;
            if (!aktiv) rufUhr = setTimeout(rufen, RUF_PAUSEN_MS[Math.min(rufZahl, RUF_PAUSEN_MS.length - 1)]);
            return;
          }
          if (ersteMarke === marke && !aktiv && zu.phase === "verbindet") {
            // Vor dem ersten Stand gescheitert: Der Dialog sagt es, eine Leiste „getrennt" gäbe es für nichts.
            angebot = null;
            setze({ phase: "aus", dialog: zu.dialog ? { ...zu.dialog, fehler: (zu.dialog.netz?.klopfer ?? 0) > 0 ? ERREICHT_ABER_NICHT_SATZ : NICHT_ZUSTANDE_SATZ } : null });
          }
        }
      },
      onNachricht: (nachricht: unknown) => {
        if (tot || !sitzung || aktivMarke !== marke) return;
        if (nachricht && typeof nachricht === "object" && steuerNachricht(nachricht as { art?: unknown })) return;
        try {
          const r = sitzung.empfangen(nachricht);
          if (r.abgelehnt) {
            u.alleBeenden(
              r.abgelehnt === "geloescht"
                ? "Die Sammlung liegt auf diesem Gerät im Papierkorb. Die Kopplung ist beendet; vom anderen Gerät wurde nichts übernommen."
                : "Das andere Gerät führt eine andere Sammlung. Die Kopplung ist beendet.",
            );
            return;
          }
          schnappschuss = speicherSchnappschuss();
          setze({
            einsatzId: r.einsatzId,
            // Die Zentrale hat eben Meldungen des Sammlers eingespielt, der Sammler den Stand der Zentrale.
            abgleichAm: Date.now(),
            hinweis: r.widersprueche > 0 ? "Beide Geräte haben dasselbe geändert. Die Einsatzansicht nennt die Stellen." : zu.hinweis,
          });
          if (r.geaendert) u.standGeaendert(r.einsatzId);
          // Der Sammler kennt die Sammlung erst jetzt: Ab hier lässt sich die Kopplung nach einem Neuladen fortsetzen.
          if (r.neuerEinsatz) u.merken();
        } catch (e) {
          setze({ hinweis: fehlerSatz(e) });
        }
      },
    };
  }

  function neueSitzung(einsatzId: string | null, bestaetigt: readonly string[] = []): AbgleichSitzung {
    return new AbgleichSitzung(
      einsatzId,
      (n) => {
        const v = aktiv;
        if (!v || tot) return;
        // Ob etwas angekommen ist, sagt erst die Quittung der Zentrale, nicht das gelungene Senden.
        v.senden(n).catch(() => {
          // Nicht hinausgegangen: Beim nächsten Verbindungsaufbau geht der ganze Stand neu.
          if (!tot) sitzung?.neuVerbunden();
        });
      },
      u.rolle,
      bestaetigt,
    );
  }

  function beenden(hinweis = "", melden = true): void {
    if (tot && zu.phase !== "getrennt") return;
    const v = aktiv;
    if (v && melden && v.sofortSenden({ art: "ende" })) {
      // Erst hinausgehen lassen, dann schließen: Ein sofort geschlossener Kanal verwirft, was noch nicht gesendet ist.
      aktiv = null;
      setTimeout(() => v.schliessen(), 400);
    }
    const seit = zu.seit ?? Date.now();
    aufraeumen();
    zu = { ...zu, phase: hinweis ? "getrennt" : "aus", wartet: false, seit, hinweis, dialog: null };
    u.beendet(selbst, hinweis);
  }

  const selbst: Gegenstelle = {
    kennung,
    zustand: () => zu,
    aufgewacht,
    pulsSchlag: offenMelden,
    beenden,
    vorstellen,
    uebertragen: (eintragId) => !!sitzung?.uebertragen(eintragId),
    abriss: () => aktiv?.schliessen(),

    merkDaten() {
      if (tot || !sitzung?.einsatzId) return null;
      const gemerkt = rufPlaetze.flatMap((p) => {
        const d = p.platz.daten();
        return d ? [{ nr: p.nr, seite: p.seite, ...d }] : [];
      });
      return { kennung, name: zu.name, geraet: zu.geraet, plaetze: gemerkt, bestaetigt: zentrale ? [] : sitzung.bestaetigte() };
    },

    async anbieten(einsatzId) {
      setze({ phase: "verbindet", einsatzId, dialog: { art: "angebot", code: "" } });
      try {
        sitzung = neueSitzung(einsatzId);
        const marke = {};
        ersteMarke = marke;
        // Ein Zertifikat für das Angebot und die Türen: Der Sammler kennt aus dem Code nur einen Fingerabdruck.
        const zert = await u.zertifikat();
        const a = await angebotErzeugen(horcher(marke), zert);
        if (tot) {
          a.verbindung.schliessen();
          return;
        }
        angebot = a;
        erste = a.verbindung;
        // Türen, an denen der Sammler seinen Fingerabdruck anklopft: Dann braucht die Zentrale weder Kamera noch Eingabe.
        const ohneTueren = !!(globalThis as { __eebKopplungOhneTueren?: boolean }).__eebKopplungOhneTueren;
        const t = zert && !ohneTueren ? await tuerenOeffnen(zert, angebotAdressen(a.sdp), (i) => tuerKennwoerter(a.sdp, i), tuerPortsLesen, TUEREN, { klopfer: await klopfKennwoerter(a.sdp), adressenLesen: tuerAdressenLesen }) : null;
        if (tot) {
          t?.schliessen();
          return;
        }
        tueren = t;
        if (t) tuerTakt = setInterval(() => void tuerenLesen(), TUER_TAKT_MS);
        setze({ dialog: { art: "angebot", code: signalKodieren({ art: "angebot", sdp: a.sdp }, t?.ports, t?.adressen), selbst: !!t, netz: { eigene: angebotAdressen(a.sdp), klopfer: 0 } } });
      } catch {
        if (!tot) setze({ phase: "aus", dialog: { art: "angebot", code: "", fehler: "Dieses Gerät konnte keine Verbindung vorbereiten." } });
      }
    },

    async antwortAnnehmen(s) {
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
    },

    async antworten(s) {
      setze({ phase: "verbindet", dialog: { art: "antwort", code: "" } });
      sitzung = neueSitzung(null);
      // Das Angebot der Zentrale ist der erste wartende Platz: Dieses Gerät ruft ihn an, bis dort die Antwort gesetzt
      // ist (angeklopft oder gescannt), mit denselben Pausen wie nach einem Abriss.
      const platz = await rufPlatzVorbereiten(s.sdp, await u.zertifikat(), await kennwoerterAbleiten(s.sdp));
      if (tot) {
        platz.verwerfen();
        return;
      }
      rufPlaetze = [{ nr: 0, seite: "", platz }];
      // Anklopfen geht nur, wenn die Zentrale Türen offen hat und sich die Kennwörter dieses Geräts selbst ableiten kann.
      const selbsttaetig = !!s.tueren && s.tueren.length === TUEREN && platz.vorgabeGilt && anklopfenMoeglich(!!s.tuerAdressen);
      setze({ dialog: { art: "antwort", code: signalKodieren({ art: "antwort", sdp: platz.antwortSdp }), selbst: selbsttaetig, netz: { eigene: [], andere: angebotAdressen(s.sdp) } } });
      void eigeneAdressen().then((eigene) => {
        if (!tot && zu.phase === "verbindet" && zu.dialog) setze({ dialog: { ...zu.dialog, netz: { ...zu.dialog.netz, eigene } } });
      });
      // Mit Türen erst anklopfen und danach anrufen; ohne Türen gleich anrufen, bis der Antwort-Code gescannt ist.
      if (selbsttaetig) void Promise.all([tuerAngebote(s.sdp, s.tueren!, s.tuerAdressen), klopfKennwoerter(s.sdp)]).then(([sdps, k]) => anklopfen(fingerabdruckVon(platz.antwortSdp), sdps, k));
      else rufen();
    },

    fortsetzen(einsatzId, zertifikat, gemerkt, bestaetigt, name, geraet) {
      fortgesetzt = zentrale;
      rufPlaetze = gemerkt.map((p) => ({ nr: p.nr, seite: p.seite, platz: rufPlatzWiederherstellen(p.angebotSdp, zertifikat, p.ufrag, p.pwd) }));
      sitzung = neueSitzung(einsatzId, bestaetigt);
      setze({ phase: "unterbrochen", wartet: true, einsatzId, abgleichAm: null, seit: Date.now(), hinweis: "", dialog: null, offen: zentrale ? 0 : sitzung.offen(), name, geraet });
      // Findet die Zentrale den Sammler nicht, wurde dort wohl auch neu geladen: Dann hilft nur der Scan.
      aufgebenPlanen(zentrale ? NEU_GELADEN_SATZ : "");
      rufen();
    },
  };
  return selbst;
}
