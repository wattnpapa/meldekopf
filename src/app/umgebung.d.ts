/**
 * Build-Konstanten und Umgebungsflags. Herkunft: Erfassungsbogen
 * `src/app/umgebung.d.ts` (Commit f2b77f1, Phase 2 mit der pdfmake-Deklaration
 * aus 441811c).
 */

/** Ersetzt durch `define` in vite.config.ts. */
declare const __APP_VERSION__: string;

/** Vite-Umgebungsflags (nur die hier genutzte Teilmenge). */
interface ImportMeta {
  readonly env: { readonly DEV: boolean };
  readonly dirname: string;
  readonly filename: string;
}

/**
 * Standardschrift-Metriken des pdfmake-Browser-Builds (@types/pdfmake kennt
 * diesen Pfad nicht). Liefert vfs-Einträge und die Font-Definition zum
 * Registrieren per pdfMake.addFontContainer — siehe weitergabe/pdf.ts.
 */
declare module "pdfmake/build/standard-fonts/Helvetica" {
  const fontContainer: {
    vfs: Record<string, { data: string; encoding?: string }>;
    fonts: Record<string, unknown>;
  };
  export default fontContainer;
}
