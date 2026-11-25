/**
 * Dialog der Kopplung (neu im Meldekopf, ADR-009): zeigt den Kopplungs-Code
 * dieses Geräts und nimmt auf dem ersten Gerät die Antwort des zweiten an.
 *
 * Ablauf: Das erste Gerät zeigt einen Code, das zweite scannt ihn mit „Bogen
 * scannen…" und zeigt seinerseits einen Antwort-Code. Den liest das erste
 * Gerät mit Kamera oder Handscanner, oder jemand tippt ihn ab: Am Rechner im
 * Fahrzeug gibt es oft weder Kamera noch Scanner. Zum Eintippen steht unter
 * dem Antwort-Code derselbe Inhalt als 53 Zeichen in Vierergruppen
 * (signal.ts). Zwei Schritte, weil kein Server zwischen den Geräten vermittelt.
 */

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { useModalesOverlay } from "@bos/oberflaeche/modal-overlay";
import { QrScannerWeb } from "../eingang/qr-scanner-web";
import { istNativ, qrScannen } from "../nativ";
import { kopplungAntwortAnnehmen, kopplungDialogSchliessen, kopplungStarten } from "./kopplung";
import { useKopplung } from "./kopplung-leiste";
import { KURZCODE_ZEICHEN, kurzcodeBereinigen } from "./signal";

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
  const [tippt, setTippt] = useState(false);
  const [getippt, setGetippt] = useState("");
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
      setTippt(false);
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
  return (
    <Rahmen
      dialogRef={dialogRef}
      art={d.art}
      fehler={d.fehler}
      bild={bild}
      code={code}
      kurz={d.kurz}
      angenommen={angenommen}
      scanFehler={scanFehler}
      onAntwortScannen={() => void antwortScannen()}
      tippt={tippt}
      getippt={getippt}
      onTippen={(an) => {
        setScanFehler("");
        setTippt(an);
      }}
      onGetippt={setGetippt}
      onAbsenden={() => void antwort(getippt)}
      onNeu={z.einsatzId ? () => void kopplungStarten(z.einsatzId!) : undefined}
    />
  );
}

/** Eigener Baustein, damit der modale Dialog beim Wechsel zum Scanner sauber schließt und danach neu öffnet. */
function Rahmen(props: {
  dialogRef: React.RefObject<HTMLDialogElement | null>;
  art: "angebot" | "antwort";
  fehler?: string;
  bild: string;
  code: string;
  /** Der Antwort-Code zum Eintippen; fehlt, wenn dieser Browser ihn nicht anbieten kann. */
  kurz?: string;
  angenommen: boolean;
  scanFehler: string;
  onAntwortScannen: () => void;
  tippt: boolean;
  getippt: string;
  onTippen: (an: boolean) => void;
  onGetippt: (text: string) => void;
  onAbsenden: () => void;
  onNeu?: () => void;
}) {
  useModalesOverlay(props.dialogRef, { onSchliessen: kopplungDialogSchliessen });
  const angebot = props.art === "angebot";
  const zeichen = kurzcodeBereinigen(props.getippt).length;
  if (angebot && props.tippt && !props.fehler && !props.angenommen) {
    return (
      <dialog ref={props.dialogRef} className="qr-vollbild kopplung-dialog" tabIndex={-1} aria-labelledby="kopplung-titel" data-art="eintippen">
        <h2 id="kopplung-titel">Antwort-Code eintippen</h2>
        <form
          className="kopplung-tippen"
          onSubmit={(e) => {
            e.preventDefault();
            props.onAbsenden();
          }}
        >
          <label className="feld" htmlFor="kopplung-kurz">
            Code vom zweiten Gerät ({KURZCODE_ZEICHEN} Zeichen, steht dort unter dem Antwort-Code)
          </label>
          <textarea
            id="kopplung-kurz"
            rows={3}
            autoFocus
            autoComplete="off"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            value={props.getippt}
            onChange={(e) => props.onGetippt(e.target.value)}
            aria-describedby="kopplung-kurz-hinweis"
          />
          <p className="hinweis" id="kopplung-kurz-hinweis" role="status">
            {zeichen} von {KURZCODE_ZEICHEN} Zeichen. Groß oder klein ist gleich, die Striche können wegbleiben; O zählt als 0, I und L als 1.
          </p>
          {props.scanFehler && <p className="fehler" role="alert">{props.scanFehler}</p>}
          <div className="aktionen">
            <button type="submit" className="primaer" disabled={zeichen !== KURZCODE_ZEICHEN}>Verbinden</button>
            <button type="button" onClick={() => props.onTippen(false)}>Zurück zum Code</button>
          </div>
        </form>
      </dialog>
    );
  }
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
            <li>Das zweite Gerät zeigt einen Antwort-Code: hier „Antwort scannen…“ tippen und ihn vor die Kamera halten. Ohne Kamera und Handscanner: „Code eintippen…“.</li>
          </ol>
        ) : (
          <>
            <p className="kopplung-schritte">
              Am ersten Gerät „Antwort scannen…“ tippen und diesen Code vor dessen Kamera halten. Danach verbinden sich die Geräte von selbst.
            </p>
            {props.kurz && (
              <div className="kopplung-kurz">
                <p className="kopplung-schritte">Hat das erste Gerät keine Kamera: dort „Code eintippen…“ wählen und diese Zeichen eingeben.</p>
                {/* Vierergruppen in fester Breite: Wer abtippt, verliert die Stelle sonst nach jedem Blick auf die Tastatur. */}
                <p className="kopplung-kurzcode" data-kurz={props.kurz} aria-label={`Code zum Eintippen: ${props.kurz.split("").join(" ")}`}>
                  {props.kurz.split("-").map((gruppe, i) => (
                    <span key={i}>{gruppe}</span>
                  ))}
                </p>
              </div>
            )}
          </>
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
          <>
            <button type="button" className="primaer" disabled={!props.bild} onClick={props.onAntwortScannen}>Antwort scannen…</button>
            <button type="button" disabled={!props.bild} onClick={() => props.onTippen(true)}>Code eintippen…</button>
          </>
        )}
        {props.fehler && angebot && props.onNeu && (
          <button type="button" className="primaer" onClick={props.onNeu}>Neu beginnen</button>
        )}
        <button type="button" onClick={kopplungDialogSchliessen}>{props.fehler ? "Schließen" : "Abbrechen"}</button>
      </div>
    </dialog>
  );
}
