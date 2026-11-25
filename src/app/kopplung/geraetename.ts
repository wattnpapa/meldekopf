/**
 * Name und Kennung dieses Geräts für die Kopplung (neu im Meldekopf, ADR-009, seit 2026-11-25).
 *
 * Führt eine Zentrale mehrere Sammler, muss am Rechner stehen, welcher verbunden ist und welcher nicht. Jedes Telefon
 * nennt darum einen Namen, den man dort eingibt („Eingang Nord"). Den Namen des Geräts im Netz gibt ein Browser nicht
 * heraus; die Vorgabe ist, was er verrät: das Modell, wo er es nennt (Chrome auf Android), sonst die Geräteart.
 *
 * Dazu eine zufällige, dauerhafte Kennung: Koppelt dasselbe Telefon neu, löst es an der Zentrale seinen alten Eintrag
 * ab, statt als weiteres Gerät daneben zu stehen. `eeb.geraet.v1`: { id, name? }; keine Personendaten, solange niemand
 * einen Personennamen eintippt.
 */

const SCHLUESSEL = "eeb.geraet.v1";
export const NAME_MAX = 30;

interface Ablage {
  id: string;
  name?: string;
}

function lesen(): Ablage | null {
  try {
    const x: unknown = JSON.parse(localStorage.getItem(SCHLUESSEL) ?? "null");
    const o = x as Partial<Ablage> | null;
    return o && typeof o.id === "string" && o.id ? { id: o.id, ...(typeof o.name === "string" && o.name.trim() ? { name: o.name.trim().slice(0, NAME_MAX) } : {}) } : null;
  } catch {
    return null;
  }
}

function schreiben(a: Ablage): void {
  try {
    localStorage.setItem(SCHLUESSEL, JSON.stringify(a));
  } catch {
    /* Speicher voll oder gesperrt: Der Name gilt dann bis zum Neuladen nicht weiter */
  }
}

let fluechtig: Ablage | null = null;

function ablage(): Ablage {
  const da = lesen() ?? fluechtig;
  if (da) return da;
  const neu: Ablage = { id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}` };
  fluechtig = neu;
  schreiben(neu);
  return neu;
}

/** Die Geräteart aus dem, was der Browser über sich sagt. */
export function geraeteart(agent: string, plattform = ""): string {
  if (/iPhone/.test(agent)) return "iPhone";
  if (/iPad/.test(agent) || (/Mac/.test(plattform) && /Mobile|Touch/.test(agent))) return "iPad";
  if (/Android/.test(agent)) return /Mobile/.test(agent) ? "Android-Telefon" : "Android-Tablet";
  if (/Windows/.test(agent)) return "Windows-Rechner";
  if (/Mac OS X|Macintosh/.test(agent)) return "Mac";
  if (/Linux|X11/.test(agent)) return "Linux-Rechner";
  return "Gerät";
}

let modell = "";

/** Das Modell erfragen, wo der Browser es nennt; danach liefert {@link geraetename} es als Vorgabe. */
export async function geraetemodellErfragen(): Promise<void> {
  try {
    const daten = (navigator as Navigator & { userAgentData?: { getHighEntropyValues?: (h: string[]) => Promise<{ model?: string }> } }).userAgentData;
    const m = (await daten?.getHighEntropyValues?.(["model"]))?.model?.trim();
    if (m) modell = m.slice(0, NAME_MAX);
  } catch {
    /* nicht erlaubt oder nicht vorhanden: Es bleibt bei der Geräteart */
  }
}

/** Der Name dieses Geräts: der eingegebene, sonst das Modell, sonst die Geräteart. */
export function geraetename(): string {
  return ablage().name ?? (modell || geraeteart(typeof navigator === "undefined" ? "" : navigator.userAgent, typeof navigator === "undefined" ? "" : navigator.platform));
}

/** Hat jemand hier einen Namen eingegeben? */
export function geraetenameEigen(): boolean {
  return !!ablage().name;
}

/** Namen setzen; leer nimmt wieder die Vorgabe. */
export function geraetenameSetzen(name: string): void {
  const a = ablage();
  const n = name.trim().slice(0, NAME_MAX);
  schreiben(n ? { id: a.id, name: n } : { id: a.id });
  fluechtig = null;
}

/** Dauerhafte, zufällige Kennung dieses Geräts. */
export function geraetekennung(): string {
  return ablage().id;
}
