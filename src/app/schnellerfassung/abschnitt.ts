/**
 * Was jeder Abschnitt der Schnellerfassung bekommt: den Bogen und den Weg, ihn
 * zu ändern.
 *
 * Herkunft: Erfassungsbogen `src/app/schritte/bausteine.tsx` (`SchrittProps`,
 * Commit 441811c). Ohne `geheZu`: Die Schnellerfassung ist eine Seite, keine
 * Folge von Schritten.
 */
import type { Erfassungsbogen } from "@bos/eeb-format/model";

export type AbschnittProps = {
  bogen: Erfassungsbogen;
  aendern: (patch: Partial<Erfassungsbogen>) => void;
};
