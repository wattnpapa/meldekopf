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
 *
 * Wiederverbinden ohne neuen Code (Rückruf-Plätze). Ein Telefon, dessen
 * Bildschirm ausgeht, friert die Seite ein; nach rund 15 Sekunden Funkstille
 * gibt der Browser die Verbindung endgültig auf, und sie kommt nicht wieder,
 * auch wenn das Netz zurück ist (gemessen, Chromium 158). Einen Vermittler,
 * über den sich die Geräte neu verabreden könnten, gibt es nicht. Darum
 * verabreden sie sich im Voraus, solange die Verbindung steht:
 *
 * - Das erste Gerät (der Hörer) legt wartende Verbindungen an
 *   ({@link angebotErzeugen}): Ports offen, Angebot gesetzt. Das Angebot
 *   schickt es über den bestehenden Kanal.
 * - Das zweite Gerät (der Rufer) erzeugt dazu eine Antwort, setzt sie aber
 *   nicht ({@link rufPlatzVorbereiten}): Es öffnet keine Ports, nichts kann
 *   ablaufen. Die Antwort, noch ohne Adressen, schickt es zurück; der Hörer
 *   setzt sie. Seine wartende Verbindung kennt jetzt Kennwörter und
 *   Schlüssel-Fingerabdruck des Rufers und wartet auf dessen erstes Paket.
 * - Wacht der Rufer auf und ist die Verbindung tot, ruft er an: Er setzt die
 *   Antwort, der Browser sammelt die Adressen und klopft beim Hörer an. Der
 *   erkennt ihn an Kennwort und Fingerabdruck; seine Adresse lernt er aus dem
 *   Paket selbst. Kein Austausch ist in diesem Augenblick nötig.
 *
 * Ein Anruf ins Leere (Telefon außer Reichweite) lässt den Platz des Hörers
 * unberührt. Der Rufer kann ihn mit einem frischen Verbindungsobjekt erneut
 * anrufen, wenn dieses denselben Schlüssel (festes Zertifikat der Sitzung)
 * und dieselben Kennwörter trägt; die Kennwörter setzt er dafür in seine neue
 * Antwort ein. Nimmt ein Browser das nicht an, bleibt je Platz der eine
 * Versuch mit dem ursprünglichen Objekt.
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
  /**
   * Eine kurze Steuernachricht sofort schicken, an der Warteschlange vorbei (Nachfrage, Abschied). Rückgabe: ob sie
   * an den Kanal ging.
   */
  sofortSenden: (nachricht: unknown) => boolean;
  schliessen: () => void;
}

export function kopplungMoeglich(): boolean {
  return typeof RTCPeerConnection === "function";
}

/** Nach der ersten eigenen Adresse wartet der Aufbau noch so lange auf weitere. */
const NACHLAUF_MS = 350;

/**
 * Wartet auf die eigenen Netzadressen. „Fertig" meldet mancher Browser erst nach Sekunden, obwohl ohne fremde Server
 * nur die Adressen der eigenen Netzkarten zu sammeln sind: Nach der ersten Adresse genügt ein kurzer Nachlauf.
 */
function fertigGesammelt(pc: RTCPeerConnection): Promise<void> {
  if (pc.iceGatheringState === "complete") return Promise.resolve();
  return new Promise((fertig) => {
    let nachlauf: ReturnType<typeof setTimeout> | undefined;
    const uhr = setTimeout(ende, SAMMELN_MS);
    function ende() {
      clearTimeout(uhr);
      clearTimeout(nachlauf);
      pc.removeEventListener("icegatheringstatechange", pruefen);
      pc.removeEventListener("icecandidate", adresse);
      fertig();
    }
    function pruefen() {
      if (pc.iceGatheringState === "complete") ende();
    }
    function adresse(e: RTCPeerConnectionIceEvent) {
      if (!e.candidate) ende();
      else {
        clearTimeout(nachlauf);
        nachlauf = setTimeout(ende, NACHLAUF_MS);
      }
    }
    pc.addEventListener("icegatheringstatechange", pruefen);
    pc.addEventListener("icecandidate", adresse);
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
    if (stueck[0] === 2) {
      // Steuernachricht in einem Stück: Sie darf zwischen den Stücken einer großen Nachricht liegen.
      try {
        h.onNachricht(JSON.parse(new TextDecoder().decode(inflateRawBegrenzt(stueck.subarray(1), STUECK * 8))));
      } catch {
        /* Unlesbares fällt weg */
      }
      return;
    }
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
      sofortSenden: (nachricht) => {
        try {
          const k = kanal;
          if (!k || k.readyState !== "open") return false;
          const gepackt = deflateRaw(new TextEncoder().encode(JSON.stringify(nachricht)));
          if (gepackt.length >= STUECK) return false;
          const stueck = new Uint8Array(gepackt.length + 1);
          stueck[0] = 2;
          stueck.set(gepackt, 1);
          k.send(stueck);
          return true;
        } catch {
          return false;
        }
      },
      schliessen,
    },
  };
}

function neuePc(zertifikat?: RTCCertificate): RTCPeerConnection {
  // Bewusst ohne iceServers: keine Verbindung zu einem fremden Rechner, nur Adressen im lokalen Netz.
  return new RTCPeerConnection({ iceServers: [], ...(zertifikat ? { certificates: [zertifikat] } : {}) });
}

export interface Angebot {
  /** Die eigene Beschreibung für den ersten Code. */
  sdp: string;
  /** Die Antwort des anderen Geräts einsetzen; danach baut sich die Verbindung auf. */
  antwortAnnehmen: (sdp: string) => Promise<void>;
  verbindung: Verbindung;
}

/** Erstes Gerät: Angebot erzeugen. */
export async function angebotErzeugen(h: VerbindungsHorcher, zertifikat?: RTCCertificate): Promise<Angebot> {
  const pc = neuePc(zertifikat);
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

/** Ein Platz, den der Rufer anrufen kann, wenn die Verbindung gerissen ist. */
export interface RufPlatz {
  /** Die Antwort ohne Adressen, für den Hörer. */
  antwortSdp: string;
  /** Anrufen. Die Verbindung meldet sich über `h`; kommt sie nicht zustande, schließt sie der Aufrufer. Wirft, wenn kein Versuch mehr möglich ist. */
  anrufen: (h: VerbindungsHorcher) => Promise<Verbindung>;
  /** Ist noch ein Versuch möglich? */
  nutzbar: () => boolean;
  verwerfen: () => void;
  /** Womit sich der Platz nach einem Neuladen wieder anrufen lässt (merker.ts); `null`, wenn er am ursprünglichen Objekt hängt. */
  daten: () => { angebotSdp: string; ufrag: string; pwd: string } | null;
}

/** Ein festes Zertifikat für alle Rückrufe einer Kopplung; `undefined`, wenn der Browser keines erzeugt. */
export async function rufZertifikat(): Promise<RTCCertificate | undefined> {
  try {
    // 30 Tage, ausdrücklich: So lange gilt auch eine gemerkte Kopplung (merker.ts).
    return await RTCPeerConnection.generateCertificate({ name: "ECDSA", namedCurve: "P-256", expires: 30 * 24 * 60 * 60 * 1000 } as AlgorithmIdentifier);
  } catch {
    return undefined;
  }
}

function sdpFeld(sdp: string, name: string): string {
  return new RegExp(`^a=${name}:(.*)$`, "m").exec(sdp)?.[1]?.trim() ?? "";
}

/**
 * Rufer: zu einem wartenden Angebot des Hörers die Antwort erzeugen, ohne sie zu setzen.
 *
 * `vorgabe`: Kennwörter, die beide Seiten schon kennen (aus dem ersten Code abgeleitet). Die Antwort trägt dann sie
 * statt der zufälligen des Browsers; der Hörer kann sie sich selbst zusammensetzen und braucht vom Rufer nur noch
 * den Fingerabdruck. Das geht nur mit einem festen Zertifikat und einem Browser, der eingesetzte Kennwörter annimmt;
 * sonst bleibt es bei den eigenen (`vorgabeGilt` sagt, was gilt).
 */
export async function rufPlatzVorbereiten(
  angebotSdp: string,
  zertifikat: RTCCertificate | undefined,
  vorgabe?: { ufrag: string; pwd: string },
): Promise<RufPlatz & { vorgabeGilt: boolean }> {
  // Die Ereignisse des ursprünglichen Objekts gehen erst mit dem Anruf an einen Horcher.
  let ziel: VerbindungsHorcher | null = null;
  const weiche: VerbindungsHorcher = { onLage: (l) => ziel?.onLage(l), onNachricht: (n) => ziel?.onNachricht(n) };
  let erstes: { pc: RTCPeerConnection; verbindung: Verbindung; antwort: RTCSessionDescriptionInit } | null = null;
  const pc = neuePc(zertifikat);
  const { kanalSetzen, verbindung } = verdrahten(pc, weiche);
  pc.addEventListener("datachannel", (e) => kanalSetzen(e.channel));
  let antwort: RTCSessionDescriptionInit;
  try {
    await pc.setRemoteDescription({ type: "offer", sdp: angebotSdp });
    antwort = await pc.createAnswer();
  } catch (e) {
    verbindung.schliessen();
    throw e;
  }
  let antwortSdp = antwort.sdp ?? "";
  let ufrag = sdpFeld(antwortSdp, "ice-ufrag");
  let pwd = sdpFeld(antwortSdp, "ice-pwd");
  if (!ufrag || !pwd) {
    verbindung.schliessen();
    throw new Error("Antwort ohne Kennwörter.");
  }
  erstes = { pc, verbindung, antwort };
  // Ein frisches Objekt kann den Platz nur treffen, wenn es denselben Schlüssel trägt.
  let frischMoeglich = !!zertifikat;
  const eingesetzt = (sdp: string, u: string, p: string) =>
    sdp.replace(/^a=ice-ufrag:.*$/m, `a=ice-ufrag:${u}`).replace(/^a=ice-pwd:.*$/m, `a=ice-pwd:${p}`).replace(/^a=setup:.*$/m, "a=setup:active");

  async function frisch(h: VerbindungsHorcher, u = ufrag, p = pwd): Promise<Verbindung> {
    let hin: VerbindungsHorcher | null = null;
    const neu = neuePc(zertifikat);
    const draht = verdrahten(neu, { onLage: (l) => hin?.onLage(l), onNachricht: (n) => hin?.onNachricht(n) });
    neu.addEventListener("datachannel", (e) => draht.kanalSetzen(e.channel));
    try {
      await neu.setRemoteDescription({ type: "offer", sdp: angebotSdp });
      const a = await neu.createAnswer();
      const sdp = eingesetzt(a.sdp ?? "", u, p);
      if (sdpFeld(sdp, "fingerprint") !== sdpFeld(antwortSdp, "fingerprint")) throw new Error("anderer Schlüssel");
      hin = h;
      await neu.setLocalDescription({ type: "answer", sdp });
      if (sdpFeld(neu.localDescription?.sdp ?? "", "ice-ufrag") !== u) throw new Error("Kennwörter nicht übernommen");
      return draht.verbindung;
    } catch (e) {
      hin = null;
      draht.verbindung.schliessen();
      throw e;
    }
  }

  // Vorgegebene Kennwörter gelten nur, wenn der Browser sie annimmt: an einem Wegwerf-Objekt ausprobiert, das nie anklopft
  // (es kennt keine Adresse des Hörers, also ein Angebot ohne dessen Adressen).
  let vorgabeGilt = false;
  if (vorgabe && frischMoeglich) {
    const probe = neuePc(zertifikat);
    try {
      await probe.setRemoteDescription({ type: "offer", sdp: angebotSdp.replace(/^a=(candidate:|end-of-candidates).*\r?\n/gm, "") });
      const a = await probe.createAnswer();
      await probe.setLocalDescription({ type: "answer", sdp: eingesetzt(a.sdp ?? "", vorgabe.ufrag, vorgabe.pwd) });
      vorgabeGilt = sdpFeld(probe.localDescription?.sdp ?? "", "ice-ufrag") === vorgabe.ufrag;
    } catch {
      vorgabeGilt = false;
    } finally {
      probe.close();
    }
    if (vorgabeGilt) {
      ufrag = vorgabe.ufrag;
      pwd = vorgabe.pwd;
      antwortSdp = eingesetzt(antwortSdp, ufrag, pwd);
      // Das ursprüngliche Objekt trägt andere Kennwörter als die Antwort: Es wird nicht gebraucht.
      erstes.verbindung.schliessen();
      erstes = null;
    }
  }

  return {
    antwortSdp,
    vorgabeGilt,
    nutzbar: () => frischMoeglich || erstes != null,
    daten: () => (frischMoeglich ? { angebotSdp, ufrag, pwd } : null),
    async anrufen(h) {
      if (frischMoeglich) {
        try {
          return await frisch(h);
        } catch (e) {
          frischMoeglich = false; // dieser Browser nimmt die eingesetzten Kennwörter nicht: Es bleibt der eine Versuch unten
          if (!erstes) throw e;
        }
      }
      const e = erstes;
      if (!e) throw new Error("Kein Versuch mehr möglich.");
      erstes = null;
      ziel = h;
      try {
        await e.pc.setLocalDescription(e.antwort);
      } catch (fehler) {
        ziel = null;
        e.verbindung.schliessen();
        throw fehler;
      }
      return e.verbindung;
    },
    verwerfen() {
      frischMoeglich = false;
      ziel = null;
      erstes?.verbindung.schliessen();
      erstes = null;
    },
  };
}

/**
 * Rufer, nach einem Neuladen: einen gemerkten Platz wieder anrufbar machen. Es gibt kein ursprüngliches Objekt mehr,
 * nur das gemerkte Zertifikat und die Kennwörter; jeder Anruf ist ein frisches Objekt damit.
 */
export function rufPlatzWiederherstellen(angebotSdp: string, zertifikat: RTCCertificate, ufrag: string, pwd: string): RufPlatz {
  let moeglich = true;
  return {
    antwortSdp: "",
    nutzbar: () => moeglich,
    daten: () => (moeglich ? { angebotSdp, ufrag, pwd } : null),
    verwerfen() {
      moeglich = false;
    },
    async anrufen(h) {
      let hin: VerbindungsHorcher | null = null;
      const neu = neuePc(zertifikat);
      const draht = verdrahten(neu, { onLage: (l) => hin?.onLage(l), onNachricht: (n) => hin?.onNachricht(n) });
      neu.addEventListener("datachannel", (e) => draht.kanalSetzen(e.channel));
      try {
        await neu.setRemoteDescription({ type: "offer", sdp: angebotSdp });
        const a = await neu.createAnswer();
        const sdp = (a.sdp ?? "").replace(/^a=ice-ufrag:.*$/m, `a=ice-ufrag:${ufrag}`).replace(/^a=ice-pwd:.*$/m, `a=ice-pwd:${pwd}`).replace(/^a=setup:.*$/m, "a=setup:active");
        hin = h;
        await neu.setLocalDescription({ type: "answer", sdp });
        if (sdpFeld(neu.localDescription?.sdp ?? "", "ice-ufrag") !== ufrag) throw new Error("Kennwörter nicht übernommen");
        return draht.verbindung;
      } catch (e) {
        hin = null;
        moeglich = false;
        draht.verbindung.schliessen();
        throw e;
      }
    },
  };
}

// ----------------------------------------------------------------------------------------------------------------
// Türen und Anklopfen (signal.ts, „Anklopfen"): Das zweite Gerät teilt dem ersten seinen Fingerabdruck über das Netz mit.

/** Ein Klopfer, wie ihn das erste Gerät in seinen Statistiken sieht. */
export interface Klopfer {
  tuer: number;
  /** Zeitpunkt des letzten Pakets dieses Klopfers (Uhr der Statistik, Millisekunden). */
  zeit: number;
}

export interface Tueren {
  /** Je Tür der Port zu jeder Adresse des Angebots; für den Code. */
  ports: number[][];
  /** Alle bisherigen Klopfer, in der Reihenfolge, in der geklopft wurde. */
  lesen: () => Promise<Klopfer[]>;
  schliessen: () => void;
}

/**
 * Erstes Gerät: Türen öffnen. Jede ist eine wartende Verbindung mit dem Zertifikat des Angebots und abgeleiteten
 * Kennwörtern, ohne Gegenstelle; sie beantwortet das Anklopfen und sonst nichts. `null`, wenn der Browser die
 * abgeleiteten Kennwörter nicht annimmt oder eine Tür keine Adresse des Angebots hat: Dann bleibt der Antwort-Code.
 */
export async function tuerenOeffnen(
  zertifikat: RTCCertificate,
  adressen: readonly string[],
  kennwoerter: (nr: number) => Promise<{ ufrag: string; pwd: string }>,
  portsLesen: (tuerSdp: string, adressen: readonly string[]) => number[],
  anzahl: number,
): Promise<Tueren | null> {
  const pcs: RTCPeerConnection[] = [];
  const schliessen = () => {
    for (const pc of pcs.splice(0)) {
      try {
        pc.close();
      } catch {
        /* schon zu */
      }
    }
  };
  try {
    const ports = await Promise.all(
      Array.from({ length: anzahl }, async (_, nr) => {
        const pc = neuePc(zertifikat);
        pcs.push(pc);
        pc.createDataChannel("tuer");
        const k = await kennwoerter(nr);
        const o = await pc.createOffer();
        await pc.setLocalDescription({ type: "offer", sdp: (o.sdp ?? "").replace(/^a=ice-ufrag:.*$/m, `a=ice-ufrag:${k.ufrag}`).replace(/^a=ice-pwd:.*$/m, `a=ice-pwd:${k.pwd}`) });
        if (sdpFeld(pc.localDescription?.sdp ?? "", "ice-ufrag") !== k.ufrag) throw new Error("Kennwörter nicht übernommen");
        await fertigGesammelt(pc);
        const p = portsLesen(pc.localDescription?.sdp ?? "", adressen);
        if (p.every((x) => x === 0)) throw new Error("Tür ohne Adresse");
        return p;
      }),
    );
    // Die Reihenfolge der Türen ist die ihrer Nummern, nicht die ihres Fertigwerdens.
    const geordnet = [...pcs];
    return {
      ports,
      schliessen,
      async lesen() {
        const klopfer: Klopfer[] = [];
        await Promise.all(
          geordnet.map(async (pc, tuer) => {
            if (pc.connectionState === "closed") return;
            (await pc.getStats()).forEach((x: { type?: string; requestsReceived?: number; lastPacketReceivedTimestamp?: number }) => {
              // Ein Klopfer ohne Zeitstempel ist noch unterwegs: Er zählt beim nächsten Lesen.
              if (x.type === "candidate-pair" && (x.requestsReceived ?? 0) > 0 && x.lastPacketReceivedTimestamp) klopfer.push({ tuer, zeit: x.lastPacketReceivedTimestamp });
            });
          }),
        );
        return klopfer.sort((a, b) => a.zeit - b.zeit);
      },
    };
  } catch {
    schliessen();
    return null;
  }
}

/** So lange hat eine Tür Zeit zu antworten. */
const KLOPF_FRIST_MS = 4000;
/** Nach der Antwort der Tür bleibt der Klopfer noch so lange stehen: Sein erstes Paket danach trägt den Zeitstempel. */
const KLOPF_NACHLAUF_MS = 35;
/** Pause vor dem nächsten Klopfer: Die Zeitstempel zweier Klopfer müssen sich unterscheiden. */
const KLOPF_PAUSE_MS = 15;

/**
 * Zweites Gerät: einmal an eine Tür klopfen. Eine Wegwerf-Verbindung prüft die Adresse der Tür (die antwortet, weil
 * das Kennwort stimmt), schickt den ersten Gruß des Schlüsseltauschs (den die Tür nicht beantwortet, aber mit Uhrzeit
 * zählt) und schließt wieder. Rückgabe: ob die Tür geantwortet hat.
 */
export async function klopfen(tuerSdp: string): Promise<boolean> {
  const pc = neuePc();
  try {
    await pc.setRemoteDescription({ type: "offer", sdp: tuerSdp });
    const a = await pc.createAnswer();
    await pc.setLocalDescription({ type: "answer", sdp: (a.sdp ?? "").replace(/^a=setup:.*$/m, "a=setup:active") });
    const offen = await new Promise<boolean>((fertig) => {
      const uhr = setTimeout(() => fertig(false), KLOPF_FRIST_MS);
      const pruefen = () => {
        if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
          clearTimeout(uhr);
          fertig(true);
        }
      };
      pc.addEventListener("iceconnectionstatechange", pruefen);
      pruefen();
    });
    if (offen) await new Promise((r) => setTimeout(r, KLOPF_NACHLAUF_MS));
    return offen;
  } catch {
    return false;
  } finally {
    pc.close();
    await new Promise((r) => setTimeout(r, KLOPF_PAUSE_MS));
  }
}
