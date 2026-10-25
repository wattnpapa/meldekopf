/**
 * Build-Konstanten und Umgebungsflags. Herkunft: Erfassungsbogen
 * `src/app/umgebung.d.ts` (Commit f2b77f1); die pdfmake-Deklaration kommt mit
 * der Weitergabe (Phase 5).
 */

/** Ersetzt durch `define` in vite.config.ts. */
declare const __APP_VERSION__: string;

/** Vite-Umgebungsflags (nur die hier genutzte Teilmenge). */
interface ImportMeta {
  readonly env: { readonly DEV: boolean };
  readonly dirname: string;
  readonly filename: string;
}
