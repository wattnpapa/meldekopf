/**
 * Einhängepunkt der Kopplung in der App (neu im Meldekopf, ADR-009): Solange
 * niemand koppelt, lädt nichts — Leiste, Dialog und Verbindung kommen erst
 * mit der ersten Kopplung (Bundle-Budget, ADR-003 Aufnahmeregel 5).
 */

import { lazy, Suspense, useSyncExternalStore } from "react";
import { kopplungsZustand, kopplungsZustandAbonnieren } from "./zustand";

const Kopplung = lazy(() => import("./kopplung-leiste").then((m) => ({ default: m.Kopplung })));

export function KopplungsRahmen() {
  const z = useSyncExternalStore(kopplungsZustandAbonnieren, kopplungsZustand, kopplungsZustand);
  if (z.phase === "aus" && !z.dialog) return null;
  return (
    <Suspense fallback={null}>
      <Kopplung />
    </Suspense>
  );
}
