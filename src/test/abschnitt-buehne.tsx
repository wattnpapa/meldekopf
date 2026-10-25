/**
 * Kleine Bühne für die Abschnitte der Schnellerfassung: hält den Bogen im
 * Zustand, damit ein Test einen Abschnitt so bedienen kann wie die App ihn
 * einhängt (`bogen` + `aendern`), ohne die ganze Anwendung zu rendern.
 *
 * Herkunft: Erfassungsbogen `src/test/schritt-buehne.tsx` (Commit 441811c),
 * umbenannt mit den Abschnitten.
 */

import { useState, type ComponentType } from "react";
import type { Erfassungsbogen } from "@bos/eeb-format/model";
import { Dialogschicht } from "@bos/oberflaeche/dialoge";
import { neuerBogen } from "../app/hilfen";
import type { AbschnittProps } from "../app/schnellerfassung/abschnitt";

export function AbschnittBuehne(props: {
  komponente: ComponentType<AbschnittProps>;
  /** Abweichender Startbogen; ohne Angabe ein frischer (THW, leer). */
  bogen?: Erfassungsbogen;
}) {
  const { komponente: Abschnitt } = props;
  const [bogen, setBogen] = useState<Erfassungsbogen>(() => props.bogen ?? neuerBogen());
  return (
    <>
      <Abschnitt bogen={bogen} aendern={(patch) => setBogen((b) => ({ ...b, ...patch }))} />
      {/* Wie in der App: Rückfragen brauchen die Dialogschicht, sonst wartet ein
          `await frageJaNein(...)` im Abschnitt für immer. */}
      <Dialogschicht />
    </>
  );
}
