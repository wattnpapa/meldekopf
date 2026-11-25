/**
 * Kopplungs-Code: packen und wieder auspacken (neu im Meldekopf, ADR-009).
 */

import { describe, expect, it } from "vitest";
import QRCode from "qrcode";
import { usBelegungZurueck } from "../eingang/tastaturbelegung";
import { KURZCODE_ZEICHEN, istKurzcode, kennwoerterAbleiten, kurzcodeBereinigen, kurzcodeDekodieren, kurzcodeKodieren, signalDekodieren, signalKodieren } from "./signal";
import { KOPPLUNG_MARKE, istKopplungsCode } from "./zustand";

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

describe("Antwort-Code zum Eintippen", () => {
  const ANTWORT = CHROME_ANGEBOT.replace("a=setup:actpass", "a=setup:active");
  const KENNWOERTER = { ufrag: "ABCD1234", pwd: "0123456789ABCDEFGHJKMNPQRSTVWXYZ" };

  it("trägt nur den Fingerabdruck: 53 Zeichen in Vierergruppen, ohne verwechselbare Buchstaben", () => {
    const kurz = kurzcodeKodieren(ANTWORT);
    expect(kurz).toMatch(/^([0-9A-HJKMNP-TV-Z]{4}-){13}[0-9A-HJKMNP-TV-Z]$/);
    expect(kurzcodeBereinigen(kurz)).toHaveLength(KURZCODE_ZEICHEN);
    expect(istKurzcode(kurz)).toBe(true);
    expect(istKurzcode(signalKodieren({ art: "antwort", sdp: ANTWORT }))).toBe(false);
  });

  it("ergibt am ersten Gerät eine Antwort mit Fingerabdruck und den abgeleiteten Kennwörtern, ohne Adressen", () => {
    const s = kurzcodeDekodieren(kurzcodeKodieren(ANTWORT), CHROME_ANGEBOT, KENNWOERTER);
    expect(s.art).toBe("antwort");
    expect(s.sdp).toContain(`a=fingerprint:sha-256 ${FP}`);
    expect(s.sdp).toContain("a=ice-ufrag:ABCD1234\r\n");
    expect(s.sdp).toContain("a=ice-pwd:0123456789ABCDEFGHJKMNPQRSTVWXYZ\r\n");
    expect(s.sdp).toContain("a=setup:active");
    expect(s.sdp).toContain("a=mid:0");
    expect(s.sdp).not.toContain("a=candidate:");
    expect(s.sdp).not.toContain("a=end-of-candidates");
  });

  it("verzeiht, wie Menschen abtippen: klein, ohne Striche, mit Leerzeichen, O statt 0, I und L statt 1", () => {
    const kurz = kurzcodeKodieren(ANTWORT);
    const getippt = kurz.replace(/-/g, " ").toLowerCase().replace(/0/g, "o").replace(/1/g, "l");
    expect(kurzcodeDekodieren(`  ${getippt}\n`, CHROME_ANGEBOT, KENNWOERTER).sdp).toContain(FP);
  });

  it("bemerkt einen Tippfehler am Prüfbyte und nennt eine falsche Länge", () => {
    const kurz = kurzcodeBereinigen(kurzcodeKodieren(ANTWORT));
    const falsch = (kurz[7] === "A" ? "B" : "A").padStart(8, kurz.slice(0, 7)) + kurz.slice(8);
    expect(falsch).toHaveLength(KURZCODE_ZEICHEN);
    expect(() => kurzcodeDekodieren(falsch, CHROME_ANGEBOT, KENNWOERTER)).toThrow(/stimmt nicht/);
    expect(() => kurzcodeDekodieren(kurz.slice(0, 40), CHROME_ANGEBOT, KENNWOERTER)).toThrow(/53 Zeichen, eingegeben sind 40/);
  });

  it("leitet auf beiden Geräten dieselben Kennwörter aus dem Angebot ab, für ein anderes Angebot andere", async () => {
    const a = await kennwoerterAbleiten(CHROME_ANGEBOT);
    // Das zweite Gerät kennt das Angebot nur aus dem Code: in anderer Zeilenfolge und ohne Formalien.
    const b = await kennwoerterAbleiten(signalDekodieren(signalKodieren({ art: "angebot", sdp: CHROME_ANGEBOT })).sdp);
    expect(b).toEqual(a);
    expect(a.ufrag).toMatch(/^[0-9A-Z]{8}$/);
    expect(a.pwd).toMatch(/^[0-9A-Z]{32}$/);
    const c = await kennwoerterAbleiten(CHROME_ANGEBOT.replace("kQ3vW9zR1tY5uI8oP2aS4dF6", "kQ3vW9zR1tY5uI8oP2aS4dF7"));
    expect(c.pwd).not.toBe(a.pwd);
  });

  it("nimmt eine gescannte Antwort auch ohne Adressen an, ein Angebot ohne Adressen nicht", () => {
    const ohne = ANTWORT.split("\r\n").filter((z) => !z.startsWith("a=candidate:")).join("\r\n");
    const s = signalDekodieren(signalKodieren({ art: "antwort", sdp: ohne }));
    expect(s.sdp).not.toContain("a=candidate:");
    expect(s.sdp).not.toContain("a=end-of-candidates");
    expect(s.sdp).toContain(FP);
  });
});
