/**
 * Dialog der Kopplung (neu im Meldekopf, ADR-009): zeigt den Kopplungs-Code
 * dieses Geräts und nimmt auf dem ersten Gerät die Antwort des zweiten an.
 *
 * Ablauf: Das erste Gerät zeigt einen Code, das zweite scannt ihn mit „Bogen
 * scannen…". Danach verbinden sich die Geräte von selbst: Das zweite klopft
 * seinen Schlüssel-Fingerabdruck beim ersten an (signal.ts, „Anklopfen"). Am
 * Rechner im Fahrzeug gibt es oft weder Kamera noch Handscanner; er muss
 * darum nichts lesen und nichts eingeben. Der Antwort-Code des zweiten Geräts
 * bleibt als Ausweichweg stehen, falls das Anklopfen nicht durchkommt.
 */

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { useModalesOverlay } from "@bos/oberflaeche/modal-overlay";
import { QrScannerWeb } from "../eingang/qr-scanner-web";
import { istNativ, qrScannen } from "../nativ";
import { kopplungAntwortAnnehmen, kopplungDialogSchliessen, kopplungStarten } from "./kopplung";
import { useKopplung } from "./kopplung-leiste";
import type { KopplungsNetz } from "./zustand";

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
  return <Rahmen dialogRef={dialogRef} art={d.art} selbst={d.selbst} netz={d.netz} fehler={d.fehler} bild={bild} code={code} angenommen={angenommen} scanFehler={scanFehler} onAntwortScannen={() => void antwortScannen()} onNeu={z.einsatzId ? () => void kopplungStarten(z.einsatzId!) : undefined} />;
}

/** Eine Adresse, wie sie jemand am Gerät vergleichen kann; ein Name auf `.local` heißt, der Browser verbirgt sie. */
function lesbar(adressen: readonly string[]): string {
  const sichtbar = adressen.filter((a) => !a.endsWith(".local"));
  if (sichtbar.length > 0) return sichtbar.join(", ");
  return adressen.length > 0 ? "vom Browser verborgen" : "keine gefunden (kein WLAN, kein Hotspot?)";
}

/** Liegen zwei IPv4-Adressen in verschiedenen Netzen? Grob: Die ersten drei Stellen unterscheiden sich bei allen Paaren. */
export function verschiedeneNetze(eigene: readonly string[], andere: readonly string[]): boolean {
  const kopf = (a: string) => (/^\d+\.\d+\.\d+\.\d+$/.test(a) ? a.split(".").slice(0, 3).join(".") : null);
  const e = eigene.map(kopf).filter((x): x is string => x != null);
  const a = andere.map(kopf).filter((x): x is string => x != null);
  return e.length > 0 && a.length > 0 && !e.some((x) => a.includes(x));
}

/**
 * Was sich über das Netz sagen lässt (erster Gerätetest 2026-11-25: „Kann das überhaupt funktionieren?"). Die Adressen
 * zum Vergleichen, soweit der Browser sie nennt, und was mehr sagt als jede Adresse: ob das zweite Gerät das erste
 * tatsächlich erreicht.
 */
function Netz({ netz, angebot }: { netz: KopplungsNetz; angebot: boolean }) {
  const klopfer = netz.klopfer ?? 0;
  return (
    <dl className="kopplung-netz">
      <dt>Dieses Gerät</dt>
      <dd>{lesbar(netz.eigene)}</dd>
      {!angebot && netz.andere && (
        <>
          <dt>Erstes Gerät</dt>
          <dd>{lesbar(netz.andere)}</dd>
        </>
      )}
      {angebot ? (
        <>
          <dt>Zweites Gerät</dt>
          <dd data-erreicht={klopfer > 0 ? "ja" : "offen"}>
            {klopfer > 0 ? `hat dieses Gerät erreicht (${Math.min(klopfer, 66)} von 66 Klopfern angekommen)` : "noch nichts angekommen"}
          </dd>
        </>
      ) : (
        netz.erreichbar != null && (
          <>
            <dt>Erreichbar</dt>
            <dd data-erreicht={netz.erreichbar ? "ja" : "nein"}>
              {netz.erreichbar
                ? `ja, das erste Gerät antwortet${klopfer > 0 ? ` (${klopfer} von 66 Klopfern${netz.dauerMs != null ? `, ${Math.round(netz.dauerMs / 1000)} s` : ""})` : ""}`
                : "nein, das erste Gerät antwortet nicht. Die Geräte sind nicht im selben Netz, oder das WLAN lässt Geräte nicht miteinander sprechen (Gäste-WLAN)."}
            </dd>
          </>
        )
      )}
      {!angebot && netz.andere && verschiedeneNetze(netz.eigene, netz.andere) && (
        <dd className="fehler kopplung-netz-warnung">Die Adressen liegen in verschiedenen Netzen. Beide Geräte ins selbe WLAN oder in denselben Hotspot bringen.</dd>
      )}
    </dl>
  );
}

/** Eigener Baustein, damit der modale Dialog beim Wechsel zum Scanner sauber schließt und danach neu öffnet. */
function Rahmen(props: {
  dialogRef: React.RefObject<HTMLDialogElement | null>;
  art: "angebot" | "antwort";
  /** Die Geräte verbinden sich nach dem einen Scan von selbst; `false`: Der Antwort-Code ist der Weg. */
  selbst?: boolean;
  netz?: KopplungsNetz;
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
      <h2 id="kopplung-titel">{angebot ? "Zweites Gerät koppeln" : props.selbst ? "Verbindung wird aufgebaut" : "Antwort-Code für das erste Gerät"}</h2>
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
            {props.selbst ? (
              <li>Die Geräte verbinden sich danach von selbst; das dauert einige Sekunden. Hier ist nichts weiter zu tun.</li>
            ) : (
              <li>Das zweite Gerät zeigt einen Antwort-Code: hier „Antwort scannen…“ tippen und ihn vor die Kamera halten.</li>
            )}
          </ol>
        ) : props.selbst ? (
          <>
            <p className="kopplung-wartet" role="status">
              <strong>Die Geräte verbinden sich …</strong> Das dauert einige Sekunden. Am ersten Gerät ist nichts zu tun.
            </p>
            <p className="hinweis">Nur falls es nicht von selbst klappt: am ersten Gerät „Antwort scannen…“ tippen und diesen Code vor dessen Kamera halten.</p>
          </>
        ) : (
          <p className="kopplung-schritte">
            {props.selbst === false ? "Von selbst hat es nicht geklappt. " : ""}
            Am ersten Gerät „Antwort scannen…“ tippen und diesen Code vor dessen Kamera halten. Danach verbinden sich die Geräte von selbst.
          </p>
        )
      )}
      {angebot && !props.fehler && !props.angenommen && (
        <p className="hinweis">
          Die App muss auf dem zweiten Gerät schon einmal geladen worden sein; ohne Internet lässt sie sich dort nicht erst holen.
          {props.selbst ? " Klappt es nicht von selbst, zeigt das zweite Gerät einen Antwort-Code: dann „Antwort scannen…“." : ""}
        </p>
      )}
      {props.netz && <Netz netz={props.netz} angebot={angebot} />}
      {props.scanFehler && <p className="fehler" role="alert">{props.scanFehler}</p>}
      <div className="aktionen">
        {angebot && !props.fehler && !props.angenommen && (
          <button type="button" className={props.selbst ? "" : "primaer"} disabled={!props.bild} onClick={props.onAntwortScannen}>Antwort scannen…</button>
        )}
        {props.fehler && angebot && props.onNeu && (
          <button type="button" className="primaer" onClick={props.onNeu}>Neu beginnen</button>
        )}
        <button type="button" onClick={kopplungDialogSchliessen}>{props.fehler ? "Schließen" : "Abbrechen"}</button>
      </div>
    </dialog>
  );
}
