/**
 * Herkunft: neu in der Meldekopf-App.
 *
 * Das gewählte Fahrzeug am Tor mit den beiden Knöpfen „Fährt raus" und „Kommt zurück", und das Buchen samt Quittung.
 * Geteilt von der Scanner-Ansicht (scanner-tor.tsx, Treffer der Kamera) und der Tor-Liste (tor-ansicht.tsx, Tippsuche).
 */
import { useState } from "react";
import { SpeicherVollFehler, zeitKurz } from "../eintrag-zeiten";
import { fahrzeugBewegen, fahrzeugBewegungZurueck, fahrzeugName, type BewegungVorher, type TorFahrzeug } from "./fahrzeug-stand";

export function standText(f: TorFahrzeug): string {
  if (f.unterwegsSeit != null) return `unterwegs seit ${zeitKurz(f.unterwegsSeit)}`;
  if (f.zurueckAm != null) return `zurück seit ${zeitKurz(f.zurueckAm)}`;
  return "im Bereitstellungsraum";
}

/** Buchen und Zurücknehmen mit Quittung und Fehlertext; `nachher` läuft nach jeder Änderung der Sammlung. */
export function useTorBuchung(einsatzId: string, nachher: (gebucht: TorFahrzeug | null) => void) {
  const [quittung, setQuittung] = useState<{ text: string; vorher: BewegungVorher } | null>(null);
  const [fehler, setFehler] = useState("");
  function buchen(f: TorFahrzeug, raus: boolean) {
    setFehler("");
    try {
      const vorher = fahrzeugBewegen(einsatzId, f.eintragId, f.schluessel, raus);
      if (!vorher) {
        setFehler("Dieses Fahrzeug steht nicht mehr in der Sammlung. Bitte neu suchen.");
        nachher(null);
        return;
      }
      setQuittung({ text: `${fahrzeugName(f)} (${f.einheit}) ${raus ? "fährt raus" : "ist zurück"} · ${zeitKurz(vorher.vermerk.zeit)}`, vorher });
      nachher(f);
    } catch (e) {
      setFehler(e instanceof SpeicherVollFehler ? e.message : "Die Bewegung ließ sich nicht speichern.");
    }
  }
  function zuruecknehmen() {
    if (!quittung) return;
    try {
      fahrzeugBewegungZurueck(quittung.vorher);
      setQuittung(null);
      nachher(null);
    } catch (e) {
      setFehler(e instanceof SpeicherVollFehler ? e.message : "Das Zurücknehmen ließ sich nicht speichern.");
    }
  }
  return { quittung, fehler, setFehler, buchen, zuruecknehmen };
}

export function TorQuittung({ text, onRueckgaengig }: { text: string; onRueckgaengig: () => void }) {
  return (
    <p className="tor-quittung" role="status">
      <span>✓ {text}</span>
      <button type="button" onClick={onRueckgaengig}>Rückgängig</button>
    </p>
  );
}

export function TorTreffer({ fahrzeug, onBuchen, onWeg, wegText }: { fahrzeug: TorFahrzeug; onBuchen: (raus: boolean) => void; onWeg: () => void; wegText: string }) {
  const unterwegs = fahrzeug.unterwegsSeit != null;
  return (
    <section className="tor-treffer" aria-label="Gewähltes Fahrzeug">
      <p className="tor-kennzeichen">{fahrzeug.kennzeichen || fahrzeugName(fahrzeug)}</p>
      <p className="tor-fahrzeug">{[fahrzeug.typ, fahrzeug.einheit, fahrzeug.funkruf].filter(Boolean).join(" · ")}</p>
      <p className="tor-stand" data-unterwegs={unterwegs ? "ja" : "nein"}>Jetzt: {standText(fahrzeug)}</p>
      <div className="tor-knoepfe">
        {/* Der erwartete Schritt ist der hervorgehobene; der andere bleibt möglich (eine Ausfahrt, die niemand vermerkt hat). */}
        <button type="button" className={unterwegs ? "" : "primaer"} onClick={() => onBuchen(true)}>Fährt raus</button>
        <button type="button" className={unterwegs ? "primaer" : ""} onClick={() => onBuchen(false)}>Kommt zurück</button>
      </div>
      <button type="button" className="link" onClick={onWeg}>{wegText}</button>
    </section>
  );
}
