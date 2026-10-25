/**
 * Die Eingänge der Sammlung: Kamera-Scan (Kiosk), Handscanner, Foto eines
 * QR-Codes, Bilderstapel, JSON- und PDF-Dateien, Sammel-PDF und Einsatz-Datei,
 * Bogen-Link (Fragment, Universal Link, Kaltstart, wartender Link) — samt
 * Rückfragen („Einheit ist bereits gemeldet", „Ist das dieselbe Einheit?",
 * welche Fassung gilt), Quittungen und dem Rückweg nach dem Zusammenlegen.
 *
 * Herkunft: Erfassungsbogen `src/app/app.tsx` (Commit 441811c), die Funktionen
 * `bogenInSammlung`, `vorrangKlaeren`, `vorrangSetzen`, `vorrangImStapel`,
 * `aehnlichImStapel`, `zusammenlegungZuruecknehmen`, `uebernehmeText`,
 * `uebernehmeQrText`, `scanErgebnisWeb`, `scanAbbrechen`, `scanneQr`,
 * `scanneInEinsatz`, `ladeQrBild`, `boegenAusDatei`, `siegelAusPdfQr`,
 * `boegenAufnehmen`, `importiereStapel`, `importiereBoegen`,
 * `sammlungInZielUebernehmen`, `boegenAlsNeuerEinsatz`, `importiereQrBilder`,
 * `importiereEinsatzDatei` und die Link-Empfänger, mit ihren Begründungen
 * (R2-A5, R2-E5, R2-O2, R3-A1, R3-E4, R3-W1/W3, R4-E1, R4-N1, R4-W1/W4,
 * R5-K1, R5-S6, R5-W2/W6, R6-N2, R7-K5, R9-W5 …). Übernommen, nicht neu
 * gebaut; geändert nur, was den eigenen Bogen und den Assistenten des
 * Erfassungsbogens voraussetzt:
 *  - „Wohin damit?" bietet statt „Bogen öffnen" eine neue Sammlung und den
 *    Erfassungsbogen an (`empfangsZielWaehlen`, `uebernimmBogen`).
 *  - Eine geteilte Vorlage wird nicht importiert, sondern in den
 *    Erfassungsbogen verwiesen.
 *  - Der Kaltstart mit Link läuft wie ein Link bei laufender App über die
 *    Rückfrage; es gibt keinen Bogen, der sich sofort öffnen ließe.
 * Als Hook gebaut, weil `app.tsx` im Meldekopf nur Startseite und Weiche trägt
 * (Übernahme-Doku, Abschnitt E).
 */

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { staerke, type Erfassungsbogen } from "@bos/eeb-format/model";
import {
  EEB_URL_PREFIX,
  base64UrlKodieren,
  decodePayloadUrl,
  decodeVorlagePayloadUrl,
  encodePayload,
  istVorlageNutzlast,
  payloadAusText,
} from "@bos/eeb-format/codec";
import { signaturVonPayload, signaturVonText, type SignaturStatus } from "@bos/eeb-format/signatur";
import { bogenAnonymisiert, datenschutzfristAbgelaufen, DATENSCHUTZFRIST_TAGE } from "@bos/eeb-format/datenschutzfrist";
import {
  EinsatzArt,
  MeldeStatus,
  bogenInhaltsId,
  einheitSchluessel,
  meldungEntfernen,
  type EintragSignatur,
  type Einsatzsammlung,
  type MeldeEintrag,
} from "@bos/meldekopf/einsaetze";
import { bogenDiff, diffKurzfassung } from "@bos/meldekopf/meldung-diff";
import { einheitOrt } from "@bos/meldekopf/darstellung";
import { frageJaNein, frageWahl, type Antwortweg } from "@bos/oberflaeche/dialoge";
import { ART_LABEL, type Eingang } from "../einsaetze-ui";
import { einsaetzeLaden, einsaetzePapierkorb } from "../einsaetze-lesen";
import { einsatzErfragen } from "../einsatz-erfragen";
import {
  SpeicherVollFehler,
  istSpeicherVoll,
  meldungAufnehmen,
  speicherVollMeldung,
  vomPapierMarkieren,
  zeitLang,
} from "../eintrag-zeiten";
import { fassungGiltSetzen, fassungInHistorieLegen, fassungPruefen, fassungenJeEinheit, geltendeJeEinheit, type FassungsPruefung } from "../fassung-vorrang";
import { anzahlEinheiten, letzteMeldung, nummernWechsel, nummernWechselText, rueckkehrText } from "../einheiten-tabelle";
import { aktuelleMeldungen } from "../auswertung";
import { browserKompressor, einheitAnzeigename, nurSollstaerke, zeitpunktDeutsch } from "../hilfen";
import { datenschutzZeitpunkt } from "../datenschutz-uhr";
import { entfernteImImportKlaeren } from "../entfernte-meldungen";
import { letztenEinsatzLaden } from "../letzter-einsatz";
import { meldungenVergleichen, steckbriefZeile, type MeldungsVergleich } from "../meldungs-vergleich";
import { fehlerText } from "../nachladen";
import { bogenLinksEmpfangen, istNativ, qrScannen } from "../nativ";
import { aehnlicherOrt, andererEinheitstyp } from "../schnellerfassung/nacherfassung";
import { istNurStaerke, nurStaerkeUebernehmen, wasWegfiele } from "../schnellerfassung/nur-staerke";
import { abgleichGliederung, abgleichText, einsatzAbgleichen, sammlungFuerZiel, type Einzelheit } from "../weitergabe/einsatz-abgleich";
import {
  ablehnungsSatz,
  abgelehnteBoegen,
  boegenAusJsonTextMitUrsachen,
  boegenAusPdfBytes,
  einsatzAusDatei,
  einsatzAusPdfBytes,
  istPdfDatei,
  pdfInhaltArt,
} from "../weitergabe/einsatz-transport";
import { exportStaendeUebernehmen, weitergabeUmImportErgaenzen } from "../weitergabe/export-stand";
import { lageAngabenUebernehmen } from "../weitergabe/lage-angaben";
import { dateiFehlerMeldung } from "./datei-fehler";
import { qrAusBild } from "./qr-bild";
import type { QrBogen } from "./qr-boegen";
import {
  LAGE_NACHTRAGEN_HINWEIS,
  SAMMLUNG_IN_PDF_HINWEIS,
  dateiImportMeldung,
  istBilddatei,
  qrStapelLesen,
  stapelBericht as stapelBerichtZeilen,
  teileMerker,
  type DateiAnteil,
} from "./qr-stapel";
import { fehlendeTeile, fehltNochSatz } from "./teil-quittung";
import { entwirreScanText } from "./tastaturbelegung";
import { wartendenLinkErledigt, wartendenLinkLesen, wartendenLinkMerken } from "./wartender-link";
import {
  istSegmentNutzlast,
  parseSegmentUrl,
  segmentSammeln,
  segmentePayload,
  segmenteZuBogen,
  type SegmentTeil,
} from "@bos/eeb-format/codec";

/** Wahl in „Wohin damit?": neue Sammlung anlegen. */
const NEUE_SAMMLUNG = "neue-sammlung";
/** Wahl in „Wohin damit?": im Erfassungsbogen öffnen. */
const ERFASSUNGSBOGEN = "erfassungsbogen";

/**
 * Datenschutzfrist beim Öffnen eines Bogens von außen (Scan, Link, Datei): Ist
 * sie abgelaufen, wird nur die anonymisierte Fassung übernommen. Wer das
 * Ergebnis `anonymisiert` erhält, verwirft auch Signaturnachweis und
 * Rohpayload — sie deckten den veränderten Inhalt nicht mehr und trügen die
 * Namen beim Weiterreichen im Klartext weiter.
 */
function bogenNachFrist(b: Erfassungsbogen): { bogen: Erfassungsbogen; anonymisiert: boolean } {
  if (!datenschutzfristAbgelaufen(b, datenschutzZeitpunkt())) return { bogen: b, anonymisiert: false };
  return { bogen: bogenAnonymisiert(b), anonymisiert: true };
}


const FRIST_ABGELAUFEN_MELDUNG =
  `Die Datenschutzfrist dieses Bogens ist abgelaufen (${DATENSCHUTZFRIST_TAGE} Tage nach der letzten Änderung) — ` +
  "Namen, Funktionen, Qualifikationen und Erreichbarkeiten wurden entfernt.";


/**
 * Fragment aus der Adresszeile holen und dort entfernen, damit die Daten nicht
 * im Verlauf hängen bleiben. Gemeinsame Grundlage für den Kaltstart und für
 * `hashchange` (siehe den Listener in `App`).
 */
function fragmentNehmen(): string {
  const fragment = window.location.hash.slice(1);
  if (fragment) {
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
  }
  return fragment;
}


/**
 * Meldung bei einem Link ohne lesbaren Bogen — mit dem nächsten Schritt: Meist
 * ist er auf dem Weg gekürzt worden (Chat, Mail), und der Absender hat QR-Code
 * und PDF zur Hand (Audit Runde 4, R4-E7).
 */
const LINK_UNGUELTIG =
  "Der geöffnete Link enthält keinen gültigen Erfassungsbogen. Er ist vermutlich unterwegs abgeschnitten worden — " +
  "bitte den QR-Code oder die PDF des Absenders verwenden oder den Link neu anfordern.";


/**
 * Fehlertext für einen Scan, aus dem sich kein Bogen lesen ließ — mit dem
 * Anfang dessen, was tatsächlich ankam.
 *
 * Nötig wegen der USB-Handscanner: Sie tippen den Code als Tastenfolge, und
 * steht der Scanner auf einer anderen Tastaturbelegung als der Rechner, kommt
 * er verstümmelt an („https:--erfassungsbogen.app§…" statt „…app/#…"). Der
 * Bogen ist dann in Ordnung und der Scan technisch erfolgreich — nur die
 * Zeichen stimmen nicht. Ohne den empfangenen Anfang ist das im Feld nicht zu
 * erkennen, und die Meldung „kein gültiger Erfassungsbogen" zeigt auf den
 * falschen Schuldigen.
 */
/** Trägt der Text einen Bogen, eine Vorlage oder einen Segment-Teil? */
function istLesbarerScan(text: string): boolean {
  try {
    if (istSegmentNutzlast(text)) {
      parseSegmentUrl(text);
      return true;
    }
    if (istVorlageNutzlast(text)) {
      decodeVorlagePayloadUrl(text, browserKompressor);
      return true;
    }
    decodePayloadUrl(text, browserKompressor);
    return true;
  } catch {
    return false;
  }
}


/** Hinweis nach einem zurückgerechneten Scan — die Einstellung selbst bleibt falsch. */
const BELEGUNG_HINWEIS =
  "Der Handscanner tippt in einer anderen Tastaturbelegung (US) als der Rechner; die App hat den Code zurückgerechnet. "
  + "Dauerhaft behoben ist es, wenn der Scanner auf Deutschland/DE gestellt wird — die Anleitung zeigt unter „USB-Handscanner einrichten\" die Codes zum Abscannen.";


export function scanFehlertext(text: string): string {
  const anfang = text.trim().slice(0, 40);
  const gezeigt = `Empfangen: „${anfang}${text.trim().length > 40 ? "…" : ""}"`;
  // Unser Link, aber ohne die Raute: Genau so sieht eine falsche Belegung aus.
  if (/erfassungsbogen/i.test(text) && !text.includes("#")) {
    return `Der Code kam verstümmelt an — der Handscanner ist vermutlich auf eine andere Tastaturbelegung eingestellt als der Rechner (Deutsch/DE). ${gezeigt}`;
  }
  return `Der gescannte QR-Code enthält keinen gültigen Erfassungsbogen. ${gezeigt}`;
}


/** SignaturStatus → gespeicherter Eintragsstatus (nur signierte Empfänge). */
function alsEintragSignatur(status: SignaturStatus): EintragSignatur | undefined {
  if (status.zustand === "unsigniert") return undefined;
  if (status.zustand === "ungueltig") {
    return { zustand: status.zustand, pubkey: status.pubkey, kurzform: status.kurzform };
  }
  return {
    zustand: status.zustand,
    pubkey: status.pubkey,
    kurzform: status.kurzform,
    absender: status.absender,
  };
}


/**
 * Kurzer Bestätigungston für den Kiosk-Scan (Meldekopf sammelt viele Bögen):
 * hoher Ton = aufgenommen, tiefer Ton = Duplikat. Ohne Audio-Unterstützung
 * passiert einfach nichts — der Ton ist reiner Komfort.
 */
function piep(erfolg: boolean): void {
  try {
    const Ctor =
      window.AudioContext ??
      (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    const ctx = new Ctor();
    const oszillator = ctx.createOscillator();
    const pegel = ctx.createGain();
    oszillator.type = "sine";
    oszillator.frequency.value = erfolg ? 880 : 330;
    pegel.gain.value = 0.08;
    oszillator.connect(pegel).connect(ctx.destination);
    oszillator.start();
    oszillator.stop(ctx.currentTime + 0.18);
    oszillator.onended = () => void ctx.close();
  } catch {
    /* kein Ton möglich — egal */
  }
}


/** „1 / 1 / 2 / 4" — die Stärke in der Kurzform des Bogens. */
function staerkeKurz(b: Erfassungsbogen): string {
  const s = staerke(b);
  return `${s.fuehrer} / ${s.unterfuehrer} / ${s.mannschaft} / ${s.gesamt}`;
}


/**
 * Quittung im Kiosk-Stapel, wenn eine Fassung nicht nach dem Zeitstempel
 * gelten soll (R4-W1): keine Rückfrage beim Dauerscannen, aber ein Satz,
 * der sagt, was gilt und wo es sich ändern lässt.
 */
function vorrangKioskText(p: FassungsPruefung): string {
  const bisher = zeitpunktDeutsch(p.bisher.bogen.stand);
  if (p.lage === "aelter") return `älterer Stand als der vorhandene (${bisher}) — nur in die Historie gelegt`;
  if (p.lage === "gleiche-minute") return `gleicher Stand wie die bisherige Fassung (${bisher}) — die eben gescannte gilt, an der Karte unter „Historie" änderbar`;
  return `älterer Stand als die Schnellerfassung (${bisher}) — an der Karte „Bogen übernehmen" tippen`;
}


/**
 * Bisherige und neue Meldung in der Rückfrage nebeneinander (R4-N1): Stärke,
 * Ansprechperson, Kennzeichen, Stand — und ein Hinweis, wenn sie keine Person
 * und kein Fahrzeug gemeinsam haben. Steht im `<p>` der Rückfrage, darum nur
 * Inline-Elemente.
 */
function MeldungsGegenueberstellung({ vergleich, warAbgerueckt = false }: { vergleich: MeldungsVergleich; warAbgerueckt?: boolean }) {
  return (
    <>
      <br />
      <span className="meldungs-vergleich">
        <strong>Bisher:</strong> {steckbriefZeile(vergleich.bisher)}
        <br />
        <strong>Neu:</strong> {steckbriefZeile(vergleich.neu)}
        {vergleich.geaendert && (
          <>
            <br />
            <strong>Geändert:</strong> {vergleich.geaendert}
          </>
        )}
        {warAbgerueckt && (
          <>
            <br />
            <strong className="rueckkehr-hinweis">⚠ Die Einheit war abgerückt – mit der neuen Fassung zählt sie wieder mit.</strong>
          </>
        )}
      </span>
      {vergleich.keineUeberschneidung && (
        <>
          <br />
          <span className="warnung-text">
            ⚠ Keine gemeinsame Person, kein gemeinsames Fahrzeug — vielleicht eine andere Gruppe?
          </span>
        </>
      )}
    </>
  );
}


/** Was die App der Aufnahme hineinreicht. */
export interface AufnahmeVerdrahtung {
  offenerEinsatzId: string | null;
  setOffenerEinsatzId: (id: string | null) => void;
  einsaetzeNeuLaden: () => void;
  setMeldung: (text: string) => void;
  setFehler: (text: string) => void;
}

/** Die zuletzt zusammengelegte Meldung — für Quittung und Rückweg (R4-E1). */
export interface Zusammenlegung {
  einsatzId: string;
  eintragId: string;
  bogen: Erfassungsbogen;
  quelle: "scan" | "manuell" | "pdf-import";
  signatur?: EintragSignatur;
  herkunft?: string;
  neu: string;
  alt: string;
}

export function useAufnahme({ offenerEinsatzId, setOffenerEinsatzId, einsaetzeNeuLaden, setMeldung, setFehler }: AufnahmeVerdrahtung) {
  /**
   * Welche Zeile der Einheitenliste gehört zum gerade aufgenommenen Bogen?
   * Der Zähler unterscheidet zwei Aufnahmen derselben Einheit.
   */
  const [eingang, setEingang] = useState<Eingang | null>(null);
  const eingangZaehler = useRef(0);
  /** Grund, aus dem das letzte Ablegen in eine Sammlung scheiterte (voller Speicher o. ä.). */
  const ablageFehler = useRef<string | null>(null);
  // Sammelziel als Ref: der laufende (asynchrone) Scan-Loop und die
  // Scanner-Callbacks lesen sonst einen veralteten Closure-Stand.
  const sammelZielRef = useRef<string | null>(null);
  const setSammelZiel = (id: string | null) => {
    sammelZielRef.current = id;
  };
  const [scannerOffen, setScannerOffenRoh] = useState(false);
  const scannerOffenRef = useRef(false);
  const setScannerOffen = (offen: boolean) => {
    scannerOffenRef.current = offen;
    setScannerOffenRoh(offen);
  };
  // Stapel-Einlesen vieler QR-Bilder: laufender Stand und der Bericht danach.
  const [stapelStand, setStapelStand] = useState("");
  const [stapelBericht, setStapelBericht] = useState<string[]>([]);
  // Der Knopf im Bericht öffnet den Abgleich vom Papier (R4-A6).
  const [abgleichAnstoss, setAbgleichAnstoss] = useState(0);
  // Rückmeldung von „Bögen einlesen…" unter den Aufnahme-Knöpfen (R3-L1, R3-E4).
  const [einlese, setEinlese] = useState<{ fehler: string; meldung: string; einzelheiten?: Einzelheit[] } | null>(null);
  const stapelAbbruchRef = useRef(false);
  // Kiosk-Scan: Zähler der in diesem Durchgang aufgenommenen Bögen.
  const kioskZaehlerRef = useRef(0);
  // Segmentierung: gesammelte Teile eines großen Bogens (Ref für den laufenden
  // Scan, Zustand für die Kästchenzeile) + Fortschrittstext fürs Overlay.
  const segmentTeileRef = useRef<SegmentTeil[]>([]);
  const [segmentStand, setSegmentStand] = useState<SegmentTeil[]>([]);
  const setzeSegmentTeile = (teile: SegmentTeil[]) => {
    segmentTeileRef.current = teile;
    setSegmentStand(teile);
  };
  const [scanFortschritt, setScanFortschritt] = useState("");
  const [zusammenlegung, setZusammenlegung] = useState<Zusammenlegung | null>(null);
  /** Fehlertext des letzten Scans — gesetzt von uebernehmeText, gelesen vom Web-Scanner. */
  const scanFehlerRef = useRef<string | null>(null);

  /** Merkt die Zeile zum gerade aufgenommenen Bogen vor (siehe `eingang`). */
  function markiereEingang(schluessel: string) {
    eingangZaehler.current += 1;
    setEingang({ schluessel, nonce: eingangZaehler.current });
  }


  /** QR-Code aus einem Foto/Screenshot einlesen — gleiche Pipeline wie der Scan. */
  async function ladeQrBild(e: ChangeEvent<HTMLInputElement>) {
    const datei = e.target.files?.[0];
    e.target.value = "";
    if (!datei) return;
    try {
      const text = await qrAusBild(datei);
      if (!text) {
        setFehler("Im Bild wurde kein QR-Code gefunden — am besten ein scharfes, möglichst gerades Foto des Codes verwenden.");
        return;
      }
      setFehler("");
      await uebernehmeText(text, "Der QR-Code im Bild enthält keinen gültigen Erfassungsbogen.");
    } catch (err) {
      setFehler(err instanceof Error ? err.message : String(err));
    }
  }


  /**
   * Bogen in eine Einsatz-Sammlung aufnehmen (Meldekopf/Zugführer). Erkennt die
   * App die Einheit schon im Einsatz, wird die Zuordnung bestätigt (neue Fassung
   * = Historie) oder als eigene Einheit geführt (Vorschlag+Bestätigung).
   */
  async function bogenInSammlung(
    zielId: string,
    b: Erfassungsbogen,
    quelle: "scan" | "manuell" | "pdf-import",
    /**
     * Was beim Empfang mitkam: geprüfter Signaturstatus und der rohe Payload.
     * Letzterer wird mitgespeichert, damit der Meldekopf die Meldung später mit
     * erhaltener Original-Signatur weiterreichen kann (Gegenzeichnen).
     */
    empfang?: { signatur?: EintragSignatur; herkunft?: Uint8Array | null },
    /** Kiosk-Scan: Rückmeldung ins Scanner-Overlay statt Ansichtswechsel. */
    kiosk = false,
    /** Satz hinter der Quittung — etwa, dass der eigene Bogen offen bleibt. */
    zusatz = "",
  ): Promise<boolean> {
    ablageFehler.current = null;
    const einsatz = einsaetzeLaden().find((s) => s.id === zielId);
    const schl = einheitSchluessel(b.einheit);
    // Gleicher Inhalt schon da? Dann gibt es nichts zu fragen — der Kern
    // überspringt ihn ohnehin, die Rückfrage davor war nur Stapel-Bremse
    // (Audit „Stress", S1; „Offline", O3).
    const schonDa = einsatz?.eintraege.some((e) => e.id === bogenInhaltsId(b)) ?? false;
    // Ein Übungsbogen in einer echten Lage zählt nicht mit (siehe zaehltInLage).
    // Das gehört in dieselbe Zeile, die die Aufnahme quittiert — sonst steht die
    // Meldung scheinbar normal in der Liste und der Meldekopf rechnet mit ihr.
    const uebungDaneben = einsatz != null && !!b.uebung && einsatz.art !== EinsatzArt.UEBUNG;
    const uebungZusatz = uebungDaneben ? " Achtung: als ÜBUNG gekennzeichnet — zählt nicht in die Lage." : "";
    let override: string | undefined;
    const bekannt = einsatz?.eintraege.some((e) => e.einheitSchluessel === schl) ?? false;
    // Im Kiosk-Stapel keine Fachfrage: Eine veränderte Fassung derselben
    // Einheit ist laut Dialog selbst „der Normalfall" — sie wird angehängt und
    // in der Quittung als Folgemeldung genannt; die Ausnahme „zweite
    // gleichnamige Einheit" bleibt über „Aufteilen"/„Als eigene Einheit" in
    // der Einsatzansicht erreichbar.
    // Nur eine Stärke vom Papier für eine schon gemeldete Einheit: Als neue
    // Fassung fielen Fahrzeuge, Bedarf und Namen still aus den Summen. Die
    // Rückfrage sagt, was wegfiele, und bietet zuerst „Nur die Stärke
    // ändern" an (Audit Runde 3, R3-A1).
    let aufzunehmen = b;
    // Auf „Ja" bei „Ist das dieselbe Einheit?": der Name der Einheit, in die
    // die neue Meldung gelegt wurde — für Quittung und Rückweg (R4-E1).
    let zusammengelegtMit: string | null = null;
    const nurStaerkeWeg = (vorher: Erfassungsbogen): Antwortweg[] => {
      if (!istNurStaerke(b) || wasWegfiele(vorher, b).length === 0) return [];
      return [
        {
          wert: "staerke",
          label: `Nur die Stärke ändern (${staerkeKurz(vorher)} → ${staerkeKurz(b)})`,
          hinweis: `Neue Fassung mit allem Übrigen der bisherigen Meldung: ${wasWegfiele(vorher, b).join(", ")} bleiben.`,
        },
      ];
    };
    const wegfallHinweis = (vorher: Erfassungsbogen): string => {
      if (!istNurStaerke(b)) return "";
      const weg = wasWegfiele(vorher, b);
      return weg.length > 0 ? ` Fällt dabei weg: ${weg.join(", ")}.` : "";
    };
    // Wer in einer Rückfrage ausdrücklich „neue Fassung" gewählt hat, hat
    // entschieden, welche Fassung gilt — auch bei älterem oder gleichem Stand
    // im Bogen (R4-W1). "neu" = die eingehende gilt, "bisher" = sie liegt nur
    // in der Historie.
    let entschieden: "neu" | "bisher" | null = null;
    if (bekannt && !schonDa && !kiosk) {
      const bisherKopf = einsatz ? fassungenJeEinheit(einsatz.eintraege, schl)[0] : undefined;
      const bisher = bisherKopf?.bogen;
      // Älterer oder gleicher Stand im Bogen: nach dem Zeitstempel gälte er
      // nicht bzw. nur zufällig — darum hier sagen und wählen lassen (R4-W1).
      const nichtJuenger = bisher != null && b.stand <= bisher.stand;
      const platzhalterBisher = bisherKopf?.quelle === "manuell" && quelle !== "manuell";
      // Beide Meldungen nebeneinander, bevor jemand „Fassung" oder „eigene
      // Einheit" wählt: Stärke, Ansprechperson, Kennzeichen, Stand. Haben sie
      // keine Person und kein Fahrzeug gemeinsam, ist es eher eine zweite
      // Gruppe — dann steht „eigene Einheit" vorn (Audit Runde 4, R4-N1).
      const vergleich = bisher ? meldungenVergleichen(bisher, b) : null;
      const fassungWeg: Antwortweg = {
        wert: "fassung",
        label: "Als neue Fassung anhängen",
        hinweis:
          (nichtJuenger && bisher
            ? `Der Bogen trägt ${b.stand < bisher.stand ? "einen älteren Stand" : "denselben Stand"} (${zeitpunktDeutsch(b.stand)}) ${b.stand < bisher.stand ? "als" : "wie"} die bisherige Meldung (${zeitpunktDeutsch(bisher.stand)}${platzhalterBisher ? ", von Hand erfasst" : ""}) — er gilt trotzdem, die bisherige wandert in die Historie.`
            : "Der Normalfall bei einer Nachmeldung derselben Einheit: die bisherige Meldung wandert in die Historie, die neue gilt.") +
          (bisher ? wegfallHinweis(bisher) : ""),
      };
      const historieWeg: Antwortweg[] = nichtJuenger
        ? [{ wert: "historie", label: "Nur in die Historie legen", hinweis: "Die bisherige Meldung gilt weiter." }]
        : [];
      const eigeneWeg: Antwortweg = {
        wert: "eigene",
        label: "Als eigene Einheit führen",
        hinweis: "Für eine zweite, gleich benannte Einheit — beide zählen getrennt in die Summe.",
      };
      // Die Frage hat zwei gleichwertige Antworten und deshalb zwei benannte
      // Knöpfe: „OK/Abbrechen" hätte den zweiten Weg als Abbruch getarnt.
      const wahl = await frageWahl({
        titel: "Einheit ist bereits gemeldet",
        text: (
          <>
            „{einheitAnzeigename(b.einheit)}" steht in diesem Einsatz schon. Wie soll der neue Bogen dazu stehen?
            {vergleich && <MeldungsGegenueberstellung vergleich={vergleich} warAbgerueckt={bisherKopf?.status === MeldeStatus.ABGERUECKT} />}
          </>
        ),
        wege: vergleich?.keineUeberschneidung
          ? [eigeneWeg, ...(bisher ? nurStaerkeWeg(bisher) : []), fassungWeg, ...historieWeg]
          : nichtJuenger && !platzhalterBisher && b.stand < (bisher?.stand ?? 0)
            ? // Älterer Bogen nach einem echten jüngeren: Historie zuerst.
              [...historieWeg, ...(bisher ? nurStaerkeWeg(bisher) : []), fassungWeg, eigeneWeg]
            : [...(bisher ? nurStaerkeWeg(bisher) : []), fassungWeg, ...historieWeg, eigeneWeg],
      });
      if (!wahl) {
        // Abgebrochen: der Bogen bleibt draußen. Im Kiosk-Scan steht die
        // Rückmeldung im Overlay, sonst über der Ansicht.
        const text = `„${einheitAnzeigename(b.einheit)}" nicht aufgenommen.`;
        if (kiosk) setScanFortschritt(text);
        else setMeldung(text);
        return false;
      }
      if (wahl === "eigene") override = `${schl}#${Date.now()}`;
      if (wahl === "staerke" && bisher) aufzunehmen = nurStaerkeUebernehmen(bisher, staerke(b), b.stand);
      if (wahl === "fassung" || wahl === "staerke") entschieden = "neu";
      if (wahl === "historie") entschieden = "bisher";
    }
    // Ähnliche Einheit schon da (gleiche Organisation und gleicher Ort, aber
    // anderer Schlüssel — etwa nach einer Papierphase ohne Einheitstyp
    // abgetippt, jetzt gescannt)? Dann fragen, statt still eine zweite Einheit
    // anzulegen, die doppelt zählt (Audit „Analog first", A5). Im Stapel
    // keine Frage: dort gilt „anhalten kostet mehr als nachträglich
    // zusammenführen".
    if (!bekannt && !schonDa && !kiosk && einsatz) {
      // Ort ohne Vorsätze wie „OV" und auch als Teil des anderen Namens — vorher
      // buchstabengenau, „OV Albstadt" ≠ „Albstadt" zählte doppelt (R2-A5).
      const ort = einheitOrt(b.einheit);
      const aehnlich = geltendeJeEinheit(einsatz.eintraege).find(
        (e) =>
          e.einheitSchluessel !== schl &&
          e.bogen.einheit.organisation === b.einheit.organisation &&
          // Zwei eingetragene, verschiedene Einheitstypen sind zwei Einheiten
          // (Bergungsgruppe und Fachgruppe Räumen desselben OV, R4-E1).
          !andererEinheitstyp(e.bogen.einheit, b.einheit) &&
          aehnlicherOrt(einheitOrt(e.bogen.einheit), ort),
      );
      if (aehnlich) {
        const vergleich = meldungenVergleichen(aehnlich.bogen, b);
        const wahl = await frageWahl({
          titel: "Ist das dieselbe Einheit?",
          text: (
            <>
              In diesem Einsatz steht schon „{einheitAnzeigename(aehnlich.bogen.einheit)}". Die neue Meldung heißt „
              {einheitAnzeigename(b.einheit)}".
              <MeldungsGegenueberstellung vergleich={vergleich} />
            </>
          ),
          // Der sichere Weg vorn: Die Namen sind verschieden, und wer unter
          // Zeitdruck den hervorgehobenen Knopf nahm, ließ eine Einheit aus
          // der Lage fallen (R4-E1). Zusammenlegen bleibt ein Tipp weiter —
          // und lässt sich in der Quittung zurücknehmen.
          wege: [
            {
              wert: "eigene",
              label: "Nein — als eigene Einheit führen",
              hinweis: "Beide zählen getrennt in die Summe.",
            },
            ...nurStaerkeWeg(aehnlich.bogen).map((w) => ({
              ...w,
              label: `Ja — nur die Stärke von „${einheitAnzeigename(aehnlich.bogen.einheit)}" ändern (${staerkeKurz(aehnlich.bogen)} → ${staerkeKurz(b)})`,
            })),
            {
              wert: "gleich",
              label: `Ja — als neue Fassung von „${einheitAnzeigename(aehnlich.bogen.einheit)}"`,
              hinweis: "Die bisherige Meldung wandert in die Historie; gezählt wird eine Einheit." + wegfallHinweis(aehnlich.bogen),
            },
          ],
        });
        if (!wahl) {
          setMeldung(`„${einheitAnzeigename(b.einheit)}" nicht aufgenommen.`);
          return false;
        }
        if (wahl === "gleich") override = aehnlich.einheitSchluessel;
        if (wahl === "staerke") {
          override = aehnlich.einheitSchluessel;
          aufzunehmen = nurStaerkeUebernehmen(aehnlich.bogen, staerke(b), b.stand);
        }
        if (wahl === "gleich" || wahl === "staerke") {
          zusammengelegtMit = einheitAnzeigename(aehnlich.bogen.einheit);
          entschieden = "neu";
        }
      }
    }
    // Was sich gegenüber der vorigen Fassung ändert — für die Quittung im
    // Kiosk, bevor der Kern die neue Fassung obenauf legt.
    const vorige = bekannt && !schonDa && einsatz ? fassungenJeEinheit(einsatz.eintraege, schl)[0] : undefined;
    // Stand vor der Aufnahme — für die Frage, welche Fassung gilt (R4-W1).
    const vorherEintraege = einsatz?.eintraege ?? [];
    let r;
    try {
      // meldungAufnehmen: legt ab und lässt die Folgemeldung Zug, Auftrag und
      // Eintreffzeit der Vorgängerin erben (eintrag-zeiten.ts, R2-K1).
      r = meldungAufnehmen(zielId, aufzunehmen, {
        quelle,
        einheitSchluesselOverride: override,
        signatur: empfang?.signatur,
        herkunft: empfang?.herkunft ? base64UrlKodieren(empfang.herkunft) : undefined,
      });
    } catch (e) {
      // Voller Speicher: nichts abgelegt, und das muss sichtbar sein — der
      // Bogen bleibt beim Aufrufer offen (Audit „Offline und Speicher", O1).
      const text = istSpeicherVoll(e) ? new SpeicherVollFehler(e).message : fehlerText(e);
      ablageFehler.current = text;
      if (kiosk) setScanFortschritt(`✗ Nicht aufgenommen: ${text}`);
      else setFehler(text);
      einsaetzeNeuLaden();
      return false;
    }
    einsaetzeNeuLaden();
    if (!r) {
      setFehler("Einsatz nicht gefunden.");
      return false;
    }
    // Welche Fassung gilt? Nicht allein der Zeitstempel im Bogen: Ein
    // nachgereichter Bogen nach der Schnellerfassung oder zwei Fassungen
    // derselben Minute fragen nach (Audit Runde 4, R4-W1). Im Kiosk-Stapel
    // keine Frage — die Quittung sagt es, die Karte bietet die Übernahme an.
    const pruefung = r.neu ? fassungPruefen(vorherEintraege, einsaetzeLaden().find((x) => x.id === zielId)?.eintraege ?? [], r.eintrag.id) : null;
    let vorrang: { text: string } | null = null;
    if (pruefung && entschieden) {
      // Die Rückfrage davor hat entschieden — still umsetzen, in der Quittung nennen.
      await vorrangSetzen(zielId, entschieden === "neu" ? pruefung.neu.id : pruefung.bisher.id, entschieden === "bisher" ? pruefung.neu.id : undefined);
      vorrang = {
        text:
          entschieden === "neu"
            ? `gilt trotz ${pruefung.neu.bogen.stand < pruefung.bisher.bogen.stand ? "älterem" : "gleichem"} Stand (${zeitpunktDeutsch(pruefung.neu.bogen.stand)}); die bisherige Fassung liegt in der Historie`
            : `nur in die Historie gelegt — die bisherige Fassung (${zeitpunktDeutsch(pruefung.bisher.bogen.stand)}) gilt weiter, die Lage bleibt unverändert`,
      };
    } else if (pruefung && kiosk) {
      vorrang = { text: vorrangKioskText(pruefung) };
    } else if (pruefung) {
      vorrang = await vorrangKlaeren(zielId, pruefung);
    }
    // Holt die Folgemeldung eine abgerückte Einheit zurück, sagt die Quittung es ausdrücklich (R5-K1).
    const rueckkehrZusatz = r.neu && r.rueckkehr ? `; ⚠ ${rueckkehrText(r.rueckkehr)}, zählt wieder mit` : "";
    const folgeText =
      r.neu && vorige ? `Folgemeldung: ${diffKurzfassung(bogenDiff(vorige.bogen, aufzunehmen)) || "inhaltlich unverändert"}${rueckkehrZusatz}` : "";
    const folge =
      (vorrang && folgeText && pruefung?.lage === "gleiche-minute"
        ? ` (${folgeText}; ${vorrang.text})`
        : vorrang
          ? ` (${vorrang.text})`
          : folgeText
            ? ` (${folgeText})`
            : "") +

      (r.erbeFehlt ? " Zug, Auftrag und Eintreffzeit der vorigen Fassung konnten nicht übernommen werden (Speicher voll) — bitte an der Karte nachtragen." : "");
    if (kiosk) {
      // Dauerscannen: Piep + Zähler im Overlay, die Kamera bleibt an — beim
      // Massen-Check-in muss niemand zwischen den Bögen die Ansicht wechseln.
      if (r.neu) kioskZaehlerRef.current += 1;
      piep(r.neu);
      const stand = `${kioskZaehlerRef.current} ${kioskZaehlerRef.current === 1 ? "Bogen" : "Bögen"} in diesem Durchgang`;
      setScanFortschritt(
        r.neu
          ? `✓ „${einheitAnzeigename(b.einheit)}" aufgenommen${folge} — ${stand}.${uebungZusatz} Nächsten Bogen zeigen…`
          : `Bereits vorhanden — übersprungen (gleicher Inhalt). ${stand}.`,
      );
      setFehler("");
      return true;
    }
    setMeldung(
      r.neu
        ? `Meldung von „${einheitAnzeigename(b.einheit)}" aufgenommen${folge}.${
            aufzunehmen !== b ? " Nur die Stärke geändert — Fahrzeuge, Bedarf und Namen der bisherigen Meldung gelten weiter." : ""
          }${uebungZusatz}${zusatz ? ` ${zusatz}` : ""}`
        : `Bereits vorhanden — übersprungen (gleicher Inhalt). Die Zeile in der Liste ist quittiert.${zusatz ? ` ${zusatz}` : ""}`,
    );
    setFehler("");
    // Auch beim übersprungenen Bogen: die Frage nach dem Scan lautet „welche
    // Zeile ist gemeint?", und darauf gibt es hier eine Antwort — die Zeile,
    // die den Inhalt schon trägt. Die Rückmeldezeile sagt, ob er neu war.
    markiereEingang(r.eintrag.einheitSchluessel);
    setZusammenlegung(
      zusammengelegtMit && r.neu
        ? {
            einsatzId: zielId,
            eintragId: r.eintrag.id,
            bogen: b,
            quelle,
            signatur: empfang?.signatur,
            herkunft: empfang?.herkunft ? base64UrlKodieren(empfang.herkunft) : undefined,
            neu: einheitAnzeigename(b.einheit),
            alt: zusammengelegtMit,
          }
        : null,
    );
    setOffenerEinsatzId(zielId); // zurück in die Einsatzansicht
    return true;
  }


  /**
   * Rückfrage, welche Fassung einer Einheit gilt (Audit Runde 4, R4-W1). Die
   * Kern-Regel „jüngster Stand im Bogen" bleibt, wo sie passt; hier fragt die
   * App in den beiden Lagen, in denen sie still das Falsche wählte: der
   * nachgereichte Bogen nach einer Schnellerfassung (Vorschlag: der Bogen
   * gilt) und zwei verschiedene Fassungen derselben Minute. Ein älterer
   * Bogen nach einem jüngeren gilt nicht und wird nur benannt. Rückgabe: Satz
   * für die Quittung.
   */
  async function vorrangKlaeren(zielId: string, p: FassungsPruefung): Promise<{ text: string }> {
    const name = einheitAnzeigename(p.neu.bogen.einheit);
    const stand = (e: MeldeEintrag) => `Stand ${zeitpunktDeutsch(e.bogen.stand)}, Stärke ${staerkeKurz(e.bogen)}`;
    if (p.lage === "aelter") {
      await vorrangSetzen(zielId, p.bisher.id, p.neu.id);
      return { text: `älterer Stand als der vorhandene (${zeitpunktDeutsch(p.bisher.bogen.stand)}) — nur in die Historie gelegt, die Lage bleibt unverändert` };
    }
    const vergleich = meldungenVergleichen(p.bisher.bogen, p.neu.bogen);
    if (p.lage === "ersetzt-platzhalter") {
      const wahl = await frageWahl({
        titel: "Bogen der Einheit nachgereicht",
        text: (
          <>
            Für „{name}" gilt bisher die von Hand erfasste Meldung ({stand(p.bisher)}). Der eben eingelesene Bogen der Einheit
            trägt den älteren {stand(p.neu)} — nach dem Zeitstempel bliebe die Schnellerfassung gültig.
            <MeldungsGegenueberstellung vergleich={vergleich} />
          </>
        ),
        wege: [
          {
            wert: "bogen",
            label: "Bogen der Einheit gilt — ersetzt die Schnellerfassung",
            hinweis: "Stärke, Namen, Fahrzeuge und Bedarf aus dem Bogen; Zug, Auftrag und Eintreffzeit bleiben.",
          },
          {
            wert: "bisher",
            label: "Schnellerfassung behalten",
            hinweis: "Der Bogen liegt in der Historie; an der Karte lässt er sich später übernehmen.",
          },
        ],
        abbruch: "Später entscheiden",
      });
      if (wahl === "bogen") {
        await vorrangSetzen(zielId, p.neu.id);
        return { text: `Bogen der Einheit gilt, ersetzt die Schnellerfassung (${zeitpunktDeutsch(p.bisher.bogen.stand)})` };
      }
      return { text: `älterer Stand als die Schnellerfassung (${zeitpunktDeutsch(p.bisher.bogen.stand)}) — die Schnellerfassung gilt weiter, der Bogen liegt in der Historie` };
    }
    // Gleiche Minute: die Empfangszeit entscheidet nicht mehr.
    const wahl = await frageWahl({
      titel: "Zwei Fassungen mit demselben Stand",
      text: (
        <>
          „{name}" hat schon eine Fassung mit Stand {zeitpunktDeutsch(p.bisher.bogen.stand)} (Stärke {staerkeKurz(p.bisher.bogen)}). Die eben
          eingelesene trägt dieselbe Minute (Stärke {staerkeKurz(p.neu.bogen)}). Welche gilt?
          {/* War die Einheit abgerückt, entscheidet die Wahl auch darüber, ob sie wieder mitzählt (R5-K1). */}
          {p.neu.rueckkehr && (
            <>
              {" "}
              <strong>Die Einheit ist abgerückt{p.neu.rueckkehr.abgerueckAm != null ? ` (seit ${zeitLang(p.neu.rueckkehr.abgerueckAm)})` : ""}: Gilt die eben eingelesene, zählt sie wieder mit.</strong>
            </>
          )}
          <MeldungsGegenueberstellung vergleich={vergleich} />
        </>
      ),
      wege: [
        { wert: "neu", label: `Die eben eingelesene (Stärke ${staerkeKurz(p.neu.bogen)})${p.neu.rueckkehr ? " — Einheit zählt wieder mit" : ""}` },
        { wert: "bisher", label: `Die bisherige (Stärke ${staerkeKurz(p.bisher.bogen)})${p.neu.rueckkehr ? " — Einheit bleibt abgerückt" : ""}` },
      ],
      abbruch: "Bisherige behalten",
      fokus: "abbruch", // Enter lässt die Meldung unverändert (R9-D4)
    });
    if (wahl === "neu") {
      await vorrangSetzen(zielId, p.neu.id);
      return { text: `gleicher Stand wie die bisherige Fassung — die eben eingelesene gilt` };
    }
    await vorrangSetzen(zielId, p.bisher.id, p.neu.id);
    return { text: `gleicher Stand wie die bisherige Fassung — die bisherige gilt weiter, die eben eingelesene liegt in der Historie` };
  }


  /** Vorrang schreiben; ein voller Speicher wird gemeldet, die Aufnahme bleibt. */
  async function vorrangSetzen(zielId: string, eintragId: string, inHistorie?: string): Promise<void> {
    try {
      fassungGiltSetzen(zielId, eintragId);
      // Die eben eingelesene Fassung liegt nur in der Historie (R8-W2): als verdrängt vermerken.
      if (inHistorie) fassungInHistorieLegen(zielId, inHistorie, eintragId);
    } catch (e) {
      setFehler(istSpeicherVoll(e) ? new SpeicherVollFehler(e).message : fehlerText(e));
    }
    einsaetzeNeuLaden();
  }


  /**
   * Nach einem Stapel (Dateien, Bilder): je betroffener Einheit dieselbe
   * Rückfrage wie beim Einzeleingang (R4-W1). Selten — nur nachgereichte
   * Bögen und gleiche Minuten fragen. Rückgabe: Zeilen für die Quittung.
   */
  async function vorrangImStapel(zielId: string, vorher: MeldeEintrag[], neueIds: string[]): Promise<string[]> {
    const zeilen: string[] = [];
    for (const id of neueIds) {
      const nachher = einsaetzeLaden().find((x) => x.id === zielId)?.eintraege ?? [];
      const p = fassungPruefen(vorher, nachher, id);
      if (!p) continue;
      const r = await vorrangKlaeren(zielId, p);
      zeilen.push(`„${einheitAnzeigename(p.neu.bogen.einheit)}": ${r.text}.`);
    }
    return zeilen;
  }


  /**
   * Im Stapel fragt niemand „Ist das dieselbe Einheit?" – die Quittung nennt dafür die
   * möglichen Doppelungen (Audit Runde 6, R6-N2): „THW Albstadt" ohne Typ neben „THW Albstadt
   * Zugtrupp …" zählte doppelt, ohne dass es jemand erfuhr.
   */
  function aehnlichImStapel(zielId: string, vorher: MeldeEintrag[], neueIds: string[]): string[] {
    const sammlung = einsaetzeLaden().find((x) => x.id === zielId);
    if (!sammlung) return [];
    const geltend = geltendeJeEinheit(sammlung.eintraege);
    const zeilen: string[] = [];
    for (const id of neueIds) {
      const e = sammlung.eintraege.find((x) => x.id === id);
      if (!e || vorher.some((v) => v.einheitSchluessel === e.einheitSchluessel)) continue; // Folgemeldung, keine neue Einheit
      const ort = einheitOrt(e.bogen.einheit);
      const a = geltend.find(
        (g) =>
          g.einheitSchluessel !== e.einheitSchluessel &&
          g.bogen.einheit.organisation === e.bogen.einheit.organisation &&
          !andererEinheitstyp(g.bogen.einheit, e.bogen.einheit) &&
          aehnlicherOrt(einheitOrt(g.bogen.einheit), ort),
      );
      if (a) {
        zeilen.push(
          `„${einheitAnzeigename(e.bogen.einheit)}" ähnelt „${einheitAnzeigename(a.bogen.einheit)}" – beide zählen getrennt. Dieselbe Einheit? Dann die doppelte Karte unter „Mehr…“ › „Entfernen“ wegnehmen (mit „Rückgängig“); beide Karten tragen die Marke „ähnelt“.`,
        );
      }
    }
    return zeilen;
  }


  /**
   * „Rückgängig" nach dem Zusammenlegen (R4-E1): Die eben angehängte Fassung
   * fällt wieder heraus, die bisherige Einheit gilt wie vorher, und die neue
   * Meldung steht als eigene Einheit in der Sammlung — ohne neu zu erfassen.
   * Vorher ging das nur über „Historie → Fassung verwerfen", und die
   * Erfassung war danach weg.
   */
  function zusammenlegungZuruecknehmen() {
    const z = zusammenlegung;
    if (!z) return;
    setZusammenlegung(null);
    try {
      meldungEntfernen(z.einsatzId, z.eintragId);
      const r = meldungAufnehmen(z.einsatzId, z.bogen, { quelle: z.quelle, signatur: z.signatur, herkunft: z.herkunft });
      einsaetzeNeuLaden();
      if (r) markiereEingang(r.eintrag.einheitSchluessel);
      setFehler("");
      setMeldung(`„${z.neu}" steht jetzt als eigene Einheit in der Sammlung; „${z.alt}" gilt wie vorher.`);
    } catch (e) {
      einsaetzeNeuLaden();
      setFehler(istSpeicherVoll(e) ? new SpeicherVollFehler(e).message : fehlerText(e));
    }
  }


  /**
   * Wohin mit einer empfangenen Meldung (Link, Datei, Scan ohne offene
   * Sammlung)? Am Meldekopf fast immer „in die Sammlung" (Audit
   * „Arbeitsablauf", W1). Herkunft: `empfangsZielWaehlen` im Erfassungsbogen;
   * statt „Bogen öffnen" stehen hier „Neue Sammlung" und der Erfassungsbogen.
   *
   * Rückgabe: Einsatz-ID, NEUE_SAMMLUNG, ERFASSUNGSBOGEN oder null (abgebrochen).
   */
  async function empfangsZielWaehlen(b: Erfassungsbogen, herkunft: "Meldung" | "Datei" = "Meldung"): Promise<string | null> {
    const sammlungen = einsaetzeLaden();
    const letzte = letztenEinsatzLaden() ?? offenerEinsatzId;
    const sortiert = [...sammlungen].sort((x, y) => (x.id === letzte ? -1 : y.id === letzte ? 1 : y.geaendert - x.geaendert));
    const wege: { wert: string; label: string; hinweis: string }[] = sortiert.slice(0, 4).map((s) => ({
      wert: s.id,
      label: `In „${s.name}“ aufnehmen`,
      hinweis: `${ART_LABEL[s.art]}${s.ort ? ` · ${s.ort}` : ""} · ${aktuelleMeldungen(s.eintraege, s.art).length} Einheit(en) anwesend`,
    }));
    wege.push({
      wert: NEUE_SAMMLUNG,
      label: sammlungen.length === 0 ? "Neue Einsatz-Sammlung anlegen und aufnehmen" : "In eine neue Einsatz-Sammlung…",
      hinweis: "Name, Art und Ort im nächsten Schritt.",
    });
    wege.push({
      wert: ERFASSUNGSBOGEN,
      label: "Im Erfassungsbogen öffnen (ansehen oder bearbeiten)",
      hinweis: "Öffnet erfassungsbogen.app mit diesem Bogen; dort „An Meldekopf geben“ schickt ihn zurück.",
    });
    return frageWahl({
      titel:
        herkunft === "Datei"
          ? `Bogen von „${einheitAnzeigename(b.einheit)}" aus der Datei`
          : `Meldung von „${einheitAnzeigename(b.einheit)}" empfangen`,
      // Niemand hat gezählt: Die Zahl ist die Sollstärke der Vorbelegung — das gehört vor die Entscheidung (R9-W5).
      text: `Stärke ${staerkeKurz(b)}${nurSollstaerke(b) ? ` (nur Sollstärke: ${b.personal.length} Plätze ohne Namen, niemand hat gezählt)` : ""}${b.uebung ? " · ÜBUNG" : ""}. Wohin damit?`,
      wege,
    });
  }

  /**
   * Fertigen Bogen übernehmen: beim Scan in eine offene Sammlung (Kiosk) dort
   * ablegen, sonst fragen, wohin damit. `signatur` = Signaturstatus des
   * Transports (Herkunft), je Meldung gespeichert; `payload` sind die
   * empfangenen Rohbytes — sie erhalten die fremde Signatur fürs Weiterreichen
   * (siehe qrErzeugen/Gegenzeichnen).
   *
   * Herkunft: `uebernimmBogen` im Erfassungsbogen. Anders hier: Es gibt keinen
   * eigenen Bogen und keinen Assistenten. Statt „Bogen öffnen" bietet die
   * Rückfrage eine neue Sammlung an oder schickt den Bogen in den
   * Erfassungsbogen (ansehen, bearbeiten), so wie es dort umgekehrt
   * „An Meldekopf geben" gibt.
   *
   * Rückgabe: true = Scan beendet (Overlay/Loop schließen), false = Kiosk-Modus,
   * der Scanner bleibt für den nächsten Bogen an (Sammelziel bleibt gesetzt).
   */
  async function uebernimmBogen(
    b: Erfassungsbogen,
    signatur: SignaturStatus,
    payload?: Uint8Array | null,
    /**
     * Kein Kiosk-Scan: Link oder Datei. Ein gesetztes Sammelziel gehört dann
     * zu einem Scan-Durchgang ohne offenes Overlay — der Bogen darf nicht still
     * in dieser Sammlung landen.
     */
    opt: { ohneKiosk?: boolean } = {},
  ): Promise<boolean> {
    const ziel = sammelZielRef.current;
    if (ziel && (!opt.ohneKiosk || scannerOffenRef.current)) {
      // Abwarten: steckt in der Aufnahme eine Rückfrage, darf der Scan-Loop
      // nicht schon den nächsten Code lesen. Die Datenschutzfrist wendet die
      // Sammlung selbst an (meldungHinzufuegen).
      await bogenInSammlung(ziel, b, "scan", { signatur: alsEintragSignatur(signatur), herkunft: payload }, true);
      return false; // Kiosk: weiter scannen, bis abgebrochen wird
    }
    const wohin = await empfangsZielWaehlen(b);
    if (wohin == null) return true; // abgebrochen — nichts verändert
    if (wohin === ERFASSUNGSBOGEN) {
      imErfassungsbogenOeffnen(b, payload);
      return true;
    }
    let zielId = wohin;
    if (wohin === NEUE_SAMMLUNG) {
      const s = await einsatzErfragen();
      if (!s) return true;
      einsaetzeNeuLaden();
      zielId = s.id;
    }
    const ok = await bogenInSammlung(zielId, b, "scan", { signatur: alsEintragSignatur(signatur), herkunft: payload });
    // Nicht abgelegt, weil der Speicher voll war: Der eingelesene Bogen war
    // sonst weg, und die Einheit fuhr weiter (R2-O2). Hier gibt es keinen
    // Arbeitsbogen, in dem er liegen bleiben könnte; der Weg ist der
    // Erfassungsbogen, in den er mit einem Tipp geht.
    if (!ok && ablageFehler.current) {
      setFehler(`Nicht in die Sammlung aufgenommen: ${ablageFehler.current} Den Bogen lässt sich erneut einlesen, sobald Platz ist.`);
    }
    return true;
  }

  /**
   * Bogen im Erfassungsbogen öffnen — derselbe signierte Payload, als Link.
   * Dort lässt er sich ansehen und bearbeiten und mit „An Meldekopf geben"
   * zurückschicken (ADR-006).
   */
  function imErfassungsbogenOeffnen(b: Erfassungsbogen, payload?: Uint8Array | null) {
    const { bogen: frei, anonymisiert } = bogenNachFrist(b);
    const bytes = payload && !anonymisiert ? payload : encodePayload(frei, browserKompressor);
    window.open(EEB_URL_PREFIX + base64UrlKodieren(bytes), "_blank", "noopener");
  }



  /**
   * Einen gescannten/übergebenen QR-Text verarbeiten. Rückgabe: true = fertig
   * (Overlay schließen / Native-Schleife beenden), false = es wird noch ein
   * weiterer Segment-Teil erwartet. Segment-Teile werden gesammelt (Fortschritt
   * „Teil x von n"), Duplikate/fremde/fehlende Teile sauber behandelt und bei
   * Vollständigkeit dekodiert. Vorlagen (Marker „V.") werden importiert. Die
   * Signatur des Transports wird geprüft (blockiert den Import nie).
   */
  async function uebernehmeText(text: string, fehlertext: string, opt: { ohneKiosk?: boolean } = {}): Promise<boolean> {
    if (istVorlageNutzlast(text)) {
      // Eine geteilte Vorlage gehört in den Erfassungsbogen — der Meldekopf
      // führt keine Vorlagen (Übernahme-Doku, Abschnitt F).
      setzeSegmentTeile([]);
      setScanFortschritt("");
      setFehler("");
      setMeldung("Das ist eine Vorlage für den Erfassungsbogen, kein Bogen einer Einheit. Im Erfassungsbogen öffnen: dort den QR-Code scannen oder den Link öffnen.");
      return true;
    }
    // Segment-Teil eines großen Bogens: sammeln, bis alle Teile vorliegen.
    if (istSegmentNutzlast(text)) {
      try {
        const teil = parseSegmentUrl(text);
        const r = segmentSammeln(segmentTeileRef.current, teil);
        setzeSegmentTeile(r.teile);
        if (r.status === "vollständig") {
          // Signatur über den zusammengesetzten Payload prüfen (auch signierte
          // Bögen können segmentiert sein — die Teile ergeben ihn 1:1 wieder).
          const payload = segmentePayload(r.teile);
          const b = segmenteZuBogen(r.teile, browserKompressor);
          const status = await signaturVonPayload(payload);
          setzeSegmentTeile([]);
          setScanFortschritt("");
          return uebernimmBogen(b, status, payload, opt);
        }
        setFehler("");
        // Die fehlenden Teile ausdrücklich benennen, statt sie ausrechnen zu
        // lassen: „es fehlt noch Teil 4" ist im Feld die Anweisung, „3 von 5"
        // nur ein Zwischenstand. Die Kästchenzeile zeigt dasselbe fürs Auge.
        const fehlt = fehltNochSatz(r.teile);
        setScanFortschritt(
          r.status === "duplikat"
            ? `Teil ${teil.teilNr} war schon dabei — ${fehlt}.`
            : r.status === "fremd"
              ? `Anderer Bogen erkannt — neu begonnen (Teil ${teil.teilNr} von ${r.anzahl}); ${fehlt}.`
              : `Teil ${r.haben} von ${r.anzahl} gescannt — ${fehlt}.`,
        );
        return false;
      } catch {
        scanFehlerRef.current = fehlertext;
        setFehler(fehlertext);
        return true;
      }
    }
    // Normaler Einzel-Bogen.
    setzeSegmentTeile([]);
    setScanFortschritt("");
    try {
      const dekodiert = decodePayloadUrl(text, browserKompressor);
      const status = await signaturVonText(text);
      return uebernimmBogen(dekodiert, status, payloadAusText(text), opt);
    } catch {
      scanFehlerRef.current = fehlertext;
      setFehler(fehlertext);
    }
    return true;
  }


  /**
   * Gescannten Text übernehmen. Vorgeschaltet die Belegungs-Rückrechnung: Ein
   * Handscanner in US-Belegung liefert auf deutschen Rechnern einen verdrehten
   * (aber vollständigen) Code — den kann die App lesen, statt den Nutzer mit
   * einer Fehlermeldung an die Scanner-Konfiguration zu schicken. Der
   * Fehlertext zeigt weiterhin, was TATSÄCHLICH ankam.
   */
  async function uebernehmeQrText(rohText: string): Promise<boolean> {
    const text = entwirreScanText(rohText, istLesbarerScan);
    const fertig = await uebernehmeText(text, scanFehlertext(rohText));
    // Nach der Übernahme melden: Sie setzt ihrerseits Meldungen, die den
    // Hinweis sonst gleich wieder überschrieben.
    if (text !== rohText) setMeldung(BELEGUNG_HINWEIS);
    return fertig;
  }


  /**
   * Web-Scanner-Ergebnis: bei Fertigstellung das Overlay schließen. Ein
   * unlesbarer Code schließt es NICHT — die Meldung steht im Scanner, der
   * nächste Versuch braucht keinen Neustart (Audit „Fehler", E6).
   */
  async function scanErgebnisWeb(text: string) {
    scanFehlerRef.current = null;
    const fertig = await uebernehmeQrText(text);
    if (scanFehlerRef.current) {
      setScanFortschritt(`✗ ${scanFehlerRef.current}`);
      setFehler("");
      return;
    }
    if (fertig) {
      setScannerOffen(false);
      setScanFortschritt("");
    }
  }


  function scanAbbrechen(auchSammelZiel: boolean) {
    setScannerOffen(false);
    if (auchSammelZiel) setSammelZiel(null);
    setzeSegmentTeile([]);
    setScanFortschritt("");
    // Kiosk-Bilanz beim Schließen kurz bestätigen (der Zähler stand im Overlay).
    if (kioskZaehlerRef.current > 0) {
      setMeldung(`${kioskZaehlerRef.current} ${kioskZaehlerRef.current === 1 ? "Bogen" : "Bögen"} in diesem Durchgang aufgenommen.`);
      kioskZaehlerRef.current = 0;
    }
  }


  async function scanneQr() {
    // Nativ (iOS/Android) scannt das Capacitor-Plugin, sonst die Webcam.
    if (!istNativ()) {
      setScannerOffen(true);
      return;
    }
    try {
      // Schleife für die Segmentierung: bei einem Einzel-Bogen genau ein Durchlauf,
      // bei mehreren Teilen so lange, bis alle gescannt sind oder abgebrochen wird.
      for (;;) {
        const teile = segmentTeileRef.current;
        // Der native Scanner nimmt nur eine Textzeile an — dort ist der Satz
        // die einzige Auskunft und nennt deshalb den nächsten fehlenden Teil
        // als Anweisung (im Web-Overlay zeigt zusätzlich die Kästchenzeile,
        // was noch aussteht).
        const fehlen = fehlendeTeile(teile);
        const anweisung =
          teile.length > 0 && fehlen.length > 0
            ? `Teil ${teile.length} von ${teile[0]!.anzahl} gescannt — jetzt Teil ${fehlen[0]} in den Rahmen halten`
            : "QR-Code des Erfassungsbogens in den Rahmen halten";
        const text = await qrScannen(anweisung);
        if (!text) {
          // Abbruch: angefangenen Sammelstand (und ein Kiosk-Sammelziel) verwerfen.
          setzeSegmentTeile([]);
          setScanFortschritt("");
          setSammelZiel(null);
          if (kioskZaehlerRef.current > 0) {
            setMeldung(`${kioskZaehlerRef.current} ${kioskZaehlerRef.current === 1 ? "Bogen" : "Bögen"} in diesem Durchgang aufgenommen.`);
            kioskZaehlerRef.current = 0;
          }
          return;
        }
        if (await uebernehmeQrText(text)) return;
      }
    } catch (err) {
      setFehler(err instanceof Error ? err.message : String(err));
    }
  }


  function scanneInEinsatz(zielId: string) {
    setSammelZiel(zielId);
    kioskZaehlerRef.current = 0; // neuer Kiosk-Durchgang
    setMeldung("");
    scanneQr(); // web: Scanner-Overlay; nativ: Plugin-Modal → uebernehmeQrText
  }


  /**
   * Bögen aus einer Datei lesen — für die Aufnahme in einen Einsatz. Bei einer
   * PDF zuerst die eingebetteten Daten, ersatzweise die QR-Codes darin (der
   * Rückfallweg, siehe {@link ladePdfQr}); sonst JSON. Der Signaturstatus
   * reist beim QR-Weg mit, damit der Meldekopf die fremde Meldung später mit
   * erhaltener Original-Signatur weiterreichen kann.
   */
  async function boegenAusDatei(datei: File, abgelehnt?: string[]): Promise<QrBogen[]> {
    const ohneNachweis = (boegen: Erfassungsbogen[]): QrBogen[] =>
      boegen.map((bogen) => ({ bogen, signatur: { zustand: "unsigniert" } as SignaturStatus, herkunft: null }));
    if (!istPdfDatei(datei)) {
      // Nur echte Bögen weiterreichen: Vorher wanderte jedes JSON-Objekt als
      // „Bogen" weiter — eine Sicherung fragte dann „1 Bogen gefunden, Einsatz
      // anlegen?". Was keiner ist, erklärt dateiFehlerMeldung (R2-E5).
      const gelesen = boegenAusJsonTextMitUrsachen(await datei.text());
      // Unvollständige Bögen werden mit Ursache abgelehnt, nicht still verworfen
      // und nicht in die App gelassen, wo sie die Ansicht zum Absturz brächten (R5-E1).
      if (gelesen.boegen.length === 0) {
        throw new Error(
          gelesen.abgelehnt.length > 0
            ? `In der Datei ist kein Bogen lesbar — ${ablehnungsSatz(gelesen.abgelehnt, gelesen.gesamt)}`
            : "In der Datei steht kein lesbarer Erfassungsbogen.",
        );
      }
      if (gelesen.abgelehnt.length > 0) abgelehnt?.push(ablehnungsSatz(gelesen.abgelehnt, gelesen.gesamt));
      return ohneNachweis(gelesen.boegen);
    }
    const bytes = new Uint8Array(await datei.arrayBuffer());
    const eingebettet = boegenAusPdfBytes(bytes);
    if (eingebettet.length === 1) return [await siegelAusPdfQr(bytes, eingebettet[0]!)];
    if (eingebettet.length > 0) return ohneNachweis(eingebettet);
    // Dynamisch: die QR-Auswertung zieht den Decoder (ZXing als WebAssembly)
    // nach — der gehört nicht ins Start-Bundle, sondern erst in den Rückfall.
    const { qrTexteAusPdfBytes } = await import("./pdf-qr");
    const { boegenAusQrTexten } = await import("./qr-boegen");
    return boegenAusQrTexten(await qrTexteAusPdfBytes(bytes));
  }


  /**
   * Siegel eines einzelnen PDF-Bogens aus seinem QR-Code mitlesen. Derselbe
   * Bogen kam über den Link „✓ signiert" an, als PDF nur „Aus Datei" ohne
   * Signatur — die Mail-Meldung galt dann als weniger vertrauenswürdig als
   * dieselbe per QR (Audit Runde 2, R2-W6). Übernommen wird der Bogen aus dem
   * QR, nicht der eingebettete: nur dessen Inhalt ist signiert. Passt der QR
   * nicht zur selben Fassung (Einheit, Stand) oder ist er unlesbar, bleibt es
   * beim eingebetteten Bogen ohne Nachweis.
   */
  async function siegelAusPdfQr(bytes: Uint8Array, bogen: Erfassungsbogen): Promise<QrBogen> {
    const ohne: QrBogen = { bogen, signatur: { zustand: "unsigniert" } as SignaturStatus, herkunft: null };
    try {
      const { qrTexteAusPdfBytes } = await import("./pdf-qr");
      const { boegenAusQrTexten } = await import("./qr-boegen");
      const ausQr = await boegenAusQrTexten(await qrTexteAusPdfBytes(bytes));
      const passend = ausQr.find(
        (q) =>
          q.signatur.zustand !== "unsigniert" &&
          q.bogen.stand === bogen.stand &&
          einheitSchluessel(q.bogen.einheit) === einheitSchluessel(bogen.einheit),
      );
      return passend ?? ohne;
    } catch {
      return ohne;
    }
  }


  /**
   * Gefundene Bögen in eine Sammlung schreiben (Dedupe über die Eintrags-ID).
   * Der Aufrufer lädt die Einsätze neu — beim Stapel erst nach der letzten Datei.
   *
   * Bewusst ohne Eingangs-Quittung in der Liste: hier kommen dreißig Bögen auf
   * einmal, und eine Marke, die dreißig Zeilen träfe, markierte nichts mehr.
   * Wie viele es waren, sagt die Rückmeldezeile; welche es waren, ist die
   * ganze Liste. Die Quittung gehört dem einzelnen Eingang.
   */
  function boegenAufnehmen(
    zielId: string,
    gefunden: QrBogen[],
    vomPapier = false,
  ): { neu: number; uebersprungen: number; speicherVoll: number; neueIds: string[] } {
    let neu = 0;
    let uebersprungen = 0;
    // Bögen, die am vollen Speicher scheiterten — kein „kaputter Bogen" und
    // kein „nichts gefunden" (Audit Runde 3, R3-O1).
    let speicherVoll = 0;
    const neueIds: string[] = [];
    for (const { bogen: b, signatur, herkunft } of gefunden) {
      if (speicherVoll > 0) {
        // Ist der Speicher einmal voll, scheitert jeder weitere Bogen genauso;
        // gezählt wird er trotzdem, damit die Meldung die Zahl nennt.
        speicherVoll++;
        continue;
      }
      try {
        const r = meldungAufnehmen(zielId, b, {
          quelle: "pdf-import",
          signatur: alsEintragSignatur(signatur),
          herkunft: herkunft ? base64UrlKodieren(herkunft) : undefined,
        });
        if (r) r.neu ? neu++ : uebersprungen++;
        if (r?.neu) neueIds.push(r.eintrag.id);
      } catch (e) {
        if (istSpeicherVoll(e)) speicherVoll++;
        /* sonst: ungültiger Bogen — überspringen */
      }
    }
    // Vom Papier: Karten tragen „vom Papier, Zeiten prüfen", bis der Abgleich
    // bestätigt ist (R3-A2). Ein voller Speicher darf die Aufnahme nicht kippen.
    if (vomPapier) {
      try {
        vomPapierMarkieren(zielId, neueIds);
      } catch {
        /* Markierung ist Komfort */
      }
    }
    return { neu, uebersprungen, speicherVoll, neueIds };
  }


  /**
   * Bögen aus JSON-/PDF-Dateien in den offenen Einsatz aufnehmen (Bulk, mit
   * Dedupe). Mehrere Dateien auf einmal, weil der Einlese-Knopf sie gemeinsam
   * anbietet: eine Meldung über den ganzen Stapel liest sich besser als eine je
   * Datei, und eine kaputte Datei darf die übrigen nicht abbrechen — sie wird
   * mit Namen an die Meldung gehängt.
   */
  /**
   * „Bögen einlesen…" mit Dateien und Bildern: eine gemeinsame Rückmeldung
   * je Stapel (Audit Runde 3, R3-E4). Bisher liefen beide Wege nebeneinander;
   * der Bilderweg leerte Fehler und Meldung des Dateiwegs, und dessen
   * Fehlerzeile verdrängte die Erfolgsmeldung.
   */
  async function importiereStapel(zielId: string, daten: File[], bilder: File[]) {
    setEinlese(null);
    setStapelBericht([]);
    setFehler("");
    setMeldung("");
    const d = daten.length > 0 ? await importiereBoegen(zielId, daten, bilder.length > 0) : undefined;
    if (bilder.length > 0) {
      await importiereQrBilder(zielId, bilder, d);
      return;
    }
    setEinlese(d ? { fehler: d.fehler, meldung: d.meldung } : { fehler: "In der Auswahl sind keine Bilddateien.", meldung: "" });
  }


  async function importiereBoegen(zielId: string, dateien: File[], mitBildern = false): Promise<DateiAnteil & { fehler: string; meldung: string }> {
    let neu = 0;
    let uebersprungen = 0;
    let speicherVoll = 0;
    const kaputt: string[] = [];
    const zusatz = { sammlungInPdf: false, lage: false }; // R2-A1
    const sammlungenUebernommen: string[] = []; // R3-W3
    // Stand vor dem Stapel und die neu abgelegten Bögen — für die Frage,
    // welche Fassung gilt (R4-W1).
    const vorher = einsaetzeLaden().find((x) => x.id === zielId)?.eintraege ?? [];
    const neueIds: string[] = [];
    for (const datei of dateien) {
      try {
        const bytes = istPdfDatei(datei) ? new Uint8Array(await datei.arrayBuffer()) : null;
        const art = bytes ? pdfInhaltArt(bytes) : null;
        if (art === "sammlung" && bytes) {
          // Sammel-PDF (z. B. vom Zugführer): als Paket mit Zeiten, Zug und
          // Siegel in diese Sammlung übernehmen, statt nur die Bögen zu
          // nehmen oder eine zweite Sammlung anzulegen (R3-W3).
          const uebernahme = await sammlungInZielUebernehmen(zielId, bytes);
          if (uebernahme === "abbruch") continue;
          if (uebernahme != null) {
            sammlungenUebernommen.push(uebernahme);
            continue;
          }
          zusatz.sammlungInPdf = true;
        }
        if (art === "nur-qr") zusatz.lage = true;
        const abgelehnt: string[] = [];
        const r = boegenAufnehmen(zielId, await boegenAusDatei(datei, abgelehnt), art === "nur-qr");
        for (const satz of abgelehnt) kaputt.push(`„${datei.name}“: ${satz}`);
        neu += r.neu;
        uebersprungen += r.uebersprungen;
        speicherVoll += r.speicherVoll;
        neueIds.push(...r.neueIds);
      } catch (e) {
        // Je Datei ein ganzer Satz mit Ursache und nächstem Schritt statt
        // Parser-Text in Klammern (Audit Runde 2, R2-E5).
        kaputt.push(await dateiFehlerMeldung(datei, e, "boegen"));
      }
    }
    einsaetzeNeuLaden();
    const vorrang = await vorrangImStapel(zielId, vorher, neueIds);
    const fehlerZeilen = [speicherVollMeldung(speicherVoll), ...kaputt].filter(Boolean);
    const bogenMeldung =
      neu + uebersprungen === 0
        ? kaputt.length > 0 || sammlungenUebernommen.length > 0 || speicherVoll > 0
          ? ""
          : "Keine Bögen in der Datei gefunden — weder eingebettete Daten noch ein lesbarer QR-Code."
        : dateiImportMeldung(neu, uebersprungen, zusatz);
    // Für den gemeinsamen Bericht mit Bildern: nur, was die Zahl nicht sagt.
    const aehnlich = aehnlichImStapel(zielId, vorher, neueIds);
    const hinweise = [
      ...sammlungenUebernommen,
      ...vorrang,
      ...aehnlich,
      zusatz.sammlungInPdf ? SAMMLUNG_IN_PDF_HINWEIS : zusatz.lage && neu > 0 ? LAGE_NACHTRAGEN_HINWEIS : "",
    ].filter(Boolean);
    return {
      anzahl: dateien.length,
      neu,
      uebersprungen,
      zeilen: [...fehlerZeilen, ...hinweise],
      fehler: fehlerZeilen.join(" "),
      // Die mögliche Doppelung gehört in die sichtbare Quittung, nicht nur in die Zeilen des Berichts (R7-N1).
      meldung: [...sammlungenUebernommen, bogenMeldung, ...vorrang, ...(mitBildern ? [] : aehnlich)].filter(Boolean).join(" "),
    };
  }


  /**
   * Sammel-PDF mit eingebetteter Sammlung beim „Bögen einlesen…" in die
   * offene Sammlung übernehmen (Audit Runde 3, R3-W3). Bisher gab es zwei
   * schlechte Wege: nur die Bögen (ohne Siegel, Zeiten und Zug) oder
   * „Einsatz importieren…", das eine zweite Sammlung anlegte, aus der jede
   * Einheit einzeln umgebucht werden musste.
   *
   * Rückgabe: Quittungstext nach der Übernahme, `null` für „nur die Bögen"
   * (bisheriger Weg), `"abbruch"` für nichts.
   */
  async function sammlungInZielUebernehmen(zielId: string, bytes: Uint8Array): Promise<string | null | "abbruch"> {
    const quelle = einsatzAusPdfBytes(bytes);
    const ziel = einsaetzeLaden().find((x) => x.id === zielId);
    if (!quelle || !ziel) return null;
    let sammlung: Einsatzsammlung;
    if (quelle.id === zielId) {
      // Dieselbe Sammlung (Rückweg von einem anderen Gerät): verlustfrei abgleichen.
      sammlung = quelle;
    } else {
      const einheiten = new Set(quelle.eintraege.map((e) => e.einheitSchluessel)).size;
      const zug = quelle.name.trim();
      // Heißt die Sammlung wie die Lage hier (zwei Meldeköpfe derselben Lage), ist
      // ihr Name kein Zug: Albstadt und Radolfzell bekämen sonst „Hochwasser Eyach
      // 10/2026" als Schein-Zug, und die Zwischensummen nach Zug stimmten nicht
      // mehr. Dann steht „ohne Zug-Zuordnung" vorn (R4-W8).
      const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
      const gleicheLage = norm(zug) === norm(ziel.name) || norm(ziel.name).includes(norm(zug)) || norm(zug).includes(norm(ziel.name));
      const mitZug = {
        wert: "mit-zug",
        label: `Übernehmen, Zug „${zug}“`,
        hinweis: "Einheiten ohne Zug bekommen diesen Zug. Später an der Karte änderbar.",
      };
      const ohneZug = {
        wert: "ohne-zug",
        label: "Übernehmen ohne Zug-Zuordnung",
        ...(gleicheLage ? { hinweis: "Die Sammlung heißt wie diese Lage — ihr Name ist vermutlich kein Zug." } : {}),
      };
      const wahl = await frageWahl({
        titel: "Sammel-PDF einer anderen Sammlung",
        text:
          `Die PDF enthält die Sammlung „${quelle.name}“ mit ${einheiten === 1 ? "1 Einheit" : `${einheiten} Einheiten`}. ` +
          `In „${ziel.name}“ übernehmen — mit Eintreffzeiten, Abrückvermerken, Auftrag und Siegel?`,
        wege: [
          ...(gleicheLage ? [ohneZug, mitZug] : [mitZug, ohneZug]),
          {
            wert: "nur-boegen",
            label: "Nur die Bögen",
            hinweis: "Ohne Zeiten, Zug und Siegel — wie ein einzeln eingelesener Bogen.",
          },
        ],
      });
      if (!wahl) return "abbruch";
      if (wahl === "nur-boegen") return null;
      sammlung = sammlungFuerZiel(quelle, ziel, wahl === "mit-zug" ? zug : "");
    }
    // Die Stände der Exporte reisen mit der Sammlung desselben Einsatzes (R5-W6);
    // bei einer fremden Sammlung gehören sie nicht hierher.
    const dateiStaende = quelle.exportStaende;
    delete quelle.exportStaende;
    const dateiLage = quelle.lageAngaben;
    delete quelle.lageAngaben;
    const eintraegeVorher = ziel.eintraege.map((e) => ({ ...e }));
    const geklaert = await entfernteImImportKlaeren(sammlung);
    const r = einsatzAbgleichen(geklaert.sammlung);
    if (quelle.id === zielId) exportStaendeUebernehmen(zielId, dateiStaende, [...einsaetzeLaden(), ...einsaetzePapierkorb()].map((x) => x.id));
    // Einsatzbeginn und Funkrufname des Monitors nur bei derselben Sammlung (R7-K5).
    const lageSatz = quelle.id === zielId ? lageAngabenUebernehmen(zielId, dateiLage, [...einsaetzeLaden(), ...einsaetzePapierkorb()].map((x) => x.id)) : "";
    const abgleich = abgleichText(r);
    const nummern = nummernWechselText(nummernWechsel(eintraegeVorher, einsaetzeLaden().find((x) => x.id === zielId)?.eintraege ?? []), einsaetzeLaden().find((x) => x.id === zielId)?.eintraege ?? []);
    return (
      (quelle.id === zielId
        ? `${r.hinzugefuegt} neue Meldung(en) ergänzt.`
        : `Sammlung „${quelle.name}“ in „${ziel.name}“ übernommen: ${r.hinzugefuegt} neue Meldung(en) mit Zeiten, Zug und Siegel.`) +
      (abgleich ? ` ${abgleich}` : "") +
      (nummern ? ` ${nummern}` : "") +
      (lageSatz ? ` ${lageSatz}` : "") +
      geklaert.hinweis
    );
  }


  /**
   * PDF ohne gespeicherte Sammlung (Einzelbogen, ältere oder fremd erzeugte
   * Sammel-PDF): Die Bögen selbst stecken trotzdem drin — eingebettet oder als
   * QR-Code. Statt den Import abzuweisen, wird daraus ein neuer Einsatz
   * angelegt; das ist am Meldekopf der eigentliche Zweck („da kommt ein
   * Ausdruck, mach was draus").
   */
  async function boegenAlsNeuerEinsatz(datei: File): Promise<boolean> {
    const gefunden = await boegenAusDatei(datei);
    if (gefunden.length === 0) return false;
    const weiter = await frageJaNein({
      titel: "Keine Einsatz-Sammlung in der Datei",
      text:
        `Die Datei enthält ${gefunden.length} Bogen/Bögen, aber keine gespeicherte Sammlung ` +
        "(Einzelbogen oder ältere Sammel-PDF). Dafür einen neuen Einsatz anlegen?",
      ok: "Einsatz anlegen",
    });
    if (!weiter) return true; // bewusst abgelehnt — kein Fehler
    const s = await einsatzErfragen();
    if (!s) return true;
    const nurQr = istPdfDatei(datei) && pdfInhaltArt(new Uint8Array(await datei.arrayBuffer())) === "nur-qr";
    const { neu, uebersprungen, speicherVoll } = boegenAufnehmen(s.id, gefunden, nurQr);
    einsaetzeNeuLaden();
    setFehler(speicherVollMeldung(speicherVoll));
    setMeldung(
      `Einsatz „${s.name}" angelegt — ` +
        (neu + uebersprungen > 0 ? dateiImportMeldung(neu, uebersprungen, { lage: true }) : "noch ohne Bogen."),
    );
    setOffenerEinsatzId(s.id);
    return true;
  }


  /**
   * Stapel QR-Bilder in den offenen Einsatz aufnehmen: eine Mehrfachauswahl
   * oder ein ganzer Ordner voller abfotografierter/gescannter Bögen.
   *
   * Bewusst ohne Rückfrage je Bogen: die Einzelaufnahme fragt bei bekannter
   * Einheit „neue Fassung oder eigene Einheit?" — bei dreißig Bildern wären das
   * dreißig Dialoge. Der Stapel entscheidet wie der PDF-/JSON-Import: gleicher
   * Inhalt wird übersprungen, neuer Inhalt derselben Einheit stapelt sich als
   * Fassung in die Historie. Beides ist nachträglich korrigierbar, ein
   * weggeklickter Dialog nicht.
   */
  async function importiereQrBilder(zielId: string, dateien: File[], daten?: DateiAnteil & { fehler: string; meldung: string }) {
    const bilder = dateien.filter((d) => istBilddatei(d.name, d.type));
    if (bilder.length === 0) {
      setEinlese(daten ? { fehler: daten.fehler, meldung: daten.meldung } : { fehler: "In der Auswahl sind keine Bilddateien.", meldung: "" });
      return;
    }
    setFehler("");
    setMeldung("");
    setEinlese(null);
    setStapelBericht([]);
    stapelAbbruchRef.current = false;
    setStapelStand(`0 von ${bilder.length} Bildern gelesen…`);
    try {
      const erg = await qrStapelLesen(
        bilder.map((d) => ({ name: d.name, blob: d })),
        {
          beiFortschritt: (fertig, gesamt) => setStapelStand(`${fertig} von ${gesamt} Bildern gelesen…`),
          abbruch: () => stapelAbbruchRef.current,
          // Teile mehrteiliger Bögen über Durchgänge merken (R2-A2).
          merker: teileMerker(zielId),
        },
      );
      let neu = 0;
      let uebersprungen = 0;
      let speicherVoll = 0;
      const neueIds: string[] = [];
      const vorher = einsaetzeLaden().find((x) => x.id === zielId)?.eintraege ?? []; // R4-W1
      for (const fund of erg.funde) {
        if (speicherVoll > 0) {
          speicherVoll++; // jeder weitere scheitert genauso (R3-O1)
          continue;
        }
        // Signatur wie beim Einzelscan prüfen und den Rohpayload mitspeichern —
        // sonst verlöre der Meldekopf beim Weiterreichen die fremde Signatur.
        const status = fund.payload ? await signaturVonPayload(fund.payload) : null;
        try {
          const r = meldungAufnehmen(zielId, fund.bogen, {
            quelle: "scan",
            signatur: status ? alsEintragSignatur(status) : undefined,
            herkunft: fund.payload ? base64UrlKodieren(fund.payload) : undefined,
          });
          if (r) r.neu ? neu++ : uebersprungen++;
          if (r?.neu) neueIds.push(r.eintrag.id);
        } catch (e) {
          // Bisher brach der erste volle Schreibversuch den Stapel ab, und
          // die schon aufgenommenen Bögen wurden nicht mehr gemeldet.
          if (!istSpeicherVoll(e)) throw e;
          speicherVoll++;
        }
      }
      try {
        vomPapierMarkieren(zielId, neueIds); // Abgleich vom Blatt anbieten (R3-A2)
      } catch {
        /* Markierung ist Komfort */
      }
      einsaetzeNeuLaden();
      const vorrang = await vorrangImStapel(zielId, vorher, neueIds);
      setStapelBericht([...stapelBerichtZeilen(erg, neu, uebersprungen, daten, neueIds.length > 0), ...vorrang, ...aehnlichImStapel(zielId, vorher, neueIds)]);
      const voll = speicherVollMeldung(speicherVoll);
      if (voll) setEinlese({ fehler: voll, meldung: "" });
    } catch (e) {
      setEinlese({ fehler: `Einlesen: ${fehlerText(e)}`, meldung: daten?.meldung ?? "" });
    } finally {
      setStapelStand("");
    }
  }


  /**
   * Ganze Einsatz-Sammlung aus einer Datei importieren (Schichtübergabe/Backup).
   * Akzeptiert die Sammel-PDF (dort ist die komplette Sammlung inkl. Zügen,
   * Status und Historie eingebettet) ebenso wie eine JSON-Datei.
   */
  async function importiereEinsatzDatei(e: ChangeEvent<HTMLInputElement>) {
    const datei = e.target.files?.[0];
    e.target.value = "";
    if (!datei) return;
    setFehler(""); // Meldung der vorigen Handlung nicht stehen lassen (E6)
    try {
      let s: Einsatzsammlung;
      if (istPdfDatei(datei)) {
        const gefunden = einsatzAusPdfBytes(new Uint8Array(await datei.arrayBuffer()));
        if (!gefunden) {
          if (await boegenAlsNeuerEinsatz(datei)) return;
          // Eine abgeschnittene PDF ist „beschädigt", nicht „ohne Bogen" (R2-E5).
          const leer = new Error(
            "In dieser PDF steckt weder eine Einsatz-Sammlung noch ein einzelner Bogen — " +
              "es sind keine eingebetteten Daten und kein lesbarer QR-Code darin.",
          );
          setFehler(await dateiFehlerMeldung(datei, leer, "einsatz"));
          return;
        }
        s = gefunden;
      } else {
        try {
          s = einsatzAusDatei(await datei.text());
        } catch (err) {
          // Keine Sammlung, aber vielleicht ein Bogen (oder mehrere) als JSON.
          // Findet sich keiner, gilt die Ursache der Sammlung (etwa „Einheitstyp fehlt").
          try {
            if (await boegenAlsNeuerEinsatz(datei)) return;
          } catch {
            /* die eigene Meldung unten */
          }
          throw err;
        }
      }
      // Ein Nachtrag („nur neue Bögen") ist nur ein Teil der Lage. Gibt es die
      // Sammlung hier noch nicht, entstünde eine Lage mit den paar Einheiten
      // des Nachtrags — das wird gesagt und gefragt (R4-W4). Der Zusatz wandert
      // nie in den Speicher.
      const nachtragSeit = s.nachtragSeit;
      delete s.nachtragSeit;
      // Die Stände der Exporte aus dem Umschlag (R5-W6): nach dem Import übernehmen.
      const dateiStaende = s.exportStaende;
      delete s.exportStaende;
      // Einsatzbeginn und Funkrufname des Monitors vom abgebenden Gerät (R7-K5).
      const dateiLage = s.lageAngaben;
      delete s.lageAngaben;
      // Unvollständige Bögen blieben draußen (R5-E1); der Satz kommt in die Quittung.
      const abgelehnt = abgelehnteBoegen(s);
      const abgelehntGesamt = s.eintraege.length + abgelehnt.length;
      // Zwei Meldeköpfe legen „Hochwasser Jagst" unabhängig an (es gibt offline
      // keine gemeinsame Kennung): Der Import fragt, ob die Datei zur vorhandenen
      // Sammlung gehört, statt still eine zweite gleichnamige anzulegen (R5-W2).
      const vorhandene = einsaetzeLaden();
      if (![...vorhandene, ...einsaetzePapierkorb()].some((x) => x.id === s.id)) {
        const gleichnamig = vorhandene
          .filter((x) => x.name.trim().toLowerCase() === s.name.trim().toLowerCase())
          .sort((a, b) => b.geaendert - a.geaendert)[0];
        if (gleichnamig) {
          const wahl = await frageWahl({
            titel: `Es gibt schon eine Sammlung „${gleichnamig.name}“`,
            text:
              `Die Datei enthält die Sammlung „${s.name}“ mit ${anzahlEinheiten(s.eintraege)}. Auf diesem Gerät gibt es schon eine gleichnamige ` +
              `(angelegt ${zeitLang(gleichnamig.angelegt)}, ${anzahlEinheiten(gleichnamig.eintraege)}) — vermutlich dieselbe Lage von einem zweiten Meldekopf. ` +
              "Zusammenführen oder getrennt halten?",
            wege: [
              {
                wert: "vorhanden",
                label: "In die vorhandene Sammlung übernehmen",
                hinweis: "Alle Einheiten in einer Sammlung, mit Zeiten, Abrückvermerken, Auftrag und Siegel. Laufende Nummern können sich dabei ändern.",
              },
              {
                wert: "eigene",
                label: "Als eigene Sammlung",
                hinweis: "Beide Sammlungen bleiben nebeneinander; auf der Startseite stehen sie mit ihrer Anlagezeit.",
              },
            ],
          });
          if (!wahl) return;
          if (wahl === "vorhanden") s = sammlungFuerZiel(s, gleichnamig);
        }
      }
      if (nachtragSeit != null && ![...einsaetzeLaden(), ...einsaetzePapierkorb()].some((x) => x.id === s.id)) {
        const n = geltendeJeEinheit(s.eintraege).length;
        const anlegen = await frageJaNein({
          titel: "Nur ein Nachtrag — nicht die ganze Lage",
          text:
            `Die Datei ist ein Nachtrag zu „${s.name}" seit ${zeitLang(nachtragSeit)} und enthält nur ${n} Einheit${n === 1 ? "" : "en"}. ` +
            "Die Sammlung gibt es auf diesem Gerät noch nicht: Es entstünde eine Lage mit nur diesen Einheiten. " +
            "Die ganze Lage kommt vom Gerät, das sie führt, über „Einsatz weitergeben / sichern“.",
          ok: "Trotzdem anlegen",
          abbruch: "Abbrechen",
        });
        if (!anlegen) return;
      }
      // Vor Ort entfernte Meldungen kommen nicht still zurück (R2-D4).
      const geklaert = await entfernteImImportKlaeren(s);
      // Bekannte Meldungen abgleichen statt nur neue anzuhängen (R3-W1).
      const eintraegeVorher = (einsaetzeLaden().find((x) => x.id === s.id)?.eintraege ?? []).map((e) => ({ ...e }));
      const r = einsatzAbgleichen(geklaert.sammlung);
      // Was von dort kam, hat das andere Gerät schon (R3-W2).
      weitergabeUmImportErgaenzen(s.id, r.neueIds, r.neueVermerke, r.bekannt);
      // Was der Stab laut dem anderen Gerät schon bekam, gilt hier auch (R5-W6).
      exportStaendeUebernehmen(s.id, dateiStaende, [...einsaetzeLaden(), ...einsaetzePapierkorb()].map((x) => x.id));
      const lageSatz = lageAngabenUebernehmen(s.id, dateiLage, [...einsaetzeLaden(), ...einsaetzePapierkorb()].map((x) => x.id));
      const letzteImImport = letzteMeldung(geklaert.sammlung.eintraege);
      einsaetzeNeuLaden();
      setFehler("");
      // Gegliedert statt ein Absatz (R5-K3): oben Einheiten, Aktualisierungen und
      // inhaltliche Widersprüche, die kleinen Abweichungen eingeklappt dahinter.
      const gliederung = abgleichGliederung(r);
      // Einheiten statt Fassungen zählen, wie die Liste darunter (R4-K2).
      const jetzt = einsaetzeLaden().find((x) => x.id === s.id);
      const koepfe = geltendeJeEinheit(jetzt?.eintraege ?? []);
      const anwesend = koepfe.filter((e) => e.status === MeldeStatus.ANWESEND).length;
      const vorherEinheiten = new Set(eintraegeVorher.map((e) => e.einheitSchluessel));
      const neueEinheiten = koepfe.filter((e) => !vorherEinheiten.has(e.einheitSchluessel)).length;
      // Nummern, die sich beim Zusammenführen verschoben haben (R5-W3).
      const nummernHinweis = nummernWechselText(nummernWechsel(eintraegeVorher, jetzt?.eintraege ?? []), jetzt?.eintraege ?? []);
      const einheitenText = `${koepfe.length === 1 ? "1 Einheit" : `${koepfe.length} Einheiten`}, davon ${anwesend} anwesend`;
      const kopfSatz = r.neuerEinsatz
        ? `Einsatz „${s.name}" übernommen: ${einheitenText}.`
        : `Einsatz „${s.name}": ${neueEinheiten === 0 ? "keine neue Einheit" : neueEinheiten === 1 ? "1 neue Einheit" : `${neueEinheiten} neue Einheiten`}` +
          `${r.hinzugefuegt > neueEinheiten ? `, ${r.hinzugefuegt - neueEinheiten} Folgemeldung(en)` : ""}. Jetzt ${einheitenText}.`;
      // Die Quittung steht oben in der Einsatzansicht, bei den Aufnahmeknöpfen —
      // als `meldung` stand sie hinter „Einsatz löschen…", vier Bildschirme
      // unter dem sichtbaren Bereich (R4-K2).
      setMeldung("");
      setEinlese({
        fehler: "",
        meldung: [
          kopfSatz,
          ...(r.neuerEinsatz ? [] : gliederung.kurz),
          // Wie aktuell die übernommene Lage ist (Audit Runde 3, R3-K5).
          ...(letzteImImport != null ? [`Stand der Datei: letzte Meldung ${zeitLang(letzteImImport)}.`] : []),
          ...(nummernHinweis ? [nummernHinweis] : []),
          ...(lageSatz ? [lageSatz] : []),
          ...(geklaert.hinweis ? [geklaert.hinweis.trim()] : []),
          ...(abgelehnt.length > 0 ? [ablehnungsSatz(abgelehnt, abgelehntGesamt)] : []),
        ].join(" "),
        einzelheiten: r.neuerEinsatz ? [] : gliederung.einzelheiten,
      });
      setOffenerEinsatzId(s.id);
    } catch (err) {
      setFehler(await dateiFehlerMeldung(datei, err, "einsatz")); // nie Parser-Text (R2-E5)
    }
  }


  /**
   * Ein Bogen-Link bei laufender App (Fragmentwechsel im Browser, Universal
   * Link in der nativen App) und beim Kaltstart. Die Listener werden nur
   * einmal registriert und rufen über diese Ref den Handler des AKTUELLEN
   * Renders (R3-S1). Bis zur Wahl bleibt der Link gemerkt; ein Neuladen fragt
   * erneut (R5-S6).
   */
  const linkEmpfangenRef = useRef<(text: string) => void>(() => {});
  linkEmpfangenRef.current = (text: string) => {
    wartendenLinkMerken(text);
    void uebernehmeText(text, LINK_UNGUELTIG, { ohneKiosk: true }).finally(wartendenLinkErledigt).then(
      (fertig) => {
        // Segment-Teil eines mehrteiligen Bogens: Scanner öffnen, damit die
        // übrigen Teile direkt folgen können. Kam umgekehrt der LETZTE Teil
        // per Link, während der Scanner offen war, schließt er sich.
        if (!fertig) void scanneQr();
        else setScannerOffen(false);
      },
    );
  };

  // Kaltstart: Fragment aus der Adresszeile oder ein Link, auf dessen Wahl vor
  // dem Neuladen noch gewartet wurde. Erst nach dem Mounten, weil die
  // Rückfrage die Dialogschicht braucht. StrictMode mountet doppelt — der Link
  // zählt nur einmal.
  useEffect(() => {
    if (kaltstartVerbraucht) return;
    kaltstartVerbraucht = true;
    const fragment = fragmentNehmen() || wartendenLinkLesen();
    if (fragment) linkEmpfangenRef.current(fragment);
  }, []);

  // Web-Pendant zum Universal Link: Ein Bogen-Link bei offener Seite ändert nur
  // das Fragment, der Browser lädt nicht neu.
  useEffect(() => {
    function beiFragmentwechsel() {
      const fragment = fragmentNehmen();
      if (fragment) linkEmpfangenRef.current(fragment);
    }
    window.addEventListener("hashchange", beiFragmentwechsel);
    return () => window.removeEventListener("hashchange", beiFragmentwechsel);
  }, []);

  // Universal Link (iOS) / App Link (Android) öffnet die native App.
  useEffect(() => bogenLinksEmpfangen((url) => linkEmpfangenRef.current(url)), []);

  return {
    eingang,
    zusammenlegung,
    setZusammenlegung,
    zusammenlegungZuruecknehmen,
    stapelStand,
    stapelBericht,
    setStapelBericht,
    abgleichAnstoss,
    setAbgleichAnstoss,
    einlese,
    setEinlese,
    stapelAbbrechen: () => (stapelAbbruchRef.current = true),
    scannerOffen,
    scanFortschritt,
    segmentStand,
    scanErgebnisWeb,
    scanAbbrechen,
    ladeQrBild,
    scanneQr,
    scanneInEinsatz,
    importiereStapel,
    importiereEinsatzDatei,
    // Für die Schnellerfassung: dieselbe Ablage mit denselben Rückfragen, und
    // warum sie zuletzt scheiterte (voller Speicher, R6-E2).
    bogenInSammlung,
    ablageFehlerText: () => ablageFehler.current,
  };
}

let kaltstartVerbraucht = false;

/** Was useAufnahme liefert — so reicht es app.tsx an die Einsatzansicht weiter. */
export type Aufnahme = ReturnType<typeof useAufnahme>;
