/**
 * Offline-Vorrat in zwei Stufen.
 *
 * Herkunft: Erfassungsbogen `scripts/precache-aufteilung.ts` (Commit f2b77f1,
 * Audit Runde 3, R3-O3). Dort lud der Service Worker beim ersten Aufruf alles
 * (552 Dateien, 10,7 MB) und war erst danach aktiv — bei schwachem Mobilfunk
 * über eine Minute ohne jeden Fortschritt. Die Hälfte davon brauchte der Bogen
 * gar nicht: Beispielbögen und Themenseiten.
 *
 * - **Kern** (Workbox-Precache, Bedingung für „offline bereit"): App-Shell,
 *   alle JS-Bausteine, Schrift, Bilder und die Seiten, die die App selbst
 *   verlinkt (Datenschutz, Impressum, Fehlerseite).
 * - **Zusatz** (nach der Aktivierung von der Seite nachgeladen, Laufzeit-
 *   Cache `eeb-zusatz`): weitere Begleitseiten und deren Fotos (nur WebP,
 *   R5-O4). Die Liste schreibt der Build nach `offline-zusatz.json`; dort
 *   steht auch der Umfang des Kerns, damit die Startseite beim Laden einen
 *   Fortschritt zeigen kann (offline-vorrat.ts, Phase 2).
 *
 * Der Meldekopf hat in Phase 0 keine zweite Stufe — die Regeln bleiben
 * trotzdem stehen, damit Anleitung und Themenseiten später ohne Umbau in den
 * Zusatz fallen.
 */

export interface VorratEintrag {
  url: string;
  revision?: string | null;
  size: number;
}

/** Was die Startseite aus `offline-zusatz.json` liest. */
export interface OfflineUmfang {
  kern: { url: string; size: number }[];
  zusatz: { url: string; size: number }[];
}

export const ZUSATZ_DATEI = "offline-zusatz.json";
export const ZUSATZ_CACHE = "eeb-zusatz";

/** Seiten, die die App selbst verlinkt oder die offline zur Hand sein müssen. */
const KERN_SEITEN = new Set(["index.html", "anleitung.html", "datenschutz.html", "impressum.html", "404.html"]);

/** Gehört die Datei (Pfad wie im Precache-Manifest) in die zweite Stufe? */
export function istZusatz(url: string): boolean {
  // Per Glob als URL eingebundene JSON-Dateien (im Erfassungsbogen die Beispielbögen).
  if (/^assets\/[^/]+\.json$/.test(url)) return true;
  // Themenseiten im Wurzelverzeichnis.
  if (/^[^/]+\.html$/.test(url) && !KERN_SEITEN.has(url)) return true;
  // Fotos und Bildschirmfotos der Seiten (nur WebP, R5-O4).
  if (/^(?:bilder|screenshots)\/.+\.webp$/.test(url)) return true;
  return false;
}

export function vorratAufteilen(eintraege: VorratEintrag[]): { kern: VorratEintrag[]; umfang: OfflineUmfang } {
  const kern: VorratEintrag[] = [];
  const zusatz: VorratEintrag[] = [];
  for (const e of eintraege) (istZusatz(e.url) ? zusatz : kern).push(e);
  return {
    kern,
    umfang: {
      kern: kern.map((e) => ({ url: e.url, size: e.size })),
      zusatz: zusatz.map((e) => ({ url: e.url, size: e.size })),
    },
  };
}
