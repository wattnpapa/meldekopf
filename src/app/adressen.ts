/**
 * Die Adressen der App — die EINE Stelle, an der der Domainname steht.
 *
 * Alles, was die Domain braucht, liest sie von hier: die Content-Security-
 * Policy und die `CNAME`-Datei für GitHub Pages (vite.config.ts), die
 * absoluten Adressen in index.html und den statischen Seiten (Platzhalter
 * `%DOMAIN%`, ersetzt beim Bauen), die Sitemap (scripts/sitemap.ts) und die
 * Fußzeile. Ein Umzug auf eine andere Domain ist damit eine Zeile hier plus
 * der DNS-Eintrag; App-Links (assetlinks.json, AASA) kommen mit den nativen
 * Hüllen dazu und lesen dann ebenfalls von hier.
 *
 * Die Reichweitenmessung hat ihren eigenen Host: GoatCounter führt je Site
 * eine Subdomain, und die Policy lässt genau diesen einen Fremd-Host zu
 * (docs/architektur.md Kap. 3.2 und 8.3 — jede Änderung hier ist
 * datenschutzrelevant).
 */

/** Domain der ausgelieferten PWA, ohne Schema und ohne Schrägstrich. */
export const DOMAIN = "meldekopf.erfassungsbogen.app";

/** Absolute Basisadresse mit Schrägstrich am Ende. */
export const BASIS_URL = `https://${DOMAIN}/`;

/** Das Schwesterprodukt, aus dem die Bögen kommen (PRODUCT.md). */
export const ERFASSUNGSBOGEN_URL = "https://erfassungsbogen.app/";

/** Quellcode, Releases, Fehlermeldungen. */
export const REPO_URL = "https://github.com/wattnpapa/meldekopf";

/**
 * GoatCounter-Site dieser App. Eigene Site, nicht die des Erfassungsbogens:
 * zwei Produkte, zwei Zählungen. Der Host steht als einziger Fremd-Host in
 * `connect-src` und `img-src` der Content-Security-Policy.
 */
export const STATISTIK_HOST = "meldekopf.goatcounter.com";
