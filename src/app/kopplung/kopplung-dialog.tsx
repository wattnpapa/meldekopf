/**
 * Dialog der Kopplung (neu im Meldekopf, ADR-009): zeigt den Kopplungs-Code
 * dieses Geräts und nimmt auf dem ersten Gerät die Antwort des zweiten an.
 *
 * Ablauf: Das erste Gerät zeigt einen Code, das zweite scannt ihn mit „Bogen
 * scannen…" und zeigt seinerseits einen Antwort-Code, den das erste scannt.
 * Zwei Scans, weil kein Server zwischen den Geräten vermittelt.
 */

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { useModalesOverlay } from "@bos/oberflaeche/modal-overlay";
import { QrScannerWeb } from "../eingang/qr-scanner-web";
import { istNativ, qrScannen } from "../nativ";
import { kopplungAntwortAnnehmen, kopplungDialogSchliessen, kopplungStarten } from "./kopplung";
import { useKopplung } from "./kopplung-leiste";

const ANTWORT_ANWEISUNG = "Antwort-Code des zweiten Geräts in den Rahmen halten";

function fehlerSatz(e: unknown): string {
  return e instanceof Error && e.message ? e.message : "Der Code ließ sich nicht lesen.";
}

export default function KopplungDialog() {
  const z = useKopplung();
  const d = z.dialog;
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [bild, setBild] = useState("");
  const [scannt, setScannt] = useState(false);
  const [scanFehler, setScanFehler] = useState("");
  const [angenommen, setAngenommen] = useState(false);
  const code = d?.code ?? "";

  useEffect(() => {
    let aktiv = true;
    setBild("");
    setAngenommen(false);
    if (!code) return;
    // Stufe L: Der Code steht auf einem Bildschirm, nicht auf zerknittertem Papier; gröbere Module scannen sich leichter.
    void QRCode.toDataURL(code, { errorCorrectionLevel: "L", width: 720, margin: 4 }).then(
      (url) => {
        if (aktiv) setBild(url);
      },
      () => undefined,
    );
    return () => {
      aktiv = false;
    };
  }, [code]);

  async function antwort(text: string) {
    try {
      await kopplungAntwortAnnehmen(text);
      setScanFehler("");
      setScannt(false);
      setAngenommen(true);
    } catch (e) {
      setScanFehler(fehlerSatz(e));
    }
  }

  async function antwortScannen() {
    setScanFehler("");
    if (!istNativ()) {
      setScannt(true);
      return;
    }
    try {
      const text = await qrScannen(ANTWORT_ANWEISUNG);
      if (text) await antwort(text);
    } catch (e) {
      setScanFehler(fehlerSatz(e));
    }
  }

  if (!d) return null;
  if (scannt) {
    return (
      <QrScannerWeb
        onErgebnis={(text) => void antwort(text)}
        onAbbruch={() => setScannt(false)}
        fortschritt={scanFehler ? `✗ ${scanFehler}` : ANTWORT_ANWEISUNG}
        abbruchText="Zurück zum Code"
      />
    );
  }
  return <Rahmen dialogRef={dialogRef} art={d.art} fehler={d.fehler} bild={bild} code={code} angenommen={angenommen} scanFehler={scanFehler} onAntwortScannen={() => void antwortScannen()} onNeu={z.einsatzId ? () => void kopplungStarten(z.einsatzId!) : undefined} />;
}

/** Eigener Baustein, damit der modale Dialog beim Wechsel zum Scanner sauber schließt und danach neu öffnet. */
function Rahmen(props: {
  dialogRef: React.RefObject<HTMLDialogElement | null>;
  art: "angebot" | "antwort";
  fehler?: string;
  bild: string;
  code: string;
  angenommen: boolean;
  scanFehler: string;
  onAntwortScannen: () => void;
  onNeu?: () => void;
}) {
  useModalesOverlay(props.dialogRef, { onSchliessen: kopplungDialogSchliessen });
  const angebot = props.art === "angebot";
  return (
    <dialog ref={props.dialogRef} className="qr-vollbild kopplung-dialog" tabIndex={-1} aria-labelledby="kopplung-titel" data-art={props.art}>
      <h2 id="kopplung-titel">{angebot ? "Zweites Gerät koppeln" : "Antwort-Code für das erste Gerät"}</h2>
      {props.fehler ? (
        <p className="fehler" role="alert">{props.fehler}</p>
      ) : props.angenommen ? (
        <p role="status" className="kopplung-wartet">Antwort gelesen. Die Verbindung wird aufgebaut …</p>
      ) : props.bild ? (
        // Der Code als Text steht im Attribut: für Verhaltenstests und für die Fehlersuche, nicht zum Abtippen.
        <img src={props.bild} alt={angebot ? "Kopplungs-Code dieses Geräts" : "Antwort-Code dieses Geräts"} data-code={props.code} />
      ) : (
        <p role="status">Der Code wird vorbereitet …</p>
      )}
      {!props.fehler && !props.angenommen && (
        angebot ? (
          <ol className="kopplung-schritte">
            <li>Beide Geräte ins selbe Netz bringen (WLAN des Fahrzeugs oder Hotspot). Internet braucht es nicht.</li>
            <li>Am zweiten Gerät die Meldekopf-App öffnen, „Bogen scannen…“ tippen und diesen Code scannen.</li>
            <li>Das zweite Gerät zeigt einen Antwort-Code: hier „Antwort scannen…“ tippen und ihn vor die Kamera halten.</li>
          </ol>
        ) : (
          <p className="kopplung-schritte">
            Am ersten Gerät „Antwort scannen…“ tippen und diesen Code vor dessen Kamera halten. Danach verbinden sich die Geräte von selbst.
          </p>
        )
      )}
      {angebot && !props.fehler && !props.angenommen && (
        <p className="hinweis">
          Die App muss auf dem zweiten Gerät schon einmal geladen worden sein; ohne Internet lässt sie sich dort nicht erst holen.
        </p>
      )}
      {props.scanFehler && <p className="fehler" role="alert">{props.scanFehler}</p>}
      <div className="aktionen">
        {angebot && !props.fehler && !props.angenommen && (
          <button type="button" className="primaer" disabled={!props.bild} onClick={props.onAntwortScannen}>Antwort scannen…</button>
        )}
        {props.fehler && angebot && props.onNeu && (
          <button type="button" className="primaer" onClick={props.onNeu}>Neu beginnen</button>
        )}
        <button type="button" onClick={kopplungDialogSchliessen}>{props.fehler ? "Schließen" : "Abbrechen"}</button>
      </div>
    </dialog>
  );
}
