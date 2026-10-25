/**
 * Kennzahlen eines Funkrufnamens („18/13") als ein Feld.
 *
 * Herkunft: Erfassungsbogen `src/app/schritte/bausteine.tsx` (`KennzahlenFeld`,
 * Commit 441811c), unverändert. Es blieb dort, weil es am Funkrufnamen hängt
 * (`@bos/oberflaeche/bausteine`, Kopfkommentar); hier braucht es nur der
 * Abschnitt Fahrzeuge.
 */
import { useState } from "react";
import { KENNUNG_EINGABE, zahl } from "@bos/oberflaeche/bausteine";

/**
 * Lokaler Text-Zustand, damit Trennzeichen beim Tippen erhalten bleiben —
 * geparst wird im Hintergrund (je Teil 0–255, wie im QR-Format).
 */
export function KennzahlenFeld(props: { teile: number[]; aendern: (t: number[]) => void }) {
  const [text, setText] = useState(props.teile.join("/"));
  return (
    <input
      {...KENNUNG_EINGABE}
      value={text}
      placeholder="18/13"
      onChange={(e) => {
        setText(e.target.value);
        props.aendern(
          e.target.value
            .split(/[^0-9]+/)
            .filter(Boolean)
            .map((n) => Math.min(255, zahl(n))),
        );
      }}
    />
  );
}
