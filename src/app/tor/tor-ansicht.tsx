/**
 * Herkunft: neu in der Meldekopf-App.
 *
 * Tor-Liste: alle Fahrzeuge der anwesenden Einheiten mit Tippsuche, um „Fährt raus" oder „Kommt zurück" ohne Kamera zu
 * vermerken. Der Helfer tippt die letzten Zeichen des Kennzeichens, die Einheit oder den Funkrufnamen.
 *
 * Mit der Kamera geht dasselbe im Scanner (scanner-tor.tsx): „Bogen scannen…" liest QR-Codes und Kennzeichen in einer
 * Ansicht. Diese Liste ist der Weg, der immer geht: bei Nacht, Schmutz und Regen, ohne Kamera, in der Android- und
 * Desktop-App und auf Geräten, die die Texterkennung nicht ausführen. Erreichbar über „Kennzeichen tippen…" im Scanner
 * und über „Fahrzeuge am Tor…" unter den Summen.
 *
 * Die Stärke der Einheit bleibt unverändert (fahrzeug-stand.ts).
 */

import { useMemo, useRef, useState } from "react";
import type { Einsatzsammlung } from "@bos/meldekopf/einsaetze";
import { useModalesOverlay } from "@bos/oberflaeche/modal-overlay";
import { torFahrzeuge } from "./fahrzeug-stand";
import { torSuche } from "./kennzeichen-abgleich";
import { TorQuittung, TorTreffer, standText, useTorBuchung } from "./tor-treffer";
import "./tor.css";

/** Mehr Zeilen zeigt die Liste nicht auf einmal; wer mehr hat, tippt. */
const LISTE_MAX = 40;

export default function TorAnsicht({
  einsatz,
  onGeaendert,
  onSchliessen,
  onKamera,
}: {
  einsatz: Einsatzsammlung;
  onGeaendert: () => void;
  onSchliessen: () => void;
  /** „Mit der Kamera…": zurück in den Scanner. Fehlt, wo es den kombinierten Scanner nicht gibt (Android-App). */
  onKamera?: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useModalesOverlay(dialogRef, { onSchliessen });
  const fahrzeuge = useMemo(() => torFahrzeuge(einsatz), [einsatz]);
  const [eingabe, setEingabe] = useState("");
  const [wahl, setWahl] = useState<{ einheitSchluessel: string; schluessel: string } | null>(null);
  const buchung = useTorBuchung(einsatz.id, () => {
    setWahl(null);
    setEingabe("");
    onGeaendert();
  });

  const gewaehlt = wahl ? (fahrzeuge.find((f) => f.einheitSchluessel === wahl.einheitSchluessel && f.schluessel === wahl.schluessel) ?? null) : null;
  const liste = torSuche(eingabe, fahrzeuge);
  const unterwegs = fahrzeuge.filter((f) => f.unterwegsSeit != null).length;

  return (
    <dialog ref={dialogRef} className="tor" tabIndex={-1} aria-labelledby="tor-titel" data-zurueck="eigen">
      <header className="tor-kopf">
        <div>
          <h1 id="tor-titel">Fahrzeuge am Tor</h1>
          <p className="tor-zahl" role="status">
            {fahrzeuge.length === 0
              ? "Keine Fahrzeuge in dieser Sammlung"
              : `${unterwegs} von ${fahrzeuge.length} ${fahrzeuge.length === 1 ? "Fahrzeug" : "Fahrzeugen"} unterwegs`}
          </p>
        </div>
        <div className="tor-kopf-knoepfe">
          {onKamera && <button type="button" onClick={onKamera}>Mit der Kamera…</button>}
          <button type="button" onClick={onSchliessen}>Schließen</button>
        </div>
      </header>

      {buchung.quittung && <TorQuittung text={buchung.quittung.text} onRueckgaengig={buchung.zuruecknehmen} />}
      {buchung.fehler && <p className="fehler" role="alert">{buchung.fehler}</p>}

      {gewaehlt && <TorTreffer fahrzeug={gewaehlt} onBuchen={(raus) => buchung.buchen(gewaehlt, raus)} onWeg={() => setWahl(null)} wegText="Anderes Fahrzeug" />}

      {!gewaehlt && fahrzeuge.length > 0 && (
        <section className="tor-suche">
          <label className="tor-eingabe">
            <span>Kennzeichen, Einheit oder Funkrufname</span>
            <input
              type="search"
              placeholder="letzte Zeichen genügen, z. B. 234"
              value={eingabe}
              onChange={(e) => setEingabe(e.target.value)}
              autoCapitalize="characters"
              autoCorrect="off"
              autoComplete="off"
              spellCheck={false}
              enterKeyHint="search"
            />
          </label>
          {liste.length === 0 ? (
            <p className="hinweis" role="status">Kein Fahrzeug dieser Sammlung passt zu „{eingabe.trim()}“.</p>
          ) : (
            <ul className="tor-liste">
              {liste.slice(0, LISTE_MAX).map((f) => (
                <li key={`${f.einheitSchluessel}|${f.schluessel}`}>
                  <button type="button" onClick={() => setWahl({ einheitSchluessel: f.einheitSchluessel, schluessel: f.schluessel })}>
                    <span className="tor-liste-kennzeichen">{f.kennzeichen || "ohne Kennzeichen"}</span>
                    <span className="tor-liste-stand" data-unterwegs={f.unterwegsSeit != null ? "ja" : "nein"}>{standText(f)}</span>
                    <span className="tor-liste-wer">{[f.typ, f.einheit].filter(Boolean).join(" · ")}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {liste.length > LISTE_MAX && <p className="hinweis">{liste.length - LISTE_MAX} weitere. Tippen grenzt die Liste ein.</p>}
        </section>
      )}
      {fahrzeuge.length === 0 && (
        <p className="hinweis">Hier stehen die Fahrzeuge der anwesenden Einheiten, sobald deren Bögen Fahrzeuge nennen.</p>
      )}
      <p className="hinweis tor-fuss">Die Stärke der Einheit bleibt unverändert. Jede Bewegung steht mit Uhrzeit im Verlauf der Einheit.</p>
    </dialog>
  );
}
