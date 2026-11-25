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
}

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
  if (adressen.length === 0) throw new Error("Dieses Gerät hat keine Adresse in einem Netz. Ist WLAN oder ein Hotspot verbunden?");
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
  b.push(t.adressen.length);
  for (const a of t.adressen) {
    b.push(a.typ);
    if (a.typ === 4) b.push(...a.wert.split(".").map(Number));
    else if (a.typ === 6) b.push(...ipv6Bytes(a.wert)!);
    else if (a.typ === 1) b.push(...(a.wert.replace(/\.local$/, "").replace(/-/g, "").match(/../g) ?? []).map((x) => parseInt(x, 16)));
    else text(a.wert);
    b.push(a.port >> 8, a.port & 0xff);
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
  const adressen: Adresse[] = [];
  for (let n = 0; n < anzahl; n++) {
    const typ = zahl(1);
    let wert: string;
    if (typ === 4) wert = [...nimm(4)].join(".");
    else if (typ === 6) wert = Array.from({ length: 8 }, () => zahl(2).toString(16)).join(":");
    else if (typ === 1) {
      const h = [...nimm(16)].map((x) => x.toString(16).padStart(2, "0")).join("");
      wert = `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}.local`;
    } else if (typ === 2) wert = text();
    else throw new Error(UNLESBAR);
    adressen.push({ typ: typ as Adresse["typ"], wert, port: zahl(2) });
  }
  // Nur Zeichen, die in einer Beschreibung stehen dürfen: Der Text wird Zeile für Zeile eingesetzt.
  const sauber = (s: string) => /^[\x21-\x7e]{1,255}$/.test(s);
  if (i !== bytes.length || anzahl === 0 || ![ufrag, pwd, mid].every(sauber) || adressen.some((a) => !sauber(a.wert) || a.port === 0)) throw new Error(UNLESBAR);
  return { art, setup, fingerabdruck, ufrag, pwd, mid, sctpPort, maxNachricht, adressen };
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
      "a=end-of-candidates",
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

/** Wirft mit einem Satz für den Nutzer, wenn sich die Beschreibung des Browsers nicht packen lässt. */
export function signalKodieren(s: KopplungsSignal): string {
  return KOPPLUNG_MARKE + base41Kodieren(packen(zerlegen(s)));
}

/** Wirft mit einem Satz für den Nutzer, wenn der Text kein lesbarer Kopplungs-Code ist. */
export function signalDekodieren(code: string): KopplungsSignal {
  const text = code.trim();
  if (!text.toUpperCase().startsWith(KOPPLUNG_MARKE)) throw new Error("Das ist kein Kopplungs-Code.");
  let bytes: Uint8Array;
  try {
    bytes = base41Dekodieren(text.slice(KOPPLUNG_MARKE.length));
  } catch {
    throw new Error(UNLESBAR);
  }
  const t = entpacken(bytes);
  return { art: t.art, sdp: zusammensetzen(t) };
}
