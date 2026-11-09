/**
 * Herkunft: Erfassungsbogen `src/app/juengste-quittung.ts` (Commit 1d7ed5f).
 */
/**
 * Eine Quittungsleiste zur Zeit (R15-D1): Mehrere Leisten liegen an derselben Stelle am unteren Rand. Die ältere ohne
 * Knopf fing die Tipps ab und machte das „Rückgängig" der neuen unerreichbar. Hier steht, welche Leiste zuletzt
 * ausgelöst wurde — nur sie wird gezeigt, ältere weichen und kommen nicht zurück.
 */
import { useRef } from "react";

/**
 * Schlüssel des Zustands, der zuletzt von „leer" auf einen neuen Wert wechselte (und noch gesetzt ist), sonst `null`.
 * Gesetzt heißt: nicht `null`/`undefined`. Ersetzt ein Zustand einen älteren, ist der ältere vergessen — außer `bleibt`:
 * dieser Schlüssel ist ein Stapel mit eigenem Rückweg und kommt wieder an die Reihe, wenn die jüngere Leiste weg ist.
 */
export function useJuengsteQuittung(zustand: Record<string, unknown>, bleibt?: string): string | null {
  const merk = useRef<{ vorher: Record<string, unknown>; reihe: string[] }>({ vorher: {}, reihe: [] });
  const m = merk.current;
  for (const k of Object.keys(zustand)) {
    if (zustand[k] === m.vorher[k]) continue;
    m.reihe = m.reihe.filter((x) => x !== k && (x === bleibt || zustand[k] == null));
    if (zustand[k] != null) m.reihe.push(k);
  }
  m.vorher = zustand;
  return m.reihe[m.reihe.length - 1] ?? null;
}
