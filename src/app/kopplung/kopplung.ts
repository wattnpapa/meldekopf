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
import { signalDekodieren, signalKodieren, type KopplungsSignal } from "./signal";
import { angebotErzeugen, antwortErzeugen, kopplungMoeglich, type Angebot, type Verbindung, type VerbindungsHorcher, type VerbindungsLage } from "./verbindung";
import { kopplungsStandMelden, kopplungsZustand, kopplungsZustandSetzen, kopplungsZustandZuruecksetzen } from "./zustand";

/** So oft schaut die Kopplung, ob sich der Stand dieses Geräts geändert hat. */
export const TAKT_MS = 1000;

export const KEIN_WEBRTC_SATZ = "Dieser Browser kann keine direkte Verbindung zu einem zweiten Gerät aufbauen.";
export const ANTWORT_STATT_ANGEBOT_SATZ =
  "Das ist ein Antwort-Code. Er gehört auf das Gerät, das die Kopplung begonnen hat (dort „Antwort scannen…“).";
export const ANGEBOT_STATT_ANTWORT_SATZ =
  "Das ist kein Antwort-Code. Hier wird der Code gebraucht, den das zweite Gerät nach dem Scannen zeigt.";

let sitzung: AbgleichSitzung | null = null;
let verbindung: Verbindung | null = null;
let angebot: Angebot | null = null;
let takt: ReturnType<typeof setInterval> | undefined;
/** Zählt jede neue Kopplung hoch: Ereignisse einer abgelösten Verbindung gelten nicht mehr. */
let lauf = 0;
let schnappschuss = "";
let wachsperre: { release: () => Promise<void> } | null = null;

function lesen(text: string): KopplungsSignal {
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
}

function beiSeitenende(): void {
  // Das andere Gerät soll sofort „getrennt" sehen, nicht erst nach einer halben Minute Funkstille.
  verbindung?.schliessen();
}

function taktStoppen(): void {
  clearInterval(takt);
  takt = undefined;
}

function aufraeumen(): void {
  taktStoppen();
  wachLassen();
  document.removeEventListener("visibilitychange", beiSichtwechsel);
  window.removeEventListener("pagehide", beiSeitenende);
  const v = verbindung;
  verbindung = null;
  angebot = null;
  sitzung = null;
  v?.schliessen();
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
}

function horcher(nr: number): VerbindungsHorcher {
  return {
    onLage: (lage: VerbindungsLage) => {
      if (nr !== lauf) return;
      if (lage === "verbunden") {
        const wieder = kopplungsZustand().phase === "unterbrochen";
        kopplungsZustandSetzen({ phase: "verbunden", seit: null, hinweis: "", dialog: null });
        void wachHalten();
        if (!wieder) sitzung?.neuVerbunden();
        schnappschuss = "";
        if (!takt) takt = setInterval(pruefen, TAKT_MS);
        pruefen();
      } else if (lage === "unterbrochen") {
        kopplungsZustandSetzen({ phase: "unterbrochen", seit: Date.now() });
      } else if (lage === "getrennt") {
        const z = kopplungsZustand();
        const warVerbunden = z.phase === "verbunden" || z.phase === "unterbrochen";
        taktStoppen();
        wachLassen();
        verbindung = null;
        angebot = null;
        if (warVerbunden) {
          kopplungsZustandSetzen({ phase: "getrennt", seit: z.seit ?? Date.now(), dialog: null });
        } else {
          // Vor dem ersten Stand gescheitert: Der Dialog sagt es, eine Leiste „getrennt" gäbe es für nichts.
          kopplungsZustandSetzen({
            phase: "aus",
            dialog: z.dialog ? { ...z.dialog, fehler: "Die Verbindung kam nicht zustande. Sind beide Geräte im selben Netz (WLAN oder Hotspot)? Bitte neu koppeln." } : null,
          });
        }
      }
    },
    onNachricht: (nachricht: unknown) => {
      if (nr !== lauf || !sitzung) return;
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
          abgleichAm: Date.now(),
          hinweis: r.widersprueche > 0 ? "Beide Geräte haben dasselbe geändert. Die Einsatzansicht nennt die Stellen." : kopplungsZustand().hinweis,
        });
        if (r.geaendert) kopplungsStandMelden(r.einsatzId);
      } catch (e) {
        kopplungsZustandSetzen({ hinweis: fehlerSatz(e) });
      }
    },
  };
}

function neueSitzung(einsatzId: string | null, nr: number): AbgleichSitzung {
  return new AbgleichSitzung(einsatzId, (n) => {
    const v = verbindung;
    if (!v || nr !== lauf) return;
    v.senden(n).then(
      () => {
        if (nr === lauf) kopplungsZustandSetzen({ abgleichAm: Date.now() });
      },
      () => {
        // Nicht hinausgegangen: Beim nächsten Verbindungsaufbau geht der ganze Stand neu.
        if (nr === lauf) sitzung?.neuVerbunden();
      },
    );
  });
}

function beginnen(): number {
  aufraeumen();
  document.addEventListener("visibilitychange", beiSichtwechsel);
  window.addEventListener("pagehide", beiSeitenende);
  return ++lauf;
}

/** Erstes Gerät: Kopplung für die offene Sammlung beginnen und den ersten Code zeigen. */
export async function kopplungStarten(einsatzId: string): Promise<void> {
  const nr = beginnen();
  kopplungsZustandSetzen({ phase: "verbindet", einsatzId, abgleichAm: null, seit: null, hinweis: "", dialog: { art: "angebot", code: "" } });
  if (!kopplungMoeglich()) {
    kopplungsZustandSetzen({ phase: "aus", dialog: { art: "angebot", code: "", fehler: KEIN_WEBRTC_SATZ } });
    return;
  }
  try {
    sitzung = neueSitzung(einsatzId, nr);
    const a = await angebotErzeugen(horcher(nr));
    if (nr !== lauf) {
      a.verbindung.schliessen();
      return;
    }
    angebot = a;
    verbindung = a.verbindung;
    kopplungsZustandSetzen({ dialog: { art: "angebot", code: signalKodieren({ art: "angebot", sdp: a.sdp }) } });
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

/** Erstes Gerät: den Antwort-Code des zweiten Geräts einsetzen. Wirft mit einem Satz für den Scanner. */
export async function kopplungAntwortAnnehmen(text: string): Promise<void> {
  const s = lesen(text);
  if (s.art !== "antwort") throw new Error(ANGEBOT_STATT_ANTWORT_SATZ);
  if (!angebot) throw new Error("Die Kopplung wurde inzwischen abgebrochen. Bitte neu beginnen.");
  try {
    await angebot.antwortAnnehmen(s.sdp);
  } catch {
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
  kopplungsZustandSetzen({ phase: "verbindet", einsatzId: null, abgleichAm: null, seit: null, hinweis: "", dialog: { art: "antwort", code: "" } });
  try {
    sitzung = neueSitzung(null, nr);
    const a = await antwortErzeugen(s.sdp, horcher(nr));
    if (nr !== lauf) {
      a.verbindung.schliessen();
      return;
    }
    verbindung = a.verbindung;
    // Die Verbindung kann schon stehen, bevor der Code gezeigt wird (derselbe Rechner im Test): dann keinen Dialog mehr öffnen.
    if (kopplungsZustand().phase === "verbindet") kopplungsZustandSetzen({ dialog: { art: "antwort", code: signalKodieren({ art: "antwort", sdp: a.sdp }) } });
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

/** Kopplung beenden; mit `hinweis` bleibt die Leiste mit dem Grund stehen, ohne verschwindet sie. */
export function kopplungBeenden(hinweis = ""): void {
  lauf++;
  const z = kopplungsZustand();
  aufraeumen();
  if (hinweis) kopplungsZustandSetzen({ phase: "getrennt", seit: z.seit ?? Date.now(), hinweis, dialog: null });
  else kopplungsZustandZuruecksetzen();
}

/** Den Code-Dialog schließen. Steht die Verbindung noch nicht, ist die Kopplung damit abgebrochen. */
export function kopplungDialogSchliessen(): void {
  const z = kopplungsZustand();
  if (z.phase === "verbindet" || z.phase === "aus") kopplungBeenden();
  else kopplungsZustandSetzen({ dialog: null });
}
