# Übernahme aus dem Erfassungsbogen

Stand: 2026-10-25, Phase 0 (Gerüst) umgesetzt gegen den Erfassungsbogen auf
Commit `f2b77f1` (Herkunfts-Commit in den Kopfkommentaren). Zeilenzahlen sind
Produktivcode ohne Tests, gemessen im Erfassungsbogen (Commit `c789947`). Jede
Datei bringt ihre Testdatei (`*.test.ts[x]`) mit. Spalte **Stand**: `offen`,
`übernommen`, `entfällt`, `Kopie (Phase 0)` (in Phase 0 als Kopie in
`src/app/` der Meldekopf-App eingebunden, wandert in Phase 1 an den hier
genannten Ort).

Grundregel: **Die Meldekopf-App wird fertig gebaut, bevor der Erfassungsbogen
etwas abbaut.** Bis dahin existieren die Module in beiden Repos; Änderungen am
Erfassungsbogen in dieser Zeit werden hier nachgezogen (Herkunfts-Commit im
Kopfkommentar festhalten).

## A. Bleibt im Kern, wird nur eingebunden

| Submodul | Pin (Erfassungsbogen 2026-10-25) | Nutzung hier |
| --- | --- | --- |
| `vendor/eeb-format` | `eb58ad6` | Modell, Codec, Signatur, Datenschutzfrist |
| `vendor/bos-meldekopf` | `59a986c` | Einsätze, Aufteilen, Zusammenführen, Diff, Papierkorb, Darstellung |
| `vendor/bos-vokabulare` | `2f94a46` | StAN-Vorbelegung, Funkrufnamen, Ebenen, Sitzplätze, Qualifikationen |
| `vendor/bos-taktische-zeichen` | `cb9c227` | Zeichen auf Karten, Tabelle, Monitor, PDF |

## B. Geht neu in den Kern (`@bos/eeb-satz`, ADR-005)

Reine Ausgabe, ohne DOM und React. Repo <https://github.com/wattnpapa/bos-eeb-satz> (angelegt 2026-10-25, mit
Gerüst), Submodul in beiden Apps.

| Datei im Erfassungsbogen | Zeilen | Anmerkung | Stand |
| --- | --- | --- | --- |
| `pdf-dokument.ts` | 2.258 | pdfmake-Dokumentdefinition: Einzel-PDF, Sammel-PDF, Lageblatt, Probesatz, WinAnsi. Braucht pdfmake zum Messen im Test; prüfen, ob unter `node` lauffähig. | offen |
| `pdf-bilder.ts`, `pdf-stroeme.ts`, `pdf-qr.ts` | 225 | QR aus PDF-Bildobjekten lesen, ohne Renderer. | offen |
| `bogen-csv.ts`, `einsatz-csv.ts`, `csv.ts` | 764 | CSV-Langformat, Übersichts-CSV, Formatgrundlagen. | offen |
| `oldenburg-xlsx.ts`, `xlsx.ts` | 934 | Oldenburg-Spalten, minimaler XLSX-Writer. | offen |
| `qr-boegen.ts` | 48 | QR-Texte zu vollständigen Bögen gruppieren. | offen |
| `taktische-zeichen-bogen.ts` | 67 | Zeichen aus einem konkreten Bogen auflösen. | offen |
| `uebung-wasserzeichen.ts` | 20 | | offen |
| `blanko.ts` | 84 | Leerer Bogen. | offen |

Bleibt in den Apps: `pdf.ts` (306, QR-Bild erzeugen, Download, Vorschau,
plattformabhängig).

## C. Geht neu in den Oberflächen-Baustein (`@bos/oberflaeche`, ADR-004)

Darf React und DOM, keine Fachlogik. Repo <https://github.com/wattnpapa/bos-oberflaeche> (angelegt 2026-10-25, mit
Gerüst), Submodul in beiden Apps.

| Datei im Erfassungsbogen | Zeilen | Anmerkung | Stand |
| --- | --- | --- | --- |
| `dialoge.tsx`, `modal-overlay.ts` | 746 | Dialogschicht statt Systemdialoge. | Kopie (Phase 0) |
| `anzeige-modus.ts`, `anzeige-schalter.tsx` | 383 | Hell/Dunkel/Feld/Nacht. | Kopie (Phase 0); Standard-Kennfarbe ist die des Meldekopfs |
| `org-farben.ts` | 358 | Kennfarben, Kopf-Töne 4,5:1 und 7:1. | offen |
| `kopfnav.ts`, `kopfnav-ui.tsx`, `seiten-kopf.tsx` | 394 | Kopfnavigation; Einträge je App konfigurierbar. | Kopie (Phase 0) mit eigenen Einträgen; zeigt, dass die Einträge Daten sein müssen |
| `tipp-schutz.ts` | 288 | Fingerstellen-Sperre, Prellschutz. | Kopie (Phase 0) |
| `schrift-stufe.ts`, `tastatur.ts` | 167 | | Kopie (Phase 0) |
| `daumen-quittung.tsx`, `quittung.ts`, `einlese-quittung.tsx` | 235 | Quittungen am unteren Rand. | offen |
| `eintrag-bewegung.ts`, `kartenstapel.tsx` | 213 | Zugang/Abgang an Listen. | offen |
| `fehlerfaenger.tsx`, `fehler-im-bild.tsx`, `feste-warnung.tsx` | 298 | | offen |
| `schritte/bausteine.tsx` | 742 | Nur die Feld- und Auswahlbausteine, die die Schnellerfassung braucht; Rest bleibt im Erfassungsbogen. | offen |
| `arbeitet.ts`, `werkzeuge.ts`, `tabellen-scroll.tsx` | 167 | Kleinteile; einzeln prüfen. | offen |
| CSS: Design-Token, Grundlayout, `lagemonitor.css` | | Token-Datei aus `src/` des Erfassungsbogens; app-spezifische Regeln bleiben. | Token und Grundregeln als Kopie in `index.html` (Phase 0, Auswahl); `lagemonitor.css` offen |

## D. Übernimmt die Meldekopf-App unverändert (Kopfkommentar mit Herkunft)

| Datei | Zeilen | Zielordner hier | Stand |
| --- | --- | --- | --- |
| `einsaetze-ui.tsx` | 3.924 | `src/app/` | offen |
| `einsaetze-lesen.ts`, `speicher-browser.ts`, `speicher-schonend.ts`, `speicher-fehler-text.ts`, `speicher-warnung.tsx` | 441 | `src/app/` | offen |
| `eintrag-zeiten.ts`, `fassung-vorrang.ts`, `entfernte-meldungen.ts`, `meldungs-vergleich.ts` | 1.364 | `src/app/` | offen |
| `einsatz-abgleich.ts`, `einsatz-wiederherstellen.ts`, `einsatz-transport.ts` | 850 | `src/app/weitergabe/` | offen |
| `export-stand.ts`, `lage-angaben.ts` | 815 | `src/app/weitergabe/` | offen |
| `auswertung.ts`, `einheiten-liste.ts`, `einheiten-tabelle.ts`, `einheiten-index.ts`, `haeufige-funktionen.ts`, `zug-name.ts` | 1.614 | `src/app/` | offen |
| `aufteilen-ui.tsx`, `zusammenfuehren-ui.tsx` | 381 | `src/app/` | offen |
| `lagemonitor-ui.tsx`, `lagemonitor.ts`, `lagemonitor-beginn.ts`, `lagemonitor-speicher.ts`, `lagemonitor.css` | 761 | `src/app/` | offen |
| `papier-abgleich-ui.tsx`, `papier-abgleich-entwurf.ts` | 518 | `src/app/` | offen |
| `qr-scanner-web.tsx`, `qr-decoder.ts`, `qr-bild.ts`, `qr-stapel.ts`, `kamera.ts`, `stapel-quittung.tsx`, `teil-quittung.tsx`, `tastaturbelegung.ts` | 1.545 | `src/app/eingang/` | offen |
| `datei-fehler.ts`, `wartender-link.ts`, `unlesbar.ts`, `unlesbar-hinweis.tsx` | 600 | `src/app/eingang/` | offen |
| `nacherfassung.tsx`, `nur-staerke.ts`, `personal-schnell.ts`, `vorbelegung-rueckweg.ts`, `beispielnamen.ts` | 633 | `src/app/schnellerfassung/` | offen |
| `datenschutz-uhr.ts`, `uhr-korrektur.ts`, `uhr-warnung.tsx`, `uhr-folgen.ts`, `papierkorb-frist.ts`, `aufraeum-hinweis.ts` | 890 | `src/app/` | offen |
| `sicherung.ts`, `sicherung-datei.ts` | 483 | `src/app/` | offen |
| `geraete-schluessel.ts`, `absenderkarte.ts`, `rolle-marke.tsx` | 274 | `src/app/` (Absenderkarte nur lesend) | offen |
| `fenster-abgleich.tsx`, `fenster-unterschied.ts` | 424 | `src/app/` | offen |
| `nativ.ts`, `aktualisierung.tsx`, `nachladen.ts`, `offline-bereit.ts`, `offline-vorrat.ts`, `statistik.ts`, `debug-plattform.tsx` | 1.283 | `src/app/` | offen |
| `electron/main.js`, `android/`, `capacitor.config.json`, `vite.config.ts`, `vitest.config.ts`, `cucumber.mjs`, `tsconfig.json`, `.github/workflows/*` | | Wurzel; Namen und IDs ersetzen | übernommen (Phase 0) bis auf `android/` (Phase 5; Job in `release.yml` stillgelegt). `vite.config.ts` neu: Plugin `adressen` (Domain, CNAME) |
| `scripts/bundle-budget.ts`, `kern-kopien-pruefen.ts`, `sbom.ts`, `precache-aufteilung.ts`, `start-inhalt.mts`, `kopfnav.mts`, `content-stil.mts`, `render-icons.mjs`, `screenshots.mjs`, `og-bild.mjs`, `sitemap.ts` | | `scripts/` | übernommen (Phase 0): `bundle-budget`, `kern-kopien-pruefen`, `sbom`, `precache-aufteilung`, `start-inhalt`, `kopfnav` (schreibt auch die Textseiten), `render-icons` (ohne Android), `sitemap`, `ensure-update-metadata.cjs`. Offen: `content-stil`, `screenshots`, `og-bild` |
| `features/einsatz-sammlung`, `einsatz-detail`, `einheiten-liste`, `qr-scannen`, `uebung`, Teile von `uebergabe` und `daten-und-anzeige`, `schritte/`, `support/`, `fixtures.ts` | | `features/` | `support/` übernommen, `schritte/` die allgemeinen Schritte, `daten-und-anzeige` die Szenarien zu Anzeigemodus, Offline-Start und Pflichtangaben (Phase 0); Rest offen |
| `src/test/` (Startinhalt-Vergleich), `stilregeln-*.test.ts` (Meldekopf-Anteile) | | | `src/test/` übernommen (Phase 0: `oberflaeche.ts`, `pwa-register.ts`, `start-inhalt.test.ts`, `kopfnav.test.ts`); Stilregel-Tests offen |

## E. Übernimmt die Meldekopf-App gekürzt oder neu geschrieben

| Datei | Zeilen | Was anders wird | Stand |
| --- | --- | --- | --- |
| `app.tsx` | 4.701 | Nur der Sammlungs-Anteil: Einsatzliste, Einsatzansicht, Eingangs-Weiche („Wohin damit?"), Link-Empfang, Schnellerfassung, Fußzeilen-Verdrahtung, Datensicherung, Alle Daten löschen. Assistent, Vorlagen, Musterung, eigener Bogen entfallen. Ziel deutlich unter 2.000 Zeilen. | offen |
| `main.tsx` | 67 | Gleich, ohne Vorlagen-Links. | übernommen (Phase 0), die Verdrahtungen der späteren Phasen folgen |
| `entwurf.ts` | 446 | Nur `Entwurf.fremd` (angefangene Schnellerfassung); Rückholplatz und Fensterabgleich des eigenen Bogens entfallen. | offen |
| `hilfen.ts` | 1.281 | Anzeige-Helfer (`einheitAnzeigename`, Funktions-/Kennzeichen-/Funkruftext), `bogenLaden`, `migriereBogen`-Aufruf; Vorlagen-Transport entfällt. Kandidat für den Kern, wenn beide Apps denselben Rest brauchen. | offen |
| `bogen-pruefung.ts` | 212 | Plausibilität nur für die Schnellerfassung. | offen |
| `schritte/einheit.tsx`, `fahrzeuge.tsx`, `personal.tsx` | 2.922 | Nicht übernehmen. Die Schnellerfassung ist ein eigenes, kleines Formular aus `@bos/oberflaeche`-Bausteinen: Einheit (Organisation, Typ, Name, Ort, Funkrufname), Stärke-Zähler, Führungskraft, Fahrzeuge (Typ, Kennzeichen, Sitzplätze). Vorbilder aus den Schritten abschreiben, nicht einbinden. | offen |
| `fusszeile.tsx` | 1.318 | Ohne Vorlagen, Beispielbögen, Absenderkarte-Bearbeitung. | Phase 0: Pflichtangaben, Projekt, Ansicht, Werkzeugzeile; Datensicherung, Geräteschlüssel, Alle Daten löschen folgen mit Phase 2 |
| `start-inhalt.ts` | 296 | Neuer Text für den Meldekopf (Zweck, Eingänge, Weitergabe, Familie). | übernommen, neuer Text (Phase 0) |
| `public/*.html` | | Nur Anleitung (Meldekopf-Teil), Datenschutz, Impressum, Hinweis zur Produktfamilie; Organisations-Landingpages bleiben beim Erfassungsbogen. `meldekopf.html` dort wird zur Weiche hierher. | Datenschutz, Impressum, 404 (Phase 0); Anleitung offen (Phase 5) |

## F. Bleibt im Erfassungsbogen

`schritte/*` (außer Bausteine), `vorlagen.ts`, `vorlagen-ui.tsx`,
`vorlage-nachzuegler.ts`, `musterung-stand.ts`, `absenderkarte-ui.tsx`,
`uebergabe-stand.ts`, `src/vokabulare/landesvorlagen`, `examples/`,
Beispielbogen-Generatoren unter `scripts/`, die Organisations-Landingpages.
Dazu die kommende Zug-aus-Teileinheiten-Funktion.

## G. Reihenfolge

Jede Phase endet mit grünem CI und nachgezogener Doku. Erst nach Phase 5
beginnt der Abbau im Erfassungsbogen.

| Phase | Inhalt | Fertig, wenn |
| --- | --- | --- |
| 0 Gerüst | Repo mit Submodulen (vier Pins aus A), Vite/TS/Vitest/Cucumber-Konfiguration, CSP, PWA, CI (`ci.yml`), leere App mit Startseite und Anzeigemodus; Pages-Deploy auf meldekopf.erfassungsbogen.app; Bundle-Budget erstmals gemessen. **Umgesetzt 2026-10-25**; Pages live, sobald `main` gebaut hat, Pages im Repo auf „GitHub Actions“ steht und der DNS-Eintrag existiert. | `npm run build`, `npm test`, Pages live. |
| 1 Geteilte Bausteine | `@bos/eeb-satz` und `@bos/oberflaeche` (Repos mit Gerüst vorhanden), Dateien aus B und C mit Tests hineinbewegen, ADR-003-Regeln und CI je Repo, hier als Submodule pinnen. Der Erfassungsbogen bleibt unverändert (nutzt weiter seine Kopien). | Beide Submodule bauen; `kern-kopien` grün. |
| 2 Sammlung lesen und zeigen | D: Persistenz-Anbindung, `einsaetze-ui`, Auswertung, Liste, Tabelle, Zug, Status, Aufteilen/Zusammenführen, Fristen, Uhr, Datensicherung. Eine Datensicherung aus dem Erfassungsbogen lädt und zeigt die Sammlung. **ISK und DSFA anlegen.** | Szenarien `einsatz-detail`, `einheiten-liste` grün. |
| 3 Eingänge | Scanner, Handscanner, Bilderstapel, Datei/PDF, Link, Rückfragen, Fassungs-Vorrang, Quittungen. | `einsatz-sammlung`, `qr-scannen` grün. |
| 4 Schnellerfassung | Nur-Stärke-Formular, Namen, Eintreffzeit, StAN-Vorbelegung, Entwurf; „Vollständig erfassen" per Link (Gegenstück im Erfassungsbogen: Rücksprung annehmen, ist dort eine kleine Ergänzung und darf schon jetzt gebaut werden). | Szenario „Einheit manuell in den Einsatz erfassen" grün. |
| 5 Weitergabe, Lagemonitor, Papier | Sammel-PDF, Lageblatt, CSV, XLSX, Einsatz-Datei, Export-Stand, Rückimport mit Abgleich, Lagemonitor, Papier-Abgleich. Electron und Android bauen im Release. | Alle übernommenen Szenarien grün; Release mit Installern und APK. |
| 6 Audit | Die zwölf THW-Reviewer-Rollen gegen den Produktionsbuild; Befunde beheben. | Keine P0/P1. |
| 7 Übergang | Im Erfassungsbogen: Hinweis und „An Meldekopf-App geben" an der Sammlung, Eingänge in die Sammlung sperren, `meldekopf.html` als Weiche; nach Übergangszeit Abbau und Umstellung auf `@bos/eeb-satz`/`@bos/oberflaeche`; dann Zug aus Teileinheiten. | Eigener Plan im Erfassungsbogen-Repo. |
