/**
 * Herkunft: neu in der Meldekopf-App.
 *
 * Texterkennung für Kennzeichen: Tesseract (C++ per WebAssembly) in einem eigenen Arbeiter-Thread, vollständig auf
 * dem Gerät. Kein Bild verlässt das Gerät, keines wird gespeichert.
 *
 * Die drei Dateien (Arbeiter-Skript, Erkennungskern, Sprachdaten, zusammen rund 7 MB) liegen im Paket unter einem
 * festen Verzeichnis (vite.config.ts, Plugin `texterkennung`) und im Offline-Vorrat der zweiten Stufe. Ohne die
 * Vorgaben hier holte tesseract.js alle drei von einem CDN: eine Fremdverbindung, und offline nie.
 *
 * Bewusst nur der SIMD-Kern: Er läuft in jedem Browser ab 2021 (iOS ab 16.4) und spart gegenüber „beide Kerne" 4 MB
 * für alle. Auf einem älteren Gerät scheitert das Laden; dann bleibt am Tor die Tippsuche, die ohnehin immer geht.
 * Dasselbe gilt für die Desktop-App (file://, dort sperrt der Browser das Nachladen von Daten).
 *
 * Geladen wird erst, wenn am Tor die Kamera läuft.
 */

declare const __TEXTERKENNUNG_PFAD__: string | undefined;

export interface KennzeichenLeser {
  /** Liest den Text im Bild; leer, wenn nichts zu erkennen ist. */
  lesen: (bild: HTMLCanvasElement) => Promise<string>;
  beenden: () => void;
}

/** Was Kennzeichen enthalten können. Umlaute liest die Erkennung als Grundbuchstaben; der Abgleich faltet sie ebenso. */
const ZEICHEN = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

/** Länger wartet niemand am Tor auf die Erkennung; danach gilt sie als nicht verfügbar. */
const LADE_FRIST_MS = 30_000;

function verzeichnis(): string | null {
  const pfad = typeof __TEXTERKENNUNG_PFAD__ === "string" ? __TEXTERKENNUNG_PFAD__ : "";
  if (!pfad || typeof document === "undefined") return null;
  // Absolut: Der Arbeiter löst Pfade gegen sein eigenes Skript auf, nicht gegen die Seite.
  return new URL(`${pfad}/`, document.baseURI).href;
}

function mitFrist<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((ok, nein) => {
    const uhr = setTimeout(() => nein(new Error("Zeitüberschreitung")), ms);
    p.then(
      (w) => {
        clearTimeout(uhr);
        ok(w);
      },
      (e) => {
        clearTimeout(uhr);
        nein(e instanceof Error ? e : new Error(String(e)));
      },
    );
  });
}

/** Lädt die Texterkennung. Wirft, wenn dieses Gerät oder diese Fassung der App sie nicht ausführen kann. */
export async function kennzeichenLeserLaden(): Promise<KennzeichenLeser> {
  const basis = verzeichnis();
  if (!basis || typeof Worker === "undefined" || typeof WebAssembly !== "object") throw new Error("Texterkennung nicht verfügbar");
  const { createWorker, OEM, PSM } = await import("tesseract.js");
  const arbeiter = await mitFrist(
    createWorker("eng", OEM.LSTM_ONLY, {
      workerPath: `${basis}worker.min.js`,
      corePath: `${basis}tesseract-core-simd-lstm.wasm.js`,
      langPath: basis.replace(/\/$/, ""),
      gzip: true,
      // Kein Blob-Skript (die CSP lässt nur eigene Dateien zu) und kein zweiter Vorrat in der IndexedDB: Den Vorrat hält der Service Worker.
      workerBlobURL: false,
      cacheMethod: "none",
    }),
    LADE_FRIST_MS,
  );
  await arbeiter.setParameters({
    tessedit_char_whitelist: ZEICHEN,
    // Ein Textblock: einzeilige und zweizeilige Schilder (Anhänger, Kräder).
    tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
    user_defined_dpi: "150",
  });
  let zu = false;
  return {
    lesen: async (bild) => {
      if (zu) return "";
      const { data } = await arbeiter.recognize(bild);
      return data.text ?? "";
    },
    beenden: () => {
      zu = true;
      void arbeiter.terminate().catch(() => undefined);
    },
  };
}
