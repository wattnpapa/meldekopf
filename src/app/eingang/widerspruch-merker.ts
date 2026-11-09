/**
 * Herkunft: Erfassungsbogen `src/app/widerspruch-merker.ts` (Commit 1d7ed5f).
 */
/**
 * Widersprüche eines Einsatz-Imports merken (R11-O3): „Widerspruch zwischen den Geräten" stand nur in der Quittung und
 * war nach dem Neuladen weg; der Wert des anderen Geräts stand danach nirgends mehr in der App. Jetzt bleiben die
 * Zeilen an der Einsatzansicht stehen, bis jemand „Erledigt" tippt. Enthält Einheitsnamen und Feldwerte, keine Personennamen.
 * Speicherschlüssel `eeb.widersprueche.v1`: { [einsatzId]: string[] }.
 */
export const WIDERSPRUCH_SCHLUESSEL = "eeb.widersprueche.v1";

function lesen(): Record<string, string[]> {
  try {
    const x: unknown = JSON.parse(globalThis.localStorage?.getItem(WIDERSPRUCH_SCHLUESSEL) ?? "{}");
    if (!x || typeof x !== "object" || Array.isArray(x)) return {};
    const aus: Record<string, string[]> = {};
    for (const [id, z] of Object.entries(x)) if (Array.isArray(z)) aus[id] = z.filter((s): s is string => typeof s === "string");
    return aus;
  } catch {
    return {};
  }
}

function schreiben(a: Record<string, string[]>): boolean {
  try {
    const s = globalThis.localStorage;
    if (!s) return false;
    if (Object.keys(a).length === 0) s.removeItem(WIDERSPRUCH_SCHLUESSEL);
    else s.setItem(WIDERSPRUCH_SCHLUESSEL, JSON.stringify(a));
    return true;
  } catch {
    return false;
  }
}

export function widerspruchLaden(einsatzId: string): string[] {
  return lesen()[einsatzId] ?? [];
}

/** Hängt Zeilen an (ohne Dubletten); leer ändert nichts. */
export function widerspruchMerken(einsatzId: string, zeilen: string[]): boolean {
  if (zeilen.length === 0) return true;
  const a = lesen();
  a[einsatzId] = [...new Set([...(a[einsatzId] ?? []), ...zeilen])];
  return schreiben(a);
}

export function widerspruchVergessen(einsatzId: string): boolean {
  const a = lesen();
  delete a[einsatzId];
  return schreiben(a);
}
