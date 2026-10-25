/**
 * Kennfarbe des Meldekopfs: Petrol (docs/architektur.md Kap. 8.1).
 *
 * Steht ein zweites Mal in der index.html (Meta-Tag `theme-color` und
 * `--akzent` im Stylesheet), weil beides vor dem Bundle gelten muss;
 * src/test/anzeige-meldekopf.test.tsx hält die drei Stellen zusammen. Der
 * Anzeigemodus aus `@bos/oberflaeche` kennt keine Kennfarbe einer App und
 * bekommt sie beim Start hineingereicht (`standardThemeFarbeSetzen` in
 * main.tsx) — im Erfassungsbogen ist es das Dienstblau #12275e.
 */
export const KENNFARBE = "#0f4c5c";
