/**
 * Die offene Einsatz-Sammlung: Einsatzansicht samt Ausgabewegen (Sammel-PDF,
 * Lageblatt, Blanko, CSV, Excel „Oldenburg", Einsatz-Datei) und den Warnungen
 * zu Uhr und Speicher.
 *
 * Herkunft: Erfassungsbogen `src/app/app.tsx` (Commit 441811c), der Zweig
 * „Offener Einsatz" mit `dateiAnbieten`, `einsatzDateiname`, `exportVerbuchen`,
 * `exportiereEinsatz*`, `nachtragMarke`, `sammelPdf`, `blankoVordruck`,
 * `lageblatt` und dem Export-Stand je Format (R4-W2, R4-W4, R5-L4, R5-O3,
 * R5-W5, R5-W8). Die Wege sind übernommen, nicht neu gebaut; hier stehen sie in
 * einer eigenen Komponente, weil `app.tsx` im Meldekopf nur noch Startseite und
 * Weiche trägt (Übernahme-Doku, Abschnitt E).
 *
 * Die Eingänge (Scan, Datei, Bilderstapel, Schnellerfassung) kommen mit den
 * Phasen 3 und 4. Bis dahin sagt die Ansicht, wie Bögen heute hierher kommen,
 * statt still nichts zu tun.
 */

import { useEffect, useRef, useState } from "react";
import type { Einsatzsammlung } from "@bos/meldekopf/einsaetze";
import { arbeiten } from "@bos/oberflaeche/arbeitet";
import { zeigeHinweis } from "@bos/oberflaeche/dialoge";
import { EinsatzDetail } from "./einsaetze-ui";
import { einsaetzeLaden, einsaetzePapierkorb } from "./einsaetze-lesen";
import { meldungsNummern } from "./einheiten-tabelle";
import { blobAlsDownload, bytesAlsDatei, dateinameTeil } from "./hilfen";
import { istNativ, textTeilen } from "./nativ";
import { fehlerText } from "./nachladen";
import { SpeicherWarnung } from "./speicher-warnung";
import { UhrWarnung } from "./uhr-warnung";
import { einsatzDetailCsvInhalt } from "./weitergabe/bogen-csv";
import { einsatzCsvInhalt } from "./weitergabe/einsatz-csv";
import { einsatzDateiInhalt } from "./weitergabe/einsatz-transport";
import {
  exportSammlung,
  exportStaendeLaden,
  exportStandAusWeitergabe,
  exportVermerken,
  lieferungsMarke,
  type ExportStand,
  type ExportUmfang,
  type ExportZiel,
} from "./weitergabe/export-stand";
import { lageAngabenLaden } from "./weitergabe/lage-angaben";

/**
 * Was die Einsatzansicht heute zum Aufnehmen sagt. Ehrlich statt still: Der
 * Knopf steht da, weil die übernommene Ansicht ihn trägt, und der Weg dahinter
 * folgt mit Phase 3 (Eingänge) und Phase 4 (Schnellerfassung).
 */
function eingangFolgt(): Promise<void> {
  return zeigeHinweis({
    titel: "Bögen aufnehmen: kommt als Nächstes",
    text:
      "Scannen, Dateien, Fotos und die Schnellerfassung übernimmt diese App im nächsten Ausbauschritt. " +
      "Bis dahin: Bögen im Erfassungsbogen sammeln und dort über „Datensicherung“ eine Sicherung erstellen — " +
      "hier in der Fußzeile unter „Datensicherung“ eingespielt, erscheinen die Sammlungen mit allen Meldungen.",
  });
}

export function EinsatzAnsicht({
  einsatz,
  einsaetze,
  onZurueck,
  onGeaendert,
  onGeloescht,
}: {
  einsatz: Einsatzsammlung;
  /** Alle Sammlungen — die Speicherwarnung rechnet neu, sobald sie sich ändern. */
  einsaetze: Einsatzsammlung[];
  onZurueck: () => void;
  onGeaendert: () => void;
  onGeloescht: () => void;
}) {
  const [fehler, setFehler] = useState("");
  const [ausgabeQuittung, setAusgabeQuittung] = useState<string | null>(null);
  // Was beim letzten Export dieses Einsatzes schon in der Sammlung stand
  // (export-stand.ts) — die Ansicht zählt daran ab, was seitdem neu ist.
  const [exportStaende, setExportStaende] = useState<Partial<Record<ExportZiel, ExportStand>>>(() => exportStaendeLaden(einsatz.id));
  // Alle Bögen oder nur die neuen. Vorgabe bleibt der Gesamtexport, und ein
  // anderer Einsatz beginnt wieder damit: dem Stab darf nicht versehentlich
  // etwas fehlen.
  const [exportUmfang, setExportUmfang] = useState<ExportUmfang>("alle");
  const letzterEinsatz = useRef(einsatz.id);
  useEffect(() => {
    if (letzterEinsatz.current === einsatz.id) return;
    letzterEinsatz.current = einsatz.id;
    setExportStaende(exportStaendeLaden(einsatz.id));
    setExportUmfang("alle");
  }, [einsatz.id]);

  async function dateiAnbieten(dateiname: string, text: string, mime: string): Promise<boolean> {
    if (istNativ()) return textTeilen(dateiname, text);
    blobAlsDownload(dateiname, new Blob([text], { type: mime }));
    return true;
  }

  function einsatzDateiname(s: Einsatzsammlung): string {
    return dateinameTeil(s.name || "einsatz");
  }

  /**
   * Nach einem gelungenen Export in diesem Format: alles, was jetzt in der
   * Sammlung steht, ist in diesem Format hinausgegangen — beim nächsten „nur
   * neue Bögen" DES FORMATS zählt es nicht mehr mit. Die anderen Formate und die
   * Weitergabe an die Ablösung bleiben unberührt (R4-W2). Ein abgebrochenes
   * Share-Sheet kommt hier nicht an (siehe Aufrufer).
   */
  function exportVerbuchen(s: Einsatzsammlung, ziel: ExportZiel) {
    const vorhanden = [...einsaetzeLaden(), ...einsaetzePapierkorb()].map((x) => x.id);
    const stand = exportVermerken(s, ziel, vorhanden);
    setExportStaende((alt) => ({ ...alt, [ziel]: stand }));
  }

  async function exportiereEinsatz(s: Einsatzsammlung) {
    await dateiAnbieten(`eeb-einsatz-${einsatzDateiname(s)}.json`, einsatzDateiInhalt(s, undefined, lageAngabenLaden(s.id)), "application/json");
  }

  /**
   * Der Namensteil der Lieferung, für alle Formate gleich (R5-W8): ein Nachtrag
   * trägt `nachtrag-seit-<Zeitpunkt>-` im Namen — zwei gleichnamige Dateien
   * überschrieben sich im Download-Ordner (R4-W4) —, „nur neue" ohne Bezugspunkt
   * ist die ganze Lage und heißt `erste-lieferung-`, die Gesamtdatei trägt nichts.
   */
  function nachtragMarke(umfang: ExportUmfang, ziel: ExportZiel): string {
    return lieferungsMarke(umfang, exportStaende[ziel]);
  }

  async function exportiereEinsatzCsv(s: Einsatzsammlung, umfang: ExportUmfang) {
    const teil = exportSammlung(s, umfang, exportStaende.csv ?? null);
    const marke = nachtragMarke(umfang, "csv");
    const ok = await dateiAnbieten(
      `eeb-einsatz-${marke}${einsatzDateiname(s)}.csv`,
      einsatzCsvInhalt(teil, meldungsNummern(s.eintraege)),
      "text/csv;charset=utf-8",
    );
    if (ok) exportVerbuchen(s, "csv");
  }

  async function exportiereEinsatzCsvDetail(s: Einsatzsammlung, umfang: ExportUmfang) {
    const teil = exportSammlung(s, umfang, exportStaende["csv-detail"] ?? null);
    const ok = await dateiAnbieten(
      `eeb-einsatz-${nachtragMarke(umfang, "csv-detail")}${einsatzDateiname(s)}-alle-daten.csv`,
      einsatzDetailCsvInhalt(teil, meldungsNummern(s.eintraege)),
      "text/csv;charset=utf-8",
    );
    if (ok) exportVerbuchen(s, "csv-detail");
  }

  /**
   * Einheitenliste im Fremdformat der Führungsstelle. Dynamisch geladen: der
   * XLSX-Schreiber samt Stiltabelle wird nur beim Klick gebraucht (wie die PDF).
   */
  async function exportiereEinsatzOldenburg(s: Einsatzsammlung, umfang: ExportUmfang) {
    const teil = exportSammlung(s, umfang, exportStaende.xlsx ?? null);
    try {
      const { XLSX_MIME, einsatzOldenburgXlsx } = await import("./weitergabe/oldenburg-xlsx");
      const ok = await bytesAlsDatei(`eeb-einsatz-${nachtragMarke(umfang, "xlsx")}${einsatzDateiname(s)}-oldenburg.xlsx`, einsatzOldenburgXlsx(teil), XLSX_MIME);
      if (ok) exportVerbuchen(s, "xlsx");
    } catch (e) {
      setFehler(`Excel-Liste: ${fehlerText(e)}`);
    }
  }

  /**
   * Sammel-PDF. Im Gesamtumfang ALLE aktuellen Meldungen — auch abgerückte und
   * Übungen: Die Datei ist die Übergabe der ganzen Sammlung und muss auch am
   * Einsatzende funktionieren, wenn niemand mehr anwesend ist (Audit
   * „Arbeitsablauf", W2; „Analog first", A1). Was zählt und was nicht,
   * unterscheidet das Blatt selbst. Beim Teilexport enthält die PDF (Seiten
   * wie eingebettete Sammlung) nur die neuen Bögen; die Vorfassung einer
   * Folgemeldung für den Diff kommt aus der ganzen Sammlung.
   */
  async function sammelPdf(s: Einsatzsammlung, umfang: ExportUmfang, weitergabe = false) {
    setFehler("");
    setAusgabeQuittung(null);
    const teil = exportSammlung(s, umfang, exportStaende.pdf ?? null);
    if (teil.eintraege.length === 0) {
      setFehler("Seit dem letzten Sammel-PDF ist kein Bogen neu dazugekommen und nichts geändert.");
      return;
    }
    // Sperre und „wird erzeugt…" für alle PDF-Wege gemeinsam (arbeitet.ts, R5-O3).
    await arbeiten(weitergabe ? "weitergeben" : "sammel-pdf", async () => {
      try {
        // Dynamisch: pdfmake samt eingebetteter Schriften bleibt aus dem
        // Start-Bundle heraus und wird erst beim ersten PDF geladen.
        const { einsatzPdfErzeugen } = await import("./weitergabe/pdf");
        const stand = umfang === "neue" ? exportStaende.pdf : undefined;
        const ok = await einsatzPdfErzeugen(teil, undefined, s.eintraege, stand?.zeitpunkt, weitergabe ? "" : nachtragMarke(umfang, "pdf"));
        if (!ok) return; // Share-Sheet abgebrochen — nichts übergeben
        // „Einsatz weitergeben / sichern" geht an die Ablösung oder ins Archiv,
        // nicht an den Stab: Es hat seinen eigenen Stand (pdf.ts) und verbraucht
        // den Nachtrag-Bezugspunkt nicht (R4-W2).
        if (!weitergabe) exportVerbuchen(s, "pdf");
        // Die Bestätigung steht direkt unter den Knöpfen (R5-L4), nicht am Seitenende.
        setAusgabeQuittung(
          umfang === "neue"
            ? `✓ Neue Bögen aus „${s.name}" als PDF erzeugt — liegt im Download-Ordner bzw. wurde über das Teilen-Menü abgelegt. Übergeben ist sie erst, wenn sie gedruckt oder verschickt ist.`
            : `✓ Einsatz „${s.name}" als PDF erzeugt (mit allen Meldungen, Zeiten und Historie) — liegt im Download-Ordner bzw. wurde über das Teilen-Menü abgelegt. Weitergegeben ist sie erst, wenn sie bei der Ablösung oder im Archiv angekommen ist.`,
        );
      } catch (e) {
        setFehler(`Einsatz weitergeben: ${fehlerText(e)}`);
      }
    });
  }

  /** Blanko-Vordruck aus der Einsatzansicht (R3-A7). */
  async function blankoVordruck() {
    setFehler("");
    setAusgabeQuittung(null);
    await arbeiten("blanko", async () => {
      try {
        const { blankoPdfErzeugen } = await import("./weitergabe/pdf");
        if (await blankoPdfErzeugen()) {
          // Direkt unter dem Knopf (Audit Runde 6, R6-N10).
          setAusgabeQuittung("✓ Blanko-Vordruck erzeugt (2 Seiten A4, zum Ausfüllen mit der Hand).");
        }
      } catch (e) {
        setFehler(`Blanko-Vordruck: ${fehlerText(e)}`);
      }
    });
  }

  /** Einseitiges Lageblatt (nur Übersicht) — für Wand, Ablösung und Klemmbrett (A3/A4). */
  async function lageblatt(s: Einsatzsammlung) {
    setFehler("");
    setAusgabeQuittung(null);
    await arbeiten("lageblatt", async () => {
      try {
        const { einsatzLageblattErzeugen } = await import("./weitergabe/pdf");
        if (await einsatzLageblattErzeugen(s)) setAusgabeQuittung("✓ Lageblatt erzeugt (A4 quer) — liegt im Download-Ordner bzw. wurde über das Teilen-Menü abgelegt.");
      } catch (e) {
        setFehler(`Lageblatt: ${fehlerText(e)}`);
      }
    });
  }

  return (
    <>
      <SpeicherWarnung stand={einsaetze} />
      <UhrWarnung />
      <EinsatzDetail
        einsatz={einsatz}
        onZurueck={onZurueck}
        onGeaendert={onGeaendert}
        onScannen={() => void eingangFolgt()}
        onManuell={() => void eingangFolgt()}
        onDateiImport={() => void eingangFolgt()}
        onBilderImport={() => void eingangFolgt()}
        onEinlesen={() => void eingangFolgt()}
        onExport={() => void exportiereEinsatz(einsatz)}
        onCsvExport={(umfang) => void exportiereEinsatzCsv(einsatz, umfang)}
        onCsvDetailExport={(umfang) => void exportiereEinsatzCsvDetail(einsatz, umfang)}
        onOldenburgExport={(umfang) => void exportiereEinsatzOldenburg(einsatz, umfang)}
        onSammelPdf={(umfang) => void sammelPdf(einsatz, umfang)}
        exportStaende={exportStaende}
        onStandAusWeitergabe={(ziel) => {
          const stand = exportStandAusWeitergabe(einsatz.id, ziel, [...einsaetzeLaden(), ...einsaetzePapierkorb()].map((x) => x.id));
          if (stand) setExportStaende((alt) => ({ ...alt, [ziel]: stand }));
        }}
        exportUmfang={exportUmfang}
        onExportUmfang={setExportUmfang}
        onWeitergeben={() => void sammelPdf(einsatz, "alle", true)}
        onLageblatt={() => void lageblatt(einsatz)}
        onBlanko={() => void blankoVordruck()}
        ausgabeQuittung={ausgabeQuittung}
        onGeloescht={onGeloescht}
      />
      {fehler && (
        <p className="fehler" role="status" style={{ textAlign: "center" }}>
          {fehler}
        </p>
      )}
    </>
  );
}
