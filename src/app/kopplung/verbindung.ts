/**
 * Die Verbindung zwischen zwei gekoppelten Geräten: ein WebRTC-Datenkanal
 * direkt von Browser zu Browser (neu im Meldekopf, ADR-009).
 *
 * Kein Server ist beteiligt, auch kein fremder: `iceServers` bleibt leer, es
 * gibt weder STUN noch TURN. Die Geräte kennen darum nur ihre Adressen im
 * lokalen Netz — genau das ist gewollt: Die Verbindung kommt nur zustande,
 * wenn beide im selben Netz hängen (WLAN des Fahrzeugs, Hotspot), und sie
 * braucht kein Internet. Angebot und Antwort wandern als QR-Code (signal.ts).
 * Der Kanal ist von WebRTC aus verschlüsselt (DTLS); die Fingerabdrücke der
 * Schlüssel stehen in den getauschten Codes.
 *
 * Nachrichten sind JSON-Texte, gepackt (deflate) und in Stücke geteilt: Eine
 * Sammlung mit vielen Einheiten ist größer als eine einzelne Kanal-Nachricht
 * sein darf.
 */

import { deflateRaw } from "pako";
import { inflateRawBegrenzt } from "../hilfen";

/** Stückgröße einer Kanal-Nachricht; 16 KiB trägt jeder Browser. */
const STUECK = 16 * 1024;
/** Mehr gepackte Daten nimmt eine Nachricht nicht an (Schutz vor einem Gegenüber, das den Speicher füllt). */
const MAX_GEPACKT = 24 * 1024 * 1024;
/** Deckel für die entpackte Nachricht; der Speicher des Browsers fasst ohnehin nur rund 5 Mio. Zeichen. */
const MAX_ENTPACKT = 64 * 1024 * 1024;
/** Ab diesem Rückstau wartet das Senden, bis der Kanal abgeflossen ist. */
const RUECKSTAU = 1024 * 1024;
/** So lange wartet der Aufbau auf die eigenen Netzadressen. */
const SAMMELN_MS = 4000;

export type VerbindungsLage = "verbindet" | "verbunden" | "unterbrochen" | "getrennt";

export interface VerbindungsHorcher {
  onLage: (lage: VerbindungsLage) => void;
  onNachricht: (nachricht: unknown) => void;
}

export interface Verbindung {
  /** Eine Nachricht (JSON-fähig) schicken; wirft, wenn der Kanal nicht offen ist. */
  senden: (nachricht: unknown) => Promise<void>;
  schliessen: () => void;
}

export function kopplungMoeglich(): boolean {
  return typeof RTCPeerConnection === "function";
}

function fertigGesammelt(pc: RTCPeerConnection): Promise<void> {
  if (pc.iceGatheringState === "complete") return Promise.resolve();
  return new Promise((fertig) => {
    const uhr = setTimeout(ende, SAMMELN_MS);
    function ende() {
      clearTimeout(uhr);
      pc.removeEventListener("icegatheringstatechange", pruefen);
      fertig();
    }
    function pruefen() {
      if (pc.iceGatheringState === "complete") ende();
    }
    pc.addEventListener("icegatheringstatechange", pruefen);
  });
}

function verdrahten(pc: RTCPeerConnection, h: VerbindungsHorcher): { kanalSetzen: (k: RTCDataChannel) => void; verbindung: Verbindung } {
  let kanal: RTCDataChannel | null = null;
  let zu = false;
  let lage: VerbindungsLage = "verbindet";
  let teile: Uint8Array[] = [];
  let groesse = 0;
  let schlange: Promise<void> = Promise.resolve();

  function melden(neu: VerbindungsLage) {
    if (zu || neu === lage) return;
    lage = neu;
    if (neu === "getrennt") zu = true;
    h.onLage(neu);
  }

  function schliessen() {
    try {
      kanal?.close();
    } catch {
      /* schon zu */
    }
    try {
      pc.close();
    } catch {
      /* schon zu */
    }
    melden("getrennt");
  }

  pc.addEventListener("connectionstatechange", () => {
    const s = pc.connectionState;
    if (s === "failed" || s === "closed") schliessen();
    else if (s === "disconnected") melden("unterbrochen");
    else if (s === "connected" && kanal?.readyState === "open") melden("verbunden");
  });

  function empfangen(daten: ArrayBuffer) {
    const stueck = new Uint8Array(daten);
    if (stueck.length < 1) return;
    groesse += stueck.length - 1;
    if (groesse > MAX_GEPACKT) {
      schliessen();
      return;
    }
    teile.push(stueck.subarray(1));
    if (stueck[0] !== 1) return;
    const gepackt = new Uint8Array(groesse);
    let stelle = 0;
    for (const t of teile) {
      gepackt.set(t, stelle);
      stelle += t.length;
    }
    teile = [];
    groesse = 0;
    let nachricht: unknown;
    try {
      nachricht = JSON.parse(new TextDecoder().decode(inflateRawBegrenzt(gepackt, MAX_ENTPACKT)));
    } catch {
      return; // Unlesbares fällt weg; der nächste Stand kommt mit der nächsten Änderung
    }
    h.onNachricht(nachricht);
  }

  function kanalSetzen(k: RTCDataChannel) {
    kanal = k;
    k.binaryType = "arraybuffer";
    k.bufferedAmountLowThreshold = RUECKSTAU / 4;
    k.addEventListener("open", () => melden("verbunden"));
    k.addEventListener("close", schliessen);
    k.addEventListener("message", (e) => {
      if (e.data instanceof ArrayBuffer) empfangen(e.data);
    });
    if (k.readyState === "open") melden("verbunden");
  }

  async function abgeflossen(k: RTCDataChannel): Promise<void> {
    if (k.bufferedAmount <= RUECKSTAU) return;
    await new Promise<void>((weiter) => {
      const ende = () => {
        k.removeEventListener("bufferedamountlow", ende);
        k.removeEventListener("close", ende);
        weiter();
      };
      k.addEventListener("bufferedamountlow", ende);
      k.addEventListener("close", ende);
    });
  }

  async function jetztSenden(nachricht: unknown): Promise<void> {
    const k = kanal;
    if (!k || k.readyState !== "open") throw new Error("Die Verbindung zum anderen Gerät ist nicht offen.");
    const gepackt = deflateRaw(new TextEncoder().encode(JSON.stringify(nachricht)));
    for (let i = 0; i < gepackt.length || i === 0; i += STUECK - 1) {
      const ende = Math.min(gepackt.length, i + STUECK - 1);
      const stueck = new Uint8Array(ende - i + 1);
      stueck[0] = ende >= gepackt.length ? 1 : 0;
      stueck.set(gepackt.subarray(i, ende), 1);
      await abgeflossen(k);
      if (k.readyState !== "open") throw new Error("Die Verbindung zum anderen Gerät ist abgebrochen.");
      k.send(stueck);
    }
  }

  return {
    kanalSetzen,
    verbindung: {
      // Eine Nachricht nach der anderen: Die Stücke zweier Nachrichten dürfen sich nicht mischen.
      senden: (nachricht) => {
        const lauf = schlange.then(() => jetztSenden(nachricht));
        schlange = lauf.catch(() => undefined);
        return lauf;
      },
      schliessen,
    },
  };
}

function neuePc(): RTCPeerConnection {
  // Bewusst ohne iceServers: keine Verbindung zu einem fremden Rechner, nur Adressen im lokalen Netz.
  return new RTCPeerConnection({ iceServers: [] });
}

export interface Angebot {
  /** Die eigene Beschreibung für den ersten Code. */
  sdp: string;
  /** Die Antwort des anderen Geräts einsetzen; danach baut sich die Verbindung auf. */
  antwortAnnehmen: (sdp: string) => Promise<void>;
  verbindung: Verbindung;
}

/** Erstes Gerät: Angebot erzeugen. */
export async function angebotErzeugen(h: VerbindungsHorcher): Promise<Angebot> {
  const pc = neuePc();
  const { kanalSetzen, verbindung } = verdrahten(pc, h);
  kanalSetzen(pc.createDataChannel("meldekopf", { ordered: true }));
  await pc.setLocalDescription(await pc.createOffer());
  await fertigGesammelt(pc);
  const sdp = pc.localDescription?.sdp;
  if (!sdp) {
    verbindung.schliessen();
    throw new Error("Dieses Gerät konnte keine Verbindung vorbereiten.");
  }
  return {
    sdp,
    antwortAnnehmen: (antwort) => pc.setRemoteDescription({ type: "answer", sdp: antwort }),
    verbindung,
  };
}

/** Zweites Gerät: aus dem gescannten Angebot die Antwort erzeugen. */
export async function antwortErzeugen(angebotSdp: string, h: VerbindungsHorcher): Promise<{ sdp: string; verbindung: Verbindung }> {
  const pc = neuePc();
  const { kanalSetzen, verbindung } = verdrahten(pc, h);
  pc.addEventListener("datachannel", (e) => kanalSetzen(e.channel));
  try {
    await pc.setRemoteDescription({ type: "offer", sdp: angebotSdp });
    await pc.setLocalDescription(await pc.createAnswer());
    await fertigGesammelt(pc);
  } catch (e) {
    verbindung.schliessen();
    throw e;
  }
  const sdp = pc.localDescription?.sdp;
  if (!sdp) {
    verbindung.schliessen();
    throw new Error("Dieses Gerät konnte keine Verbindung vorbereiten.");
  }
  return { sdp, verbindung };
}
