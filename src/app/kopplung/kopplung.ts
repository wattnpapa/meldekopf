/**
 * Kopplung mehrerer Geräte am selben Meldekopf (neu im Meldekopf, ADR-009).
 *
 * Die Telefone scannen draußen, der Rechner im Fahrzeug zeigt die Übersicht: Der Rechner ist die Zentrale und führt die
 * Lage, jedes Telefon ist ein reiner Sammler und schickt ihr, was es aufnimmt, über eine direkte Verbindung im lokalen
 * Netz (verbindung.ts). Jedes Gerät behält alles in seinem eigenen Speicher; reißt eine Verbindung, arbeitet jedes für
 * sich weiter.
 *
 * Dieses Modul hält die Gegenstellen des Fensters zusammen (gegenstelle.ts): Eine Zentrale führt bis zu
 * {@link MAX_SAMMLER} Sammler, ein Sammler die eine Zentrale. Es fasst ihre Zustände für die Oberfläche zusammen
 * (zustand.ts), schreibt das Gedächtnis (merker.ts) und hält, was sie teilen: Zertifikat, Kennung der Seite,
 * Wachhalten, die Horcher am Fenster. Es lädt erst, wenn jemand koppelt.
 */

import { frageJaNein, zeigeHinweis } from "@bos/oberflaeche/dialoge";
import { entwirreScanText } from "../eingang/tastaturbelegung";
import { geraetekennung, geraetemodellErfragen, geraetename } from "./geraetename";
import { NEU_GELADEN_SATZ, neueGegenstelle, type Gegenstelle, type Umfeld } from "./gegenstelle";
import { signalDekodieren } from "./signal";
import { merkerLaden, merkerLoeschen, merkerSchreiben } from "./merker";
import { kopplungMoeglich, rufZertifikat } from "./verbindung";
import {
  MAX_SAMMLER,
  kopplungsStandMelden,
  kopplungsZustand,
  kopplungsZustandErsetzen,
  type KopplungsGeraet,
  type KopplungsPhase,
  type KopplungsZustand,
  kopplungsCodeAus,
} from "./zustand";

export { TAKT_MS, NICHT_ZUSTANDE_SATZ, ANGEBOT_STATT_ANTWORT_SATZ, NEU_GELADEN_SATZ } from "./gegenstelle";

export const KEIN_WEBRTC_SATZ = "Dieser Browser kann keine direkte Verbindung zu einem zweiten Gerät aufbauen.";
export const ANTWORT_STATT_ANGEBOT_SATZ =
  "Das ist ein Antwort-Code. Er gehört auf das Gerät, das die Kopplung begonnen hat (dort „Antwort scannen…“).";
export const HOECHSTZAHL_SATZ = `Eine Zentrale führt höchstens ${MAX_SAMMLER} Sammler. Erst eines der gekoppelten Geräte trennen.`;

/** Stand die Uhr dieses Fensters länger still, war das Gerät eingeschlafen: Die Verbindungen werden geprüft. */
const SCHLAF_MS = 20_000;

/**
 * Kennung dieser Seite, bei jedem Laden neu. Wartende Plätze gehören der Seite, die sie angelegt hat: Meldet sich das
 * andere Gerät mit einer neuen Kennung, hat es neu geladen, und seine alten Plätze gibt es nicht mehr.
 */
const SEITE = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
// Nummern aus der Uhr: Nach einem Neuladen beginnen sie nicht wieder bei eins und treffen keine gemerkte.
let platzNr = Date.now();
let kennungNr = 0;

let rolle: "zentrale" | "sammler" | null = null;
/** Die laufenden Gegenstellen, in der Reihenfolge des Koppelns. */
let gegenstellen: Gegenstelle[] = [];
/** Zentrale: die Gegenstelle, deren Code gerade gezeigt wird. */
let anbahnung: Gegenstelle | null = null;
/** Zu Ende gegangene Gegenstellen, die als „getrennt" stehen bleiben, bis sie jemand schließt. */
let gegangene: KopplungsGeraet[] = [];
/** Ein Zertifikat für alle Gegenstellen dieses Geräts: Es steht in jedem Angebot und trägt jeden Rückruf. */
let zertifikat: Promise<RTCCertificate | undefined> | null = null;
/** Wann diese Kopplung begann; Kennung des Gemerkten (merker.ts). */
let kopplungSeit = 0;
let einsatzId: string | null = null;
/** Die ganze Kopplung ist zu Ende, der Grund bleibt stehen. */
let nachruf: { hinweis: string; seit: number; rolle: "zentrale" | "sammler"; einsatzId: string | null } | null = null;
let merkKette: Promise<unknown> = Promise.resolve();
let puls: ReturnType<typeof setInterval> | undefined;
let pulsZuletzt = 0;
let wachsperre: { release: () => Promise<void> } | null = null;
let horchend = false;

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
  // Aus einem Link (QR-Code mit der Adresse der App) zählt, was hinter `#` steht.
  return signalDekodieren(entwirreScanText(kopplungsCodeAus(text) ?? text.trim(), lesbar));
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

function aufgewacht(): void {
  for (const g of [...gegenstellen]) g.aufgewacht();
}

function beiSichtwechsel(): void {
  if (document.visibilityState !== "visible") {
    wachsperre = null; // der Browser gibt die Sperre beim Verbergen selbst frei
    return;
  }
  zusammenfassen();
  aufgewacht();
}

function pulsSchlag(): void {
  const jetzt = Date.now();
  const stand = jetzt - pulsZuletzt;
  pulsZuletzt = jetzt;
  if (stand > SCHLAF_MS) aufgewacht();
  for (const g of [...gegenstellen]) g.pulsSchlag();
}

/** Die Horcher am Fenster, solange es eine Gegenstelle gibt. Beim Verlassen der Seite nimmt niemand Abschied: Jedes
 * Gerät hat sich gemerkt, womit es das andere nach dem Neuladen wieder anruft. Abschied nimmt nur „Trennen". */
function horchen(an: boolean): void {
  if (an === horchend) return;
  horchend = an;
  if (an) {
    document.addEventListener("visibilitychange", beiSichtwechsel);
    window.addEventListener("online", aufgewacht);
    pulsZuletzt = Date.now();
    puls = setInterval(pulsSchlag, 2000);
  } else {
    document.removeEventListener("visibilitychange", beiSichtwechsel);
    window.removeEventListener("online", aufgewacht);
    clearInterval(puls);
    puls = undefined;
    wachLassen();
  }
}

function geraetVon(g: Gegenstelle, nr: number): KopplungsGeraet {
  const z = g.zustand();
  return { kennung: g.kennung, name: z.name || `Sammler ${nr}`, geraet: z.geraet, phase: z.phase, wartet: z.wartet, seit: z.seit, abgleichAm: z.abgleichAm, hinweis: z.hinweis };
}

/** Aus den Gegenstellen den einen Zustand für die Oberfläche machen. */
function zusammenfassen(): void {
  const leer: KopplungsZustand = { phase: "aus", einsatzId: null, abgleichAm: null, seit: null, hinweis: "", dialog: null };
  if (!rolle) {
    kopplungsZustandErsetzen(nachruf ? { ...leer, phase: "getrennt", rolle: nachruf.rolle, einsatzId: nachruf.einsatzId, seit: nachruf.seit, hinweis: nachruf.hinweis, wartet: false } : leer);
    horchen(false);
    return;
  }
  horchen(true);
  let neu: KopplungsZustand;
  if (rolle === "sammler") {
    const z = gegenstellen[0]?.zustand();
    neu = z
      ? { phase: z.phase, rolle, einsatzId: z.einsatzId, abgleichAm: z.abgleichAm, seit: z.seit, hinweis: z.hinweis, wartet: z.wartet, offen: z.offen, dialog: z.dialog }
      : { ...leer, rolle };
  } else {
    // Die Gegenstelle, deren Code gerade gezeigt wird, zählt erst als Sammler, wenn sie verbunden war.
    const stand = anbahnung?.zustand().phase;
    if (stand === "verbunden" || stand === "unterbrochen" || stand === "getrennt") anbahnung = null;
    const gekoppelt = gegenstellen.filter((g) => g !== anbahnung);
    const geraete = [...gekoppelt.map((g, i) => geraetVon(g, i + 1)), ...gegangene];
    const lebend = geraete.filter((g) => g.phase === "verbunden" || g.phase === "unterbrochen" || (g.phase === "getrennt" && g.wartet));
    const hat = (p: KopplungsPhase) => geraete.some((g) => g.phase === p);
    // „Aktiv" heißt: Jeder Sammler, der noch dazugehört, ist verbunden. Fehlt einer, sagt es schon die Lampe.
    const phase: KopplungsPhase =
      lebend.length > 0 && lebend.every((g) => g.phase === "verbunden")
        ? "verbunden"
        : hat("verbunden") || hat("unterbrochen")
          ? "unterbrochen"
          : geraete.length > 0
            ? "getrennt"
            : anbahnung?.zustand().phase === "verbindet"
              ? "verbindet"
              : "aus";
    const zeiten = geraete.map((g) => g.abgleichAm).filter((t): t is number => t != null);
    const seit = geraete.filter((g) => g.phase !== "verbunden" && g.seit != null).map((g) => g.seit!);
    neu = {
      phase,
      rolle,
      einsatzId,
      abgleichAm: zeiten.length > 0 ? Math.max(...zeiten) : null,
      seit: seit.length > 0 ? Math.min(...seit) : null,
      hinweis: geraete.find((g) => g.hinweis)?.hinweis ?? "",
      wartet: geraete.some((g) => g.wartet),
      dialog: anbahnung?.zustand().dialog ?? null,
      geraete,
    };
  }
  kopplungsZustandErsetzen(neu);
  if (neu.phase === "verbunden" || neu.phase === "unterbrochen") void wachHalten();
  else wachLassen();
}

/** Die Kopplung über ein Neuladen hinweg merken (merker.ts): je Gegenstelle, womit dieses Gerät sie wieder anruft. */
function merken(): void {
  const r = rolle;
  merkKette = merkKette.then(async () => {
    if (!r || r !== rolle) return;
    const geraete = gegenstellen.flatMap((g) => g.merkDaten() ?? []);
    const id = r === "zentrale" ? einsatzId : (gegenstellen[0]?.zustand().einsatzId ?? null);
    if (geraete.length === 0 || !id) {
      // Eine Zentrale, deren letzter Sammler gegangen ist, hat nichts fortzusetzen; ein Sammler vor dem ersten Stand auch nicht.
      await merkerLoeschen();
      return;
    }
    const zert = await zertifikat;
    await merkerSchreiben({ rolle: r, einsatzId: id, seit: kopplungSeit, ...(zert ? { zertifikat: zert, geraete } : {}) });
  });
}

function vergessen(): void {
  merkKette = merkKette.then(() => merkerLoeschen());
}

function entfernen(g: Gegenstelle): void {
  gegenstellen = gegenstellen.filter((x) => x !== g);
  if (anbahnung === g) anbahnung = null;
  if (gegenstellen.length === 0 && gegangene.length === 0) {
    rolle = null;
    einsatzId = null;
    zertifikat = null;
  }
}

const umfeld = (als: "zentrale" | "sammler"): Umfeld => ({
  rolle: als,
  seite: SEITE,
  zertifikat: () => (zertifikat ??= rufZertifikat()),
  naechsterPlatz: () => ++platzNr,
  geaendert: zusammenfassen,
  merken,
  standGeaendert: kopplungsStandMelden,
  vorstellung: () => (als === "sammler" ? { name: geraetename(), geraet: geraetekennung() } : null),
  vorgestellt: (g) => {
    if (als !== "zentrale") return;
    // Dasselbe Telefon hat neu gekoppelt: Sein alter Eintrag ist damit abgelöst.
    const geraet = g.zustand().geraet;
    if (geraet) {
      for (const alt of gegenstellen.filter((x) => x !== g && x.zustand().geraet === geraet)) alt.beenden("", false);
      // Auch der Eintrag, mit dem es sich eben verabschiedet hat („… hat die Kopplung getrennt"), ist damit erledigt.
      gegangene = gegangene.filter((x) => x.geraet !== geraet);
    }
    if (anbahnung === g) anbahnung = null;
    zusammenfassen();
  },
  beendet: (g, hinweis) => {
    const stelle = gegenstellen.filter((x) => x !== anbahnung).indexOf(g);
    const war = stelle >= 0 ? geraetVon(g, stelle + 1) : null;
    const z = g.zustand();
    // Erst als gegangen führen, dann entfernen: Solange ein getrennter Sammler in der Leiste steht, bleibt dies eine Zentrale.
    if (hinweis && als === "zentrale" && war) gegangene.push({ ...war, phase: "getrennt", wartet: false, seit: z.seit ?? Date.now(), hinweis });
    entfernen(g);
    if (hinweis && als === "sammler") nachruf = { hinweis, seit: z.seit ?? Date.now(), rolle: "sammler", einsatzId: z.einsatzId };
    merken();
    zusammenfassen();
  },
  alleBeenden: (hinweis) => kopplungBeenden(hinweis),
});

function neueKennung(): string {
  return `${SEITE}-${++kennungNr}`;
}

/** Zentrale: einen (weiteren) Sammler koppeln. Zeigt den Code; die bestehenden Sammler bleiben verbunden. */
export async function kopplungStarten(sammlung: string): Promise<void> {
  if (rolle !== "zentrale" || einsatzId !== sammlung) {
    // Dieses Gerät sammelt gerade oder führt eine andere Sammlung: Das endet hier.
    kopplungBeenden();
    rolle = "zentrale";
    einsatzId = sammlung;
    kopplungSeit = Date.now();
    vergessen();
  }
  nachruf = null;
  // Ein Code, der noch dasteht, ohne dass ihn jemand gescannt hat, wird durch den neuen ersetzt.
  anbahnung?.beenden("", false);
  rolle = "zentrale";
  einsatzId = sammlung;
  const g = neueGegenstelle(neueKennung(), umfeld("zentrale"));
  gegenstellen.push(g);
  anbahnung = g;
  await g.anbieten(sammlung);
}

/** „Zweites Gerät koppeln…", „Weiteres Gerät koppeln…": Was dabei endet, endet erst nach Rückfrage. */
export async function kopplungBeginnenMitRueckfrage(sammlung: string): Promise<void> {
  if (!kopplungMoeglich()) {
    await zeigeHinweis({ titel: "Koppeln geht hier nicht", text: KEIN_WEBRTC_SATZ });
    return;
  }
  const z = kopplungsZustand();
  if (rolle === "sammler" && z.phase !== "aus") {
    const neu = await frageJaNein({
      titel: "Dieses Gerät sammelt gerade",
      text: "Als Zentrale koppeln beendet die Verbindung zur bisherigen Zentrale. Was dieses Gerät aufgenommen hat, bleibt hier gespeichert.",
      ok: "Als Zentrale koppeln",
    });
    if (!neu) return;
  } else if (rolle === "zentrale" && einsatzId !== sammlung && gegenstellen.some((g) => g !== anbahnung)) {
    const neu = await frageJaNein({
      titel: "Es besteht schon eine Kopplung",
      text: "Diese Zentrale führt gerade eine andere Sammlung. Koppeln für diese Sammlung trennt die bisherigen Sammler; was sie aufgenommen haben, bleibt bei ihnen und in der anderen Sammlung erhalten.",
      ok: "Für diese Sammlung koppeln",
    });
    if (!neu) return;
  } else if (rolle === "zentrale" && gegenstellen.filter((g) => g !== anbahnung).length >= MAX_SAMMLER) {
    await zeigeHinweis({ titel: "Mehr geht nicht", text: HOECHSTZAHL_SATZ });
    return;
  }
  await kopplungStarten(sammlung);
}

/** Zentrale: den gescannten Antwort-Code des Sammlers einsetzen. Wirft mit einem Satz für den Scanner. */
export async function kopplungAntwortAnnehmen(text: string): Promise<void> {
  const s = lesen(text);
  if (!anbahnung) throw new Error("Die Kopplung wurde inzwischen abgebrochen. Bitte neu beginnen.");
  await anbahnung.antwortAnnehmen(s);
}

/**
 * Sammler: Der Scanner hat einen Kopplungs-Code gelesen. Dieses Gerät antwortet, klopft an und verbindet sich. Wirft mit
 * einem Satz für den Scanner.
 */
export async function kopplungAngebotGescannt(text: string): Promise<void> {
  const s = lesen(text);
  if (s.art !== "angebot") throw new Error(ANTWORT_STATT_ANGEBOT_SATZ);
  if (!kopplungMoeglich()) throw new Error(KEIN_WEBRTC_SATZ);
  // Eine neue Kopplung löst ab, was dieses Gerät bisher war, und das Gemerkte dazu.
  kopplungBeenden();
  rolle = "sammler";
  kopplungSeit = Date.now();
  nachruf = null;
  vergessen();
  void geraetemodellErfragen();
  const g = neueGegenstelle(neueKennung(), umfeld("sammler"));
  gegenstellen = [g];
  try {
    await g.antworten(s);
  } catch {
    if (gegenstellen.includes(g)) g.beenden("", false);
    throw new Error("Der Kopplungs-Code ließ sich nicht verwenden. Bitte am ersten Gerät neu beginnen.");
  }
}

/**
 * Nach dem Neuladen der Seite: eine gemerkte Kopplung fortsetzen (merker.ts). Jedes Gerät ruft das andere über die
 * gemerkten Plätze wieder an, ohne neuen Code; die Zentrale jeden ihrer Sammler. Wurde dort ebenfalls neu geladen, gibt
 * es die Plätze nicht mehr: Die Zentrale sagt es nach einer Dreiviertelminute.
 */
export async function kopplungFortsetzen(): Promise<void> {
  if (rolle || kopplungsZustand().phase !== "aus") return;
  const m = await merkerLaden();
  if (!m || rolle || kopplungsZustand().phase !== "aus") return;
  const zert = m.zertifikat;
  const geraete = (m.geraete ?? []).filter((g) => g.plaetze.length > 0);
  if (!kopplungMoeglich() || !zert || geraete.length === 0) {
    // Nichts, womit sich anrufen ließe: Die Zentrale sagt es, der Sammler vergisst die Kopplung.
    await merkerLoeschen();
    if (m.rolle === "zentrale") {
      nachruf = { hinweis: NEU_GELADEN_SATZ, seit: Date.now(), rolle: "zentrale", einsatzId: m.einsatzId };
      zusammenfassen();
    }
    return;
  }
  rolle = m.rolle;
  einsatzId = m.einsatzId;
  kopplungSeit = m.seit;
  zertifikat = Promise.resolve(zert);
  if (m.rolle === "sammler") void geraetemodellErfragen();
  for (const gemerkt of m.rolle === "sammler" ? geraete.slice(0, 1) : geraete.slice(0, MAX_SAMMLER)) {
    const g = neueGegenstelle(neueKennung(), umfeld(m.rolle));
    gegenstellen.push(g);
    g.fortsetzen(m.einsatzId, zert, gemerkt.plaetze, gemerkt.bestaetigt ?? [], gemerkt.name, gemerkt.geraet);
  }
  // Die App öffnet die Sammlung, falls sie nach dem Neuladen auf der Startseite steht.
  if (m.einsatzId) kopplungsStandMelden(m.einsatzId);
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
 * Die ganze Kopplung beenden: alle Gegenstellen, mit Abschied. Mit `hinweis` bleibt die Leiste mit dem Grund stehen, ohne
 * verschwindet sie.
 */
export function kopplungBeenden(hinweis = ""): void {
  const war = rolle;
  const id = rolle === "zentrale" ? einsatzId : (gegenstellen[0]?.zustand().einsatzId ?? null);
  const alle = [...gegenstellen];
  gegenstellen = [];
  anbahnung = null;
  gegangene = [];
  rolle = null;
  einsatzId = null;
  zertifikat = null;
  for (const g of alle) g.beenden("", true);
  nachruf = hinweis && war ? { hinweis, seit: Date.now(), rolle: war, einsatzId: id } : null;
  vergessen();
  zusammenfassen();
}

/** Zentrale: einen Sammler trennen oder einen getrennten aus der Liste nehmen. */
export function kopplungGeraetTrennen(kennung: string): void {
  const vorher = gegangene.length;
  gegangene = gegangene.filter((g) => g.kennung !== kennung);
  const g = gegenstellen.find((x) => x.kennung === kennung);
  if (g) g.beenden("", true);
  else if (gegangene.length !== vorher) {
    if (gegenstellen.length === 0 && gegangene.length === 0) rolle = null;
    merken();
    zusammenfassen();
  }
}

/** Den Code-Dialog schließen: Die Gegenstelle, die noch nicht verbunden war, ist damit abgebrochen; die übrigen bleiben. */
export function kopplungDialogSchliessen(): void {
  if (rolle === "sammler") {
    const g = gegenstellen[0];
    const phase = g?.zustand().phase;
    if (g && (phase === "verbindet" || phase === "aus")) g.beenden("", false);
    return;
  }
  const g = anbahnung;
  if (g) g.beenden("", false);
  else zusammenfassen();
}

/** Sammler: Hat die Zentrale diese Meldung bestätigt? */
export function kopplungUebertragen(eintragId: string): boolean {
  return rolle === "sammler" && !!gegenstellen[0]?.uebertragen(eintragId);
}

/** Sammler: Der Name dieses Geräts hat sich geändert; die Zentrale erfährt es. */
export function kopplungNameGeaendert(): void {
  if (rolle === "sammler") gegenstellen[0]?.vorstellen();
}

// Für die Verhaltenstests: die laufenden Verbindungen ohne Abschied kappen, wie es ein eingeschlafenes Telefon tut.
(globalThis as { __eebKopplungAbriss?: () => void }).__eebKopplungAbriss = () => {
  for (const g of gegenstellen) g.abriss();
};
