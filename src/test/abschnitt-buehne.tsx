/**
 * Kleine Bühne für die Abschnitte der Schnellerfassung: hält den Bogen im
 * Zustand, damit ein Test einen Abschnitt so bedienen kann wie die App ihn
 * einhängt (`bogen` + `aendern`), ohne die ganze Anwendung zu rendern.
 *
 * Herkunft: Erfassungsbogen `src/test/schritt-buehne.tsx` (Commit 1d7ed5f),
 * umbenannt mit den Abschnitten.
 */

import { useEffect, useState, type ComponentType } from "react";
import type { Erfassungsbogen } from "@bos/eeb-format/model";
import { Dialogschicht } from "@bos/oberflaeche/dialoge";
import { neuerBogen } from "../app/hilfen";
import type { AbschnittProps } from "../app/schnellerfassung/abschnitt";

export function AbschnittBuehne(props: {
  komponente: ComponentType<AbschnittProps>;
  /** Abweichender Startbogen; ohne Angabe ein frischer (THW, leer). */
  bogen?: Erfassungsbogen;
  /** Sieht jeden Bogenstand nach einer Änderung — für Tests, die prüfen, WAS gespeichert wird. */
  beobachten?: (b: Erfassungsbogen) => void;
}) {
  const { komponente: Abschnitt, beobachten } = props;
  const [bogen, setBogen] = useState<Erfassungsbogen>(() => props.bogen ?? neuerBogen());
  useEffect(() => {
    beobachten?.(bogen);
  }, [bogen, beobachten]);
  return (
    <>
      <Abschnitt bogen={bogen} aendern={(patch) => setBogen((b) => ({ ...b, ...patch }))} />
      {/* Wie in der App: Rückfragen brauchen die Dialogschicht, sonst wartet ein
          `await frageJaNein(...)` im Abschnitt für immer. */}
      <Dialogschicht />
    </>
  );
}
