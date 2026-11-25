/**
 * Kopplungs-Code: die Verbindungsbeschreibung eines Geräts als Text für einen
 * QR-Code (neu im Meldekopf, ADR-009).
 *
 * Zwei Browser im selben Netz finden einander nicht von selbst, und einen
 * Vermittlungsserver gibt es nicht. Die beiden Beschreibungen (Angebot und
 * Antwort) wandern darum über Bildschirm und Kamera: Sie tragen die Adressen
 * im lokalen Netz und den Fingerabdruck des Schlüssels, mit dem die Verbindung
 * verschlüsselt wird. Wer den Code nicht gesehen hat, kann sich nicht
 * dazwischensetzen.
 *
 * Die Beschreibung des Browsers (SDP) ist ein Text von 500 bis 900 Zeichen,
 * fast alles davon Formalien. Ein QR-Code daraus wäre so fein, dass eine
 * Notebook-Kamera ihn vom Telefonbildschirm kaum liest. In den Code kommt
 * darum nur, was sich von Gerät zu Gerät unterscheidet — Fingerabdruck,
 * Kennwörter der Verbindung, Adressen —, binär gepackt (rund 100 Byte). Die
 * Gegenseite baut daraus eine vollständige Beschreibung nach festem Muster.
 *
 * Form: `MKK1.` + Base41(Bytes). Base41 ist der Zeichensatz der Bogen-Codes:
 * Er bleibt im dichten alphanumerischen QR-Modus und übersteht einen
 * Handscanner mit falscher Tastaturbelegung.
 */

import { base41Dekodieren, base41Kodieren } from "@bos/eeb-format/codec";
import { KOPPLUNG_MARKE } from "./zustand";

export interface KopplungsSignal {
  art: "angebot" | "antwort";
  sdp: string;
}

/** Mehr Adressen trägt der Code nicht: Jede macht ihn feiner, und im lokalen Netz genügen wenige. */
const MAX_ADRESSEN = 4;

const UNLESBAR = "Der Kopplungs-Code ist unvollständig oder beschädigt. Bitte noch einmal scannen.";

interface Adresse {
  /** 4 = IPv4, 6 = IPv6, 1 = Name im lokalen Netz als UUID (`….local`), 2 = sonstiger Name. */
  typ: 4 | 6 | 1 | 2;
  wert: string;
  port: number;
}

interface Teile {
  art: "angebot" | "antwort";
  setup: "actpass" | "active" | "passive";
  fingerabdruck: Uint8Array;
  ufrag: string;
  pwd: string;
  mid: string;
  sctpPort: number;
  maxNachricht: number;
  adressen: Adresse[];
  /** Nur im Angebot: je Tür ({@link TUEREN}) der Port zu jeder Adresse, in deren Reihenfolge; 0 = diese Tür hat die Adresse nicht. */
  tueren?: number[][];
  /**
   * Nur mit `tueren`: die Adressen, unter denen die Türen stehen, wenn es nicht die des Angebots sind (Firefox gibt
   * jeder Verbindung einen eigenen Namen im lokalen Netz). Die Ports der Türen zählen dann zu diesen Adressen.
   */
  tuerAdressen?: Adresse[];
}

/** Im Zähler der Türen: Es folgen eigene Adressen der Türen ({@link Teile.tuerAdressen}). */
const TUER_ADRESSEN_MARKE = 0x80;

const SETUP = ["actpass", "active", "passive"] as const;
const UUID_LOCAL = /^([0-9a-f]{8})-([0-9a-f]{4})-([0-9a-f]{4})-([0-9a-f]{4})-([0-9a-f]{12})\.local$/i;

function zeile(sdp: string, anfang: string): string | undefined {
  return sdp.split(/\r?\n/).find((z) => z.startsWith(anfang))?.slice(anfang.length).trim();
}

function ipv6Bytes(text: string): Uint8Array | null {
  const [vorn, hinten] = text.split("::");
  const gruppen = (t: string | undefined) => (t ? t.split(":") : []);
  const a = gruppen(vorn);
  const b = text.includes("::") ? gruppen(hinten) : [];
  const luecke = text.includes("::") ? 8 - a.length - b.length : 0;
  const alle = [...a, ...Array<string>(Math.max(0, luecke)).fill("0"), ...b];
  if (alle.length !== 8 || alle.some((g) => !/^[0-9a-f]{1,4}$/i.test(g))) return null;
  const bytes = new Uint8Array(16);
  alle.forEach((g, i) => {
    const v = parseInt(g, 16);
    bytes[i * 2] = v >> 8;
    bytes[i * 2 + 1] = v & 0xff;
  });
  return bytes;
}

function adresseLesen(kandidat: string): Adresse | null {
  // a=candidate:<Gruppe> <Komponente> <Protokoll> <Vorrang> <Adresse> <Port> typ host …
  const t = kandidat.split(/\s+/);
  if (t.length < 8 || t[2]?.toLowerCase() !== "udp" || t[7] !== "host" || t[1] !== "1") return null;
  const wert = t[4]!;
  const port = Number(t[5]);
  if (!Number.isInteger(port) || port < 1 || port > 65535) return null;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(wert)) return wert.split(".").every((x) => Number(x) <= 255) ? { typ: 4, wert, port } : null;
  if (wert.includes(":")) return ipv6Bytes(wert) ? { typ: 6, wert, port } : null;
  if (UUID_LOCAL.test(wert)) return { typ: 1, wert: wert.toLowerCase(), port };
  return /^[\x21-\x7e]{1,120}$/.test(wert) ? { typ: 2, wert, port } : null;
}

function zerlegen(s: KopplungsSignal): Teile {
  const sdp = s.sdp;
  const fp = zeile(sdp, "a=fingerprint:");
  const ufrag = zeile(sdp, "a=ice-ufrag:");
  const pwd = zeile(sdp, "a=ice-pwd:");
  const setup = zeile(sdp, "a=setup:") as Teile["setup"] | undefined;
  const [alg, hex] = (fp ?? "").split(/\s+/);
  const bytes = (hex ?? "").split(":").map((x) => parseInt(x, 16));
  if (alg?.toLowerCase() !== "sha-256" || bytes.length !== 32 || bytes.some((b) => !(b >= 0 && b <= 255)) || !ufrag || !pwd || !setup || !SETUP.includes(setup)) {
    throw new Error("Dieses Gerät konnte keine Verbindung vorbereiten.");
  }
  const alle = sdp
    .split(/\r?\n/)
    .filter((z) => z.startsWith("a=candidate:"))
    .map((z) => adresseLesen(z.slice("a=candidate:".length)))
    .filter((a): a is Adresse => a != null);
  // IPv4 und Namen im lokalen Netz zuerst: Sie tragen im WLAN des Fahrzeugs und im Hotspot.
  const adressen = [...alle.filter((a) => a.typ !== 6), ...alle.filter((a) => a.typ === 6)].slice(0, MAX_ADRESSEN);
  // Eine Antwort darf ohne Adressen kommen: Das erste Gerät lernt die des zweiten aus dessen erstem Paket.
  if (adressen.length === 0 && s.art === "angebot") throw new Error("Dieses Gerät hat keine Adresse in einem Netz. Ist WLAN oder ein Hotspot verbunden?");
  return {
    art: s.art,
    setup,
    fingerabdruck: Uint8Array.from(bytes),
    ufrag,
    pwd,
    mid: zeile(sdp, "a=mid:") ?? "0",
    sctpPort: Number(zeile(sdp, "a=sctp-port:") ?? 5000) || 5000,
    maxNachricht: Number(zeile(sdp, "a=max-message-size:") ?? 262144) || 262144,
    adressen,
  };
}

function packen(t: Teile): Uint8Array {
  const b: number[] = [];
  const text = (s: string) => {
    const bytes = new TextEncoder().encode(s);
    if (bytes.length > 255) throw new Error("Dieses Gerät konnte keine Verbindung vorbereiten.");
    b.push(bytes.length, ...bytes);
  };
  b.push(t.art === "angebot" ? 0x4f : 0x41, SETUP.indexOf(t.setup), ...t.fingerabdruck);
  text(t.ufrag);
  text(t.pwd);
  text(t.mid);
  b.push(t.sctpPort >> 8, t.sctpPort & 0xff);
  const m = Math.min(t.maxNachricht, 0xffffffff);
  b.push((m >>> 24) & 0xff, (m >>> 16) & 0xff, (m >>> 8) & 0xff, m & 0xff);
  const adresse = (a: Adresse) => {
    b.push(a.typ);
    if (a.typ === 4) b.push(...a.wert.split(".").map(Number));
    else if (a.typ === 6) b.push(...ipv6Bytes(a.wert)!);
    else if (a.typ === 1) b.push(...(a.wert.replace(/\.local$/, "").replace(/-/g, "").match(/../g) ?? []).map((x) => parseInt(x, 16)));
    else text(a.wert);
  };
  b.push(t.adressen.length);
  for (const a of t.adressen) {
    adresse(a);
    b.push(a.port >> 8, a.port & 0xff);
  }
  if (t.art === "angebot") {
    const tueren = t.tueren ?? [];
    const eigene = tueren.length > 0 && t.tuerAdressen && t.tuerAdressen.length > 0 ? t.tuerAdressen : null;
    b.push(tueren.length | (eigene ? TUER_ADRESSEN_MARKE : 0));
    if (eigene) {
      b.push(eigene.length);
      for (const a of eigene) adresse(a);
    }
    const spalten = (eigene ?? t.adressen).length;
    for (const ports of tueren) for (let k = 0; k < spalten; k++) b.push(((ports[k] ?? 0) >> 8) & 0xff, (ports[k] ?? 0) & 0xff);
  }
  return Uint8Array.from(b);
}

function entpacken(bytes: Uint8Array): Teile {
  let i = 0;
  const nimm = (n: number): Uint8Array => {
    if (i + n > bytes.length) throw new Error(UNLESBAR);
    const teil = bytes.subarray(i, i + n);
    i += n;
    return teil;
  };
  const zahl = (n: number) => nimm(n).reduce((v, x) => v * 256 + x, 0);
  const text = () => new TextDecoder().decode(nimm(zahl(1)));
  const kennung = zahl(1);
  const art = kennung === 0x4f ? "angebot" : kennung === 0x41 ? "antwort" : null;
  const setup = SETUP[zahl(1)];
  if (!art || !setup) throw new Error(UNLESBAR);
  const fingerabdruck = Uint8Array.from(nimm(32));
  const ufrag = text();
  const pwd = text();
  const mid = text();
  const sctpPort = zahl(2);
  const maxNachricht = zahl(4);
  const anzahl = zahl(1);
  const adresse = (): { typ: Adresse["typ"]; wert: string } => {
    const typ = zahl(1);
    let wert: string;
    if (typ === 4) wert = [...nimm(4)].join(".");
    else if (typ === 6) wert = Array.from({ length: 8 }, () => zahl(2).toString(16)).join(":");
    else if (typ === 1) {
      const h = [...nimm(16)].map((x) => x.toString(16).padStart(2, "0")).join("");
      wert = `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}.local`;
    } else if (typ === 2) wert = text();
    else throw new Error(UNLESBAR);
    return { typ: typ as Adresse["typ"], wert };
  };
  const adressen: Adresse[] = [];
  for (let n = 0; n < anzahl; n++) adressen.push({ ...adresse(), port: zahl(2) });
  let tueren: number[][] | undefined;
  let tuerAdressen: Adresse[] | undefined;
  if (art === "angebot" && i < bytes.length) {
    const zaehler = zahl(1);
    if (zaehler & TUER_ADRESSEN_MARKE) tuerAdressen = Array.from({ length: zahl(1) }, () => ({ ...adresse(), port: 1 }));
    const spalten = tuerAdressen ?? adressen;
    tueren = Array.from({ length: zaehler & ~TUER_ADRESSEN_MARKE }, () => spalten.map(() => zahl(2)));
  }
  // Nur Zeichen, die in einer Beschreibung stehen dürfen: Der Text wird Zeile für Zeile eingesetzt.
  const sauber = (s: string) => /^[\x21-\x7e]{1,255}$/.test(s);
  if (i !== bytes.length || (anzahl === 0 && art === "angebot") || ![ufrag, pwd, mid].every(sauber) || adressen.some((a) => !sauber(a.wert) || a.port === 0) || (tuerAdressen ?? []).some((a) => !sauber(a.wert))) throw new Error(UNLESBAR);
  return { art, setup, fingerabdruck, ufrag, pwd, mid, sctpPort, maxNachricht, adressen, ...(tueren && tueren.length > 0 ? { tueren, ...(tuerAdressen && tuerAdressen.length > 0 ? { tuerAdressen } : {}) } : {}) };
}

/** Aus den Teilen wieder eine vollständige Beschreibung nach dem Muster, das Chrome, Firefox und Safari für einen reinen Datenkanal erzeugen. */
function zusammensetzen(t: Teile): string {
  const fp = [...t.fingerabdruck].map((x) => x.toString(16).padStart(2, "0").toUpperCase()).join(":");
  return (
    [
      "v=0",
      "o=- 4611731400430051336 2 IN IP4 127.0.0.1",
      "s=-",
      "t=0 0",
      `a=group:BUNDLE ${t.mid}`,
      "a=msid-semantic: WMS",
      "m=application 9 UDP/DTLS/SCTP webrtc-datachannel",
      "c=IN IP4 0.0.0.0",
      ...t.adressen.map((a, n) => `a=candidate:${n + 1} 1 udp ${2113937151 - n} ${a.wert} ${a.port} typ host generation 0`),
      // Ohne Adressen kein „Ende der Adressen": Die Gegenseite wartet dann auf das erste Paket.
      ...(t.adressen.length > 0 ? ["a=end-of-candidates"] : []),
      `a=ice-ufrag:${t.ufrag}`,
      `a=ice-pwd:${t.pwd}`,
      `a=fingerprint:sha-256 ${fp}`,
      `a=setup:${t.setup}`,
      `a=mid:${t.mid}`,
      `a=sctp-port:${t.sctpPort}`,
      `a=max-message-size:${t.maxNachricht}`,
    ].join("\r\n") + "\r\n"
  );
}

/**
 * Wirft mit einem Satz für den Nutzer, wenn sich die Beschreibung des Browsers nicht packen lässt. `tueren`: die Ports
 * der Türen des ersten Geräts ({@link tuerPortsLesen}); nur im Angebot.
 */
export function signalKodieren(s: KopplungsSignal, tueren?: number[][], tuerAdressen?: readonly string[]): string {
  const eigene = (tuerAdressen ?? []).map((wert) => adresseLesen(`0 1 udp 1 ${wert} 1 typ host`)).filter((a): a is Adresse => a != null);
  return KOPPLUNG_MARKE + base41Kodieren(packen({ ...zerlegen(s), ...(tueren && tueren.length > 0 && s.art === "angebot" ? { tueren, ...(eigene.length > 0 ? { tuerAdressen: eigene } : {}) } : {}) }));
}

/** Wirft mit einem Satz für den Nutzer, wenn der Text kein lesbarer Kopplungs-Code ist. */
export function signalDekodieren(code: string): KopplungsSignal & { tueren?: number[][]; tuerAdressen?: string[] } {
  const text = code.trim();
  if (!text.toUpperCase().startsWith(KOPPLUNG_MARKE)) throw new Error("Das ist kein Kopplungs-Code.");
  let bytes: Uint8Array;
  try {
    bytes = base41Dekodieren(text.slice(KOPPLUNG_MARKE.length));
  } catch {
    throw new Error(UNLESBAR);
  }
  const t = entpacken(bytes);
  return { art: t.art, sdp: zusammensetzen(t), ...(t.tueren ? { tueren: t.tueren } : {}), ...(t.tuerAdressen ? { tuerAdressen: t.tuerAdressen.map((a) => a.wert) } : {}) };
}

// ----------------------------------------------------------------------------------------------------------------
// Anklopfen: Das zweite Gerät teilt dem ersten seinen Schlüssel-Fingerabdruck über das Netz mit, ohne dass am ersten
// etwas gescannt oder getippt wird.
//
// Am Rechner im Fahrzeug gibt es oft weder Kamera noch Handscanner, und 53 Zeichen tippt draußen niemand ab. Der
// Browser nimmt eine Verbindung aber erst an, wenn er den Fingerabdruck der Gegenseite kennt, und gibt vorher nichts
// von ihr heraus (geprüft, Chromium 158: weder die Kennwort-Namen des anklopfenden Geräts noch sein Zertifikat).
// Eines verrät er doch: An welcher seiner wartenden Verbindungen wann jemand mit dem richtigen Kennwort angeklopft
// hat. Das erste Gerät öffnet darum {@link TUEREN} Türen, wartende Verbindungen ohne Gegenstelle, deren Kennwörter
// sich aus dem Angebot ableiten ({@link tuerKennwoerter}). Das zweite schreibt seinen Fingerabdruck als Folge von
// Zeichen zur Basis 16 und klopft für jedes Zeichen an die Tür mit dieser Nummer. Das erste liest Tür und Zeitpunkt
// aus seinen Verbindungsstatistiken, setzt die Folge zusammen und kennt den Fingerabdruck. 66 Klopfer (64 Zeichen
// und ein Prüfbyte), im Versuch rund 3 Sekunden.
//
// Anklopfen kann nur, wer das Angebot kennt (die Kennwörter der Türen stehen in keinem Paket). Was so ankommt, ist
// darum so viel wert wie ein gescannter Antwort-Code.

/** So viele Türen öffnet das erste Gerät: eine je Zeichen zur Basis 16. */
export const TUEREN = 16;
/** So viele Klopfer trägt ein Fingerabdruck: 64 Halbbytes und zwei für das Prüfbyte. */
export const KLOPFER = 66;

const B32 = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

function pruefbyte(bytes: Uint8Array): number {
  let c = 0;
  for (const b of bytes) {
    c ^= b;
    for (let i = 0; i < 8; i++) c = c & 0x80 ? ((c << 1) ^ 0x07) & 0xff : (c << 1) & 0xff;
  }
  return c;
}

/** Der Fingerabdruck (SHA-256) einer Beschreibung als 32 Byte. */
export function fingerabdruckVon(sdp: string): Uint8Array {
  const [alg, hex] = (zeile(sdp, "a=fingerprint:") ?? "").split(/\s+/);
  const bytes = (hex ?? "").split(":").map((x) => parseInt(x, 16));
  if (alg?.toLowerCase() !== "sha-256" || bytes.length !== 32 || bytes.some((b) => !(b >= 0 && b <= 255))) throw new Error("Dieses Gerät konnte keine Verbindung vorbereiten.");
  return Uint8Array.from(bytes);
}

/** Der Fingerabdruck als Folge von Türnummern, mit Prüfbyte am Ende. */
export function klopfZeichen(fingerabdruck: Uint8Array): number[] {
  return [...fingerabdruck, pruefbyte(fingerabdruck)].flatMap((b) => [b >> 4, b & 15]);
}

/** Aus einer Folge von Türnummern der Fingerabdruck; `null`, wenn Länge oder Prüfbyte nicht stimmen. */
export function klopfLesen(zeichen: readonly number[]): Uint8Array | null {
  if (zeichen.length !== KLOPFER || zeichen.some((z) => !(z >= 0 && z < TUEREN))) return null;
  const bytes = Uint8Array.from({ length: KLOPFER / 2 }, (_, i) => (zeichen[i * 2]! << 4) | zeichen[i * 2 + 1]!);
  const fp = bytes.subarray(0, 32);
  return pruefbyte(fp) === bytes[32] ? Uint8Array.from(fp) : null;
}

/** Die Adressen eines Angebots, wie sie im Code stehen: Auswahl und Reihenfolge wie beim Packen. */
export function angebotAdressen(angebotSdp: string): string[] {
  return zerlegen({ art: "angebot", sdp: angebotSdp }).adressen.map((a) => a.wert.toLowerCase());
}

/** Die Ports einer Tür zu den Adressen des Angebots, aus ihrer eigenen Beschreibung gelesen; 0, wo ihr die Adresse fehlt. */
export function tuerPortsLesen(tuerSdp: string, adressen: readonly string[]): number[] {
  const eigene = tuerSdp
    .split(/\r?\n/)
    .filter((z) => z.startsWith("a=candidate:"))
    .map((z) => adresseLesen(z.slice("a=candidate:".length)))
    .filter((a): a is Adresse => a != null);
  return adressen.map((wert) => eigene.find((a) => a.wert.toLowerCase() === wert)?.port ?? 0);
}

async function abgeleitet(quelle: string): Promise<{ ufrag: string; pwd: string }> {
  const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(quelle)));
  // Nur Buchstaben und Ziffern: Mehr braucht ein Kennwort der Verbindung nicht, und jedes Zeichen darf dort stehen.
  const text = [...hash].map((b) => B32[b & 31]! + B32[(b >> 3) & 31]!).join("");
  return { ufrag: text.slice(0, 8), pwd: text.slice(8, 40) };
}

function geheimnis(angebotSdp: string): string {
  return `${zeile(angebotSdp, "a=ice-pwd:") ?? ""}|${zeile(angebotSdp, "a=ice-ufrag:") ?? ""}|${(zeile(angebotSdp, "a=fingerprint:") ?? "").toUpperCase()}`;
}

/**
 * Die Kennwörter, mit denen das zweite Gerät anruft, aus dem Angebot des ersten abgeleitet: Beide Geräte kennen das
 * Angebot (es stand im ersten Code), sonst niemand. So muss das zweite Gerät dem ersten nur noch seinen Fingerabdruck
 * mitteilen.
 */
export function kennwoerterAbleiten(angebotSdp: string): Promise<{ ufrag: string; pwd: string }> {
  return abgeleitet(`meldekopf-kopplung|${geheimnis(angebotSdp)}`);
}

/** Die Kennwörter der Tür `nr` des ersten Geräts, ebenso abgeleitet. */
export function tuerKennwoerter(angebotSdp: string, nr: number): Promise<{ ufrag: string; pwd: string }> {
  return abgeleitet(`meldekopf-tuer|${nr}|${geheimnis(angebotSdp)}`);
}

/**
 * Die Kennwörter, mit denen das zweite Gerät anklopft. Chrome und Safari fragen an einer Tür nicht danach; Firefox
 * zählt einen Klopfer nur, wenn er sich mit dem erwarteten Namen meldet.
 */
export function klopfKennwoerter(angebotSdp: string): Promise<{ ufrag: string; pwd: string }> {
  return abgeleitet(`meldekopf-klopfer|${geheimnis(angebotSdp)}`);
}

/** Die Adressen einer Beschreibung ohne Ports, wie sie als Adressen der Türen in den Code gehen. */
export function tuerAdressenLesen(tuerSdp: string): string[] {
  const alle = tuerSdp
    .split(/\r?\n/)
    .filter((z) => z.startsWith("a=candidate:"))
    .map((z) => adresseLesen(z.slice("a=candidate:".length))?.wert.toLowerCase())
    .filter((a): a is string => a != null);
  return [...new Set(alle)].slice(0, MAX_ADRESSEN);
}

/**
 * Zweites Gerät: die Beschreibungen der Türen, aus dem Angebot und ihren Ports zusammengesetzt. Mit `tuerAdressen`
 * stehen alle Türen unter diesen Adressen und tragen dieselben Kennwörter (die der Tür 0): eine Verbindung des ersten
 * Geräts mit einem Port je Tür.
 */
export async function tuerAngebote(angebotSdp: string, tueren: readonly number[][], tuerAdressen?: readonly string[]): Promise<string[]> {
  const t = zerlegen({ art: "angebot", sdp: angebotSdp });
  const eigene = (tuerAdressen ?? []).map((wert) => adresseLesen(`0 1 udp 1 ${wert} 1 typ host`)).filter((a): a is Adresse => a != null);
  const basis = eigene.length > 0 ? eigene : t.adressen;
  return Promise.all(
    tueren.map(async (ports, nr) =>
      zusammensetzen({ ...t, ...(await tuerKennwoerter(angebotSdp, eigene.length > 0 ? 0 : nr)), adressen: basis.map((a, k) => ({ ...a, port: ports[k] ?? 0 })).filter((a) => a.port > 0) }),
    ),
  );
}

/** Erstes Gerät: aus dem angeklopften Fingerabdruck und dem eigenen Angebot die Antwort des zweiten Geräts zusammensetzen. */
export function antwortAusFingerabdruck(fingerabdruck: Uint8Array, angebotSdp: string, kennwoerter: { ufrag: string; pwd: string }): string {
  return zusammensetzen({
    art: "antwort",
    setup: "active",
    fingerabdruck,
    ufrag: kennwoerter.ufrag,
    pwd: kennwoerter.pwd,
    mid: zeile(angebotSdp, "a=mid:") ?? "0",
    sctpPort: 5000,
    maxNachricht: 262144,
    adressen: [],
  });
}
