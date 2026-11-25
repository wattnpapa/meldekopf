/**
 * Kopplungs-Code: packen und wieder auspacken (neu im Meldekopf, ADR-009).
 */

import { describe, expect, it } from "vitest";
import QRCode from "qrcode";
import { usBelegungZurueck } from "../eingang/tastaturbelegung";
import {
  KLOPFER,
  TUEREN,
  angebotAdressen,
  antwortAusFingerabdruck,
  fingerabdruckVon,
  kennwoerterAbleiten,
  klopfKennwoerter,
  klopfLesen,
  klopfZeichen,
  signalDekodieren,
  signalKodieren,
  tuerAdressenLesen,
  tuerAngebote,
  tuerKennwoerter,
  tuerPortsLesen,
} from "./signal";
import { KOPPLUNG_MARKE, istKopplungsCode } from "./zustand";
import { verschiedeneNetze } from "./kopplung-dialog";

const FP = "7B:1A:0F:9C:D4:E2:33:58:A1:00:FF:6E:21:9B:C7:45:10:8D:F3:2A:64:B9:5E:77:C0:1D:E8:92:3F:AB:06:D5";

/** Angebot, wie Chrome es für einen reinen Datenkanal erzeugt (Adressen im WLAN, eine als Name im lokalen Netz). */
const CHROME_ANGEBOT = [
  "v=0",
  "o=- 2890844526 2 IN IP4 127.0.0.1",
  "s=-",
  "t=0 0",
  "a=group:BUNDLE 0",
  "a=extmap-allow-mixed",
  "a=msid-semantic: WMS",
  "m=application 54321 UDP/DTLS/SCTP webrtc-datachannel",
  "c=IN IP4 192.168.178.20",
  "a=candidate:3871279012 1 udp 2113937151 192.168.178.20 54321 typ host generation 0 network-cost 999",
  "a=candidate:1234567890 1 udp 2113939711 3d5c7a10-2b4e-4f6a-8c9d-0e1f2a3b4c5d.local 49152 typ host generation 0 network-cost 999",
  "a=candidate:2222222222 1 udp 2113932031 fd00::1a2b:3c4d 50000 typ host generation 0 network-cost 999",
  "a=candidate:4057199860 1 tcp 1518280447 192.168.178.20 9 typ host tcptype active generation 0 network-cost 999",
  "a=ice-ufrag:Xy7+",
  "a=ice-pwd:kQ3vW9zR1tY5uI8oP2aS4dF6",
  "a=ice-options:trickle",
  `a=fingerprint:sha-256 ${FP}`,
  "a=setup:actpass",
  "a=mid:0",
  "a=sctp-port:5000",
  "a=max-message-size:262144",
  "",
].join("\r\n");

describe("Kopplungs-Code", () => {
  it("trägt, was die Gegenseite braucht, und lässt Formalien und TCP-Adressen weg", () => {
    const code = signalKodieren({ art: "angebot", sdp: CHROME_ANGEBOT });
    expect(istKopplungsCode(code)).toBe(true);
    const s = signalDekodieren(code);
    expect(s.art).toBe("angebot");
    expect(s.sdp).toContain(`a=fingerprint:sha-256 ${FP}`);
    expect(s.sdp).toContain("a=ice-ufrag:Xy7+\r\n");
    expect(s.sdp).toContain("a=ice-pwd:kQ3vW9zR1tY5uI8oP2aS4dF6\r\n");
    expect(s.sdp).toContain("a=setup:actpass");
    expect(s.sdp).toContain(" 192.168.178.20 54321 typ host");
    expect(s.sdp).toContain(" 3d5c7a10-2b4e-4f6a-8c9d-0e1f2a3b4c5d.local 49152 typ host");
    expect(s.sdp).toContain(" fd00:0:0:0:0:0:1a2b:3c4d 50000 typ host");
    expect(s.sdp).not.toMatch(/ tcp /i);
    expect(s.sdp).toContain("a=max-message-size:262144");
    expect(s.sdp.startsWith("v=0\r\n")).toBe(true);
  });

  it("unterscheidet Antwort von Angebot und behält die Rolle der Antwort", () => {
    const antwort = CHROME_ANGEBOT.replace("a=setup:actpass", "a=setup:active");
    const s = signalDekodieren(signalKodieren({ art: "antwort", sdp: antwort }));
    expect(s.art).toBe("antwort");
    expect(s.sdp).toContain("a=setup:active");
  });

  it("bleibt grob genug für eine Notebook-Kamera: alphanumerisch und höchstens Version 10", () => {
    const code = signalKodieren({ art: "angebot", sdp: CHROME_ANGEBOT });
    expect(code).toMatch(/^[0-9A-Z $%*+\-./:]+$/);
    expect(QRCode.create(code, { errorCorrectionLevel: "L" }).version).toBeLessThanOrEqual(10);
  });

  it("nimmt höchstens vier Adressen auf, IPv4 und lokale Namen zuerst", () => {
    const viele = CHROME_ANGEBOT.replace(
      "a=ice-ufrag",
      ["10.0.0.1", "10.0.0.2", "10.0.0.3", "10.0.0.4"].map((ip, n) => `a=candidate:${n} 1 udp 100 ${ip} 4000${n} typ host`).join("\r\n") + "\r\na=ice-ufrag",
    );
    const s = signalDekodieren(signalKodieren({ art: "angebot", sdp: viele }));
    expect(s.sdp.match(/a=candidate:/g)).toHaveLength(4);
    expect(s.sdp).not.toContain("fd00");
  });

  it("übersteht einen Handscanner mit US-Belegung am deutschen Rechner nach dem Zurückrechnen", () => {
    const code = signalKodieren({ art: "angebot", sdp: CHROME_ANGEBOT });
    // Was der Rechner aus den Tasten des Scanners macht: Y und Z vertauscht, Sonderzeichen verschoben.
    const verdreht = [...code].map((c) => ({ Y: "Z", Z: "Y", "-": "ß", "/": "-", ":": "Ö", "*": "(", $: "$" })[c] ?? c).join("");
    expect(istKopplungsCode(verdreht)).toBe(true);
    expect(signalDekodieren(usBelegungZurueck(verdreht)).sdp).toContain(FP);
  });

  it("weist Fremdes und Beschädigtes mit einem Satz ab", () => {
    expect(() => signalDekodieren("https://erfassungsbogen.app/#B.ABC")).toThrow(/kein Kopplungs-Code/);
    const code = signalKodieren({ art: "angebot", sdp: CHROME_ANGEBOT });
    expect(() => signalDekodieren(code.slice(0, -9))).toThrow(/unvollständig oder beschädigt/);
    expect(() => signalDekodieren(`${KOPPLUNG_MARKE}0000`)).toThrow(/unvollständig oder beschädigt/);
    expect(() => signalDekodieren(`${KOPPLUNG_MARKE}abc`)).toThrow(/unvollständig oder beschädigt/);
  });

  it("sagt, wenn das Gerät in keinem Netz hängt", () => {
    const ohne = CHROME_ANGEBOT.split("\r\n").filter((z) => !z.startsWith("a=candidate:")).join("\r\n");
    expect(() => signalKodieren({ art: "angebot", sdp: ohne })).toThrow(/keine Adresse in einem Netz/);
  });
});

describe("Anklopfen: Fingerabdruck ohne Scan und ohne Eingabe", () => {
  const ANTWORT = CHROME_ANGEBOT.replace("a=setup:actpass", "a=setup:active");
  const PORTS = Array.from({ length: TUEREN }, (_, i) => [40000 + i, 41000 + i, 0]);

  it("schreibt den Fingerabdruck als 66 Türnummern und liest ihn daraus wieder", () => {
    const fp = fingerabdruckVon(ANTWORT);
    const zeichen = klopfZeichen(fp);
    expect(zeichen).toHaveLength(KLOPFER);
    expect(zeichen.every((z) => z >= 0 && z < TUEREN)).toBe(true);
    expect([...klopfLesen(zeichen)!]).toEqual([...fp]);
  });

  it("verwirft eine Folge mit falschem Prüfbyte, falscher Länge oder vertauschten Klopfern", () => {
    const zeichen = klopfZeichen(fingerabdruckVon(ANTWORT));
    expect(klopfLesen(zeichen.slice(1))).toBeNull();
    expect(klopfLesen([...zeichen.slice(0, 10), (zeichen[10]! + 1) % TUEREN, ...zeichen.slice(11)])).toBeNull();
    const vertauscht = [...zeichen];
    const i = vertauscht.findIndex((z, k) => k < 60 && z !== vertauscht[k + 1]);
    [vertauscht[i], vertauscht[i + 1]] = [vertauscht[i + 1]!, vertauscht[i]!];
    expect(klopfLesen(vertauscht)).toBeNull();
  });

  it("trägt die Ports der Türen im Angebot, und das zweite Gerät setzt daraus deren Beschreibungen zusammen", async () => {
    const code = signalKodieren({ art: "angebot", sdp: CHROME_ANGEBOT }, PORTS);
    expect(QRCode.create(code, { errorCorrectionLevel: "L" }).version).toBeLessThanOrEqual(16);
    const s = signalDekodieren(code);
    expect(s.tueren).toEqual(PORTS);
    const tueren = await tuerAngebote(s.sdp, s.tueren!);
    expect(tueren).toHaveLength(TUEREN);
    const k3 = await tuerKennwoerter(CHROME_ANGEBOT, 3);
    expect(tueren[3]).toContain(`a=ice-ufrag:${k3.ufrag}\r\n`);
    expect(tueren[3]).toContain(`a=ice-pwd:${k3.pwd}\r\n`);
    expect(tueren[3]).toContain(`a=fingerprint:sha-256 ${FP}`);
    expect(tueren[3]).toContain(" 192.168.178.20 40003 typ host");
    expect(tueren[3]).toContain(".local 41003 typ host");
    // Die dritte Adresse hat diese Tür nicht (Port 0): Sie fehlt.
    expect(tueren[3]!.match(/a=candidate:/g)).toHaveLength(2);
    // Jede Tür hat eigene Kennwörter, und keine die des Angebots.
    expect(new Set(tueren.map((x) => /a=ice-pwd:(.*)/.exec(x)![1])).size).toBe(TUEREN);
    expect(tueren.join("")).not.toContain("kQ3vW9zR1tY5uI8oP2aS4dF6");
  });

  it("liest die Ports einer Tür zu den Adressen des Angebots", () => {
    const adressen = angebotAdressen(CHROME_ANGEBOT);
    expect(adressen).toEqual(["192.168.178.20", "3d5c7a10-2b4e-4f6a-8c9d-0e1f2a3b4c5d.local", "fd00::1a2b:3c4d"]);
    const tuer = CHROME_ANGEBOT.replace(" 54321 typ host", " 50111 typ host").replace(" 49152 typ host", " 50222 typ host").replace(/a=candidate:2222222222.*\r\n/, "");
    expect(tuerPortsLesen(tuer, adressen)).toEqual([50111, 50222, 0]);
  });

  it("Sammeltür (Firefox): Die Türen stehen unter eigenen Adressen und teilen sich die Kennwörter der Tür 0", async () => {
    const NAME = "986d771c-0de9-4826-9d4d-071428227d96.local";
    const ports = Array.from({ length: TUEREN }, (_, i) => [52000 + i]);
    const code = signalKodieren({ art: "angebot", sdp: CHROME_ANGEBOT }, ports, [NAME]);
    // Ein Name mehr im Code: Er bleibt so grob wie mit einzelnen Türen.
    expect(QRCode.create(code, { errorCorrectionLevel: "L" }).version).toBeLessThanOrEqual(16);
    const s = signalDekodieren(code);
    expect(s.tueren).toEqual(ports);
    expect(s.tuerAdressen).toEqual([NAME]);
    const tueren = await tuerAngebote(s.sdp, s.tueren!, s.tuerAdressen);
    const k0 = await tuerKennwoerter(s.sdp, 0);
    expect(tueren).toHaveLength(TUEREN);
    expect(tueren.every((t) => t.includes(`a=ice-ufrag:${k0.ufrag}\r\n`) && t.includes(`a=ice-pwd:${k0.pwd}\r\n`))).toBe(true);
    expect(tueren[5]).toContain(` ${NAME} 52005 typ host`);
    expect(tueren[5]!.match(/a=candidate:/g)).toHaveLength(1);
    // Die Adressen des Angebots selbst bleiben, wie sie waren.
    expect(angebotAdressen(s.sdp).slice(0, 2)).toEqual(angebotAdressen(CHROME_ANGEBOT).slice(0, 2));
    expect(angebotAdressen(s.sdp)).toHaveLength(3);
  });

  it("liest die Adressen einer Sammeltür ohne Doppelte und leitet die Kennwörter der Klopfer aus dem Angebot ab", async () => {
    const zeile = (n: number, port: number) => `a=candidate:${n} 1 UDP 2122252543 986D771C-0de9-4826-9d4d-071428227d96.local ${port} typ host\r\n`;
    expect(tuerAdressenLesen(`m=audio 9 x\r\n${zeile(0, 52000)}m=audio 9 x\r\n${zeile(0, 52001)}`)).toEqual(["986d771c-0de9-4826-9d4d-071428227d96.local"]);
    const k = await klopfKennwoerter(CHROME_ANGEBOT);
    expect(k).toEqual(await klopfKennwoerter(CHROME_ANGEBOT));
    expect(k.ufrag).not.toBe((await kennwoerterAbleiten(CHROME_ANGEBOT)).ufrag);
    expect(k.ufrag).not.toBe((await tuerKennwoerter(CHROME_ANGEBOT, 0)).ufrag);
  });

  it("ein Angebot ohne Türen bleibt lesbar und nennt keine", () => {
    expect(signalDekodieren(signalKodieren({ art: "angebot", sdp: CHROME_ANGEBOT })).tueren).toBeUndefined();
  });

  it("setzt am ersten Gerät aus dem angeklopften Fingerabdruck die Antwort zusammen, ohne Adressen", () => {
    const sdp = antwortAusFingerabdruck(fingerabdruckVon(ANTWORT), CHROME_ANGEBOT, { ufrag: "ABCD1234", pwd: "0123456789ABCDEFGHJKMNPQRSTVWXYZ" });
    expect(sdp).toContain(`a=fingerprint:sha-256 ${FP}`);
    expect(sdp).toContain("a=ice-ufrag:ABCD1234\r\n");
    expect(sdp).toContain("a=setup:active");
    expect(sdp).not.toContain("a=candidate:");
    expect(sdp).not.toContain("a=end-of-candidates");
  });

  it("leitet auf beiden Geräten dieselben Kennwörter aus dem Angebot ab, für ein anderes Angebot andere", async () => {
    const a = await kennwoerterAbleiten(CHROME_ANGEBOT);
    // Das zweite Gerät kennt das Angebot nur aus dem Code: in anderer Zeilenfolge und ohne Formalien.
    const b = await kennwoerterAbleiten(signalDekodieren(signalKodieren({ art: "angebot", sdp: CHROME_ANGEBOT }, PORTS)).sdp);
    expect(b).toEqual(a);
    expect(a.ufrag).toMatch(/^[0-9A-Z]{8}$/);
    expect(a.pwd).toMatch(/^[0-9A-Z]{32}$/);
    const c = await kennwoerterAbleiten(CHROME_ANGEBOT.replace("kQ3vW9zR1tY5uI8oP2aS4dF6", "kQ3vW9zR1tY5uI8oP2aS4dF7"));
    expect(c.pwd).not.toBe(a.pwd);
    expect((await tuerKennwoerter(CHROME_ANGEBOT, 0)).pwd).not.toBe(a.pwd);
  });

  it("nimmt eine gescannte Antwort auch ohne Adressen an", () => {
    const ohne = ANTWORT.split("\r\n").filter((z) => !z.startsWith("a=candidate:")).join("\r\n");
    const s = signalDekodieren(signalKodieren({ art: "antwort", sdp: ohne }));
    expect(s.sdp).not.toContain("a=candidate:");
    expect(s.sdp).not.toContain("a=end-of-candidates");
    expect(s.sdp).toContain(FP);
  });
});

describe("Netzanzeige beim Koppeln", () => {
  it("warnt nur, wenn beide Adressen bekannt sind und in verschiedenen Netzen liegen", () => {
    expect(verschiedeneNetze(["192.168.178.20"], ["192.168.178.31"])).toBe(false);
    expect(verschiedeneNetze(["192.168.178.20"], ["10.0.0.5"])).toBe(true);
    expect(verschiedeneNetze(["192.168.178.20", "10.0.0.7"], ["10.0.0.5"])).toBe(false);
    // Verbirgt ein Browser seine Adresse, lässt sich nichts vergleichen: keine Warnung.
    expect(verschiedeneNetze(["3d5c7a10-2b4e-4f6a-8c9d-0e1f2a3b4c5d.local"], ["10.0.0.5"])).toBe(false);
    expect(verschiedeneNetze([], ["10.0.0.5"])).toBe(false);
  });
});
