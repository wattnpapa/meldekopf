# Übernahme aus dem Erfassungsbogen

Stand: 2026-10-25, Phase 2 (Sammlung lesen und zeigen) umgesetzt gegen den
Erfassungsbogen auf Commit `441811c` (Phase 0: `f2b77f1`; Herkunfts-Commit
jeweils in den Kopfkommentaren). Zwischen beiden liegt „Runde 9: 53 Befunde
behoben“ mit Änderungen an `dialoge.tsx`, `tastatur.ts`, `tipp-schutz.ts`,
`pdf-dokument.ts`, `bogen-csv.ts`, `oldenburg-xlsx.ts`; die Bausteine tragen
den Stand von `441811c`. Zeilenzahlen sind
Produktivcode ohne Tests, gemessen im Erfassungsbogen (Commit `c789947`). Jede
Datei bringt ihre Testdatei (`*.test.ts[x]`) mit. Spalte **Stand**: `offen`,
`übernommen`, `entfällt`, `Kopie (Phase 0)` (in Phase 0 als Kopie in
`src/app/` der Meldekopf-App eingebunden, in Phase 1 an den hier genannten
Ort gewandert).

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

**Widerspruch Doku ↔ Code (festgestellt in Phase 1):** Diese Liste nahm an,
die Dateien ließen sich unverändert verschieben. Im Erfassungsbogen
(`441811c`) importieren aber `pdf-dokument`, `bogen-csv`, `einsatz-csv`,
`oldenburg-xlsx`, `blanko`, `pdf-qr` und `qr-boegen` App-Module, die selbst
`localStorage`, DOM oder Capacitor benutzen: `hilfen` (über `nativ`),
`eintrag-zeiten`, `export-stand`, `fassung-vorrang`, `auswertung`,
`einheiten-tabelle`, `org-farben`, `qr-stapel`, `qr-decoder` (zxing-wasm).
Unverändert in den Kern verschoben, verletzten sie ADR-003 Regel 2 und 3. Es
gilt der Code: Phase 1 hat nur die eigenständigen Dateien aufgenommen. Die
übrigen folgen, sobald diese App die genannten Module aus Abschnitt D
übernommen hat (Phase 2 und 3) und feststeht, welcher reine Teil davon mit in
den Kern geht oder hineingereicht wird; spätestens mit der Weitergabe
(Phase 5).

| Datei im Erfassungsbogen | Zeilen | Anmerkung | Stand |
| --- | --- | --- | --- |
| `pdf-dokument.ts` | 2.258 | pdfmake-Dokumentdefinition: Einzel-PDF, Sammel-PDF, Lageblatt, Probesatz, WinAnsi. Braucht pdfmake zum Messen im Test; im Erfassungsbogen laufen diese Tests schon unter `node` (Projekt `logik`), im Baustein müssen sie zusätzlich unter `jsdom` laufen. | offen (hängt an App-Modulen, s. oben) |
| `pdf-bilder.ts`, `pdf-stroeme.ts`, `pdf-qr.ts` | 225 | QR aus PDF-Bildobjekten lesen, ohne Renderer. | `pdf-bilder`, `pdf-stroeme` übernommen (Phase 1); `pdf-qr` offen (braucht den QR-Decoder der App, wird hineingereicht) |
| `bogen-csv.ts`, `einsatz-csv.ts`, `csv.ts` | 764 | CSV-Langformat, Übersichts-CSV, Formatgrundlagen. | `csv` übernommen (Phase 1); `bogen-csv`, `einsatz-csv` offen (hängen an App-Modulen, s. oben) |
| `oldenburg-xlsx.ts`, `xlsx.ts` | 934 | Oldenburg-Spalten, minimaler XLSX-Writer. | `xlsx` übernommen (Phase 1); `oldenburg-xlsx` offen (s. oben) |
| `qr-boegen.ts` | 48 | QR-Texte zu vollständigen Bögen gruppieren. | offen (hängt an `qr-stapel` der App) |
| `taktische-zeichen-bogen.ts` | 67 | Zeichen aus einem konkreten Bogen auflösen. | übernommen (Phase 1) |
| `uebung-wasserzeichen.ts` | 20 | | übernommen (Phase 1) |
| `blanko.ts` | 84 | Leerer Bogen. | offen (hängt an `pdf-dokument`) |

Bleibt in den Apps: `pdf.ts` (306, QR-Bild erzeugen, Download, Vorschau,
plattformabhängig).

## C. Geht neu in den Oberflächen-Baustein (`@bos/oberflaeche`, ADR-004)

Darf React und DOM, keine Fachlogik. Repo <https://github.com/wattnpapa/bos-oberflaeche> (angelegt 2026-10-25, mit
Gerüst), Submodul in beiden Apps. App-Eigenes wird hineingereicht: die
Kennfarbe ohne offenen Bogen (`standardThemeFarbeSetzen`), Kopfnav-Einträge
und Logo (`KopfnavQuelle`), die Werkzeugliste, die Wege des Fehlerfängers
(`FehlerfaengerWege`), sortierte Code-Tabellen der Auswahl.

| Datei im Erfassungsbogen | Zeilen | Anmerkung | Stand |
| --- | --- | --- | --- |
| `dialoge.tsx`, `modal-overlay.ts` | 746 | Dialogschicht statt Systemdialoge. | übernommen (Phase 1), eingebunden |
| `anzeige-modus.ts`, `anzeige-schalter.tsx` | 383 | Hell/Dunkel/Feld/Nacht. | übernommen (Phase 1), eingebunden; Kennfarbe wird hineingereicht (`kennfarbe.ts`) |
| `org-farben.ts` | 358 | Kennfarben, Kopf-Töne 4,5:1 und 7:1. | übernommen (Phase 1); hier eingebunden mit den Zeichen (Phase 2) |
| `kopfnav.ts`, `kopfnav-ui.tsx`, `seiten-kopf.tsx` | 394 | Kopfnavigation; Einträge je App konfigurierbar. | übernommen (Phase 1), eingebunden; Einträge in `src/app/kopfnav.ts` |
| `tipp-schutz.ts` | 288 | Fingerstellen-Sperre, Prellschutz. | übernommen (Phase 1), eingebunden |
| `schrift-stufe.ts`, `tastatur.ts` | 167 | | übernommen (Phase 1), eingebunden |
| `daumen-quittung.tsx`, `quittung.ts`, `einlese-quittung.tsx` | 235 | Quittungen am unteren Rand. | übernommen (Phase 1); eingebunden mit den Eingängen (Phase 3) |
| `eintrag-bewegung.ts`, `kartenstapel.tsx` | 213 | Zugang/Abgang an Listen. | übernommen (Phase 1); eingebunden mit der Liste (Phase 2) |
| `fehlerfaenger.tsx`, `fehler-im-bild.tsx`, `feste-warnung.tsx` | 298 | Sichern, Löschen, Herunterladen kommen von der App. | übernommen (Phase 1); eingebunden mit der Datensicherung (Phase 2) |
| `schritte/bausteine.tsx` | 742 | Nur die Feld- und Auswahlbausteine, die die Schnellerfassung braucht; Rest bleibt im Erfassungsbogen. | übernommen (Phase 1) als `bausteine` samt `zahl-eingabe`: Feld, Auswahl, VokabAuswahl (sortiert nicht selbst), Vorschlagsfeld, Zahlenfeld, Stepper, Hinweise. Im Erfassungsbogen bleiben `VokabListe`, `Vollstaendigkeit`, `KennzahlenFeld`, `SchrittProps` |
| `arbeitet.ts`, `werkzeuge.ts`, `tabellen-scroll.tsx` | 167 | Kleinteile; einzeln prüfen. | übernommen (Phase 1); `werkzeuge` nur das Markup, die Liste bleibt in `src/app/werkzeuge.ts` |
| CSS: Design-Token, Grundlayout, `lagemonitor.css` | | Token-Datei aus `src/` des Erfassungsbogens; app-spezifische Regeln bleiben. | Token und Modus-Belegung als `stil/token.css` im Baustein (Phase 1), beim Bauen in die `index.html` eingesetzt (Plugin `oberflaeche-token`); Kennfarbe und übrige Regeln bleiben in der `index.html`. Grundlayout und `lagemonitor.css` offen |

## D. Übernimmt die Meldekopf-App unverändert (Kopfkommentar mit Herkunft)

| Datei | Zeilen | Zielordner hier | Stand |
| --- | --- | --- | --- |
| `einsaetze-ui.tsx` | 3.924 | `src/app/` | übernommen (Phase 2), eingebunden über `einsatz-ansicht.tsx` |
| `einsaetze-lesen.ts`, `speicher-browser.ts`, `speicher-schonend.ts`, `speicher-fehler-text.ts`, `speicher-warnung.tsx` | 441 | `src/app/` | übernommen (Phase 2) |
| `eintrag-zeiten.ts`, `fassung-vorrang.ts`, `entfernte-meldungen.ts`, `meldungs-vergleich.ts` | 1.364 | `src/app/` | übernommen (Phase 2) |
| `einsatz-abgleich.ts`, `einsatz-wiederherstellen.ts`, `einsatz-transport.ts` | 850 | `src/app/weitergabe/` | übernommen (Phase 2); Import-Knopf „Einsatz importieren…“ seit Phase 3 |
| `export-stand.ts`, `lage-angaben.ts` | 815 | `src/app/weitergabe/` | übernommen (Phase 2) |
| `auswertung.ts`, `einheiten-liste.ts`, `einheiten-tabelle.ts`, `einheiten-index.ts`, `haeufige-funktionen.ts`, `zug-name.ts` | 1.614 | `src/app/` | übernommen (Phase 2) |
| `aufteilen-ui.tsx`, `zusammenfuehren-ui.tsx` | 381 | `src/app/` | übernommen (Phase 2) |
| `lagemonitor-ui.tsx`, `lagemonitor.ts`, `lagemonitor-beginn.ts`, `lagemonitor-speicher.ts`, `lagemonitor.css` | 761 | `src/app/` | übernommen (Phase 2), Fenster aus `main.tsx`; Electron-Fenster Phase 5 |
| `papier-abgleich-ui.tsx`, `papier-abgleich-entwurf.ts` | 518 | `src/app/` | übernommen (Phase 2) |
| `qr-scanner-web.tsx`, `qr-decoder.ts`, `qr-bild.ts`, `qr-stapel.ts`, `kamera.ts`, `stapel-quittung.tsx`, `teil-quittung.tsx`, `tastaturbelegung.ts` | 1.545 | `src/app/eingang/` | `qr-decoder.ts`, `qr-bild.ts`, `qr-stapel.ts` übernommen (Phase 2, Abhängigkeiten der Einsatzansicht); Rest übernommen (Phase 3), dazu `pdf-qr.ts` und `qr-boegen.ts` |
| `datei-fehler.ts`, `wartender-link.ts`, `unlesbar.ts`, `unlesbar-hinweis.tsx` | 600 | `src/app/eingang/` | `datei-fehler.ts`, `unlesbar.ts`, `unlesbar-hinweis.tsx` übernommen (Phase 2), dazu `unlesbar-aufraeumen.ts`; `wartender-link.ts` übernommen (Phase 3) |
| `nacherfassung.tsx`, `nur-staerke.ts`, `personal-schnell.ts`, `vorbelegung-rueckweg.ts`, `beispielnamen.ts` | 633 | `src/app/schnellerfassung/` | `nacherfassung.tsx`, `nur-staerke.ts` übernommen (Phase 2, Abhängigkeiten der Einsatzansicht); Rest offen (Phase 4) |
| `datenschutz-uhr.ts`, `uhr-korrektur.ts`, `uhr-warnung.tsx`, `uhr-folgen.ts`, `papierkorb-frist.ts`, `aufraeum-hinweis.ts` | 890 | `src/app/` | übernommen (Phase 2) |
| `sicherung.ts`, `sicherung-datei.ts` | 483 | `src/app/` | übernommen (Phase 2); die Gruppe „Daten" der Fußzeile steht in `daten-gruppe.tsx` |
| `geraete-schluessel.ts`, `absenderkarte.ts`, `rolle-marke.tsx` | 274 | `src/app/` (Absenderkarte nur lesend) | übernommen (Phase 2) |
| `fenster-abgleich.tsx`, `fenster-unterschied.ts` | 424 | `src/app/` | übernommen (Phase 2); Verdrahtung in `app.tsx` offen, folgt mit Phase 5 (Weitergabe zwischen Fenstern) |
| `nativ.ts`, `aktualisierung.tsx`, `nachladen.ts`, `offline-bereit.ts`, `offline-vorrat.ts`, `statistik.ts`, `debug-plattform.tsx` | 1.283 | `src/app/` | `nativ.ts` (volle Fassung), `nachladen.ts`, `debug-plattform.tsx` übernommen (Phase 2); `aktualisierung.tsx`, `statistik.ts` Phase 0; `offline-bereit.ts`, `offline-vorrat.ts` offen |
| `electron/main.js`, `android/`, `capacitor.config.json`, `vite.config.ts`, `vitest.config.ts`, `cucumber.mjs`, `tsconfig.json`, `.github/workflows/*` | | Wurzel; Namen und IDs ersetzen | übernommen (Phase 0) bis auf `android/` (Phase 5; Job in `release.yml` stillgelegt). `vite.config.ts` neu: Plugin `adressen` (Domain, CNAME) |
| `vorlagen.ts`, `uebergabe-stand.ts` | 474 | `src/app/` | übernommen (Phase 2) als reine Datenmodule: Die Datensicherung zählt, prüft und erhält Vorlagen eines eingespielten Erfassungsbogen-Bestands; keine Oberfläche dafür (Abweichung von Abschnitt F, damit eine Sicherung verlustfrei hin und zurück geht) |
| `scripts/bundle-budget.ts`, `kern-kopien-pruefen.ts`, `sbom.ts`, `precache-aufteilung.ts`, `start-inhalt.mts`, `kopfnav.mts`, `content-stil.mts`, `render-icons.mjs`, `screenshots.mjs`, `og-bild.mjs`, `sitemap.ts` | | `scripts/` | übernommen (Phase 0): `bundle-budget`, `kern-kopien-pruefen`, `sbom`, `precache-aufteilung`, `start-inhalt`, `kopfnav` (schreibt auch die Textseiten), `render-icons` (ohne Android), `sitemap`, `ensure-update-metadata.cjs`. Offen: `content-stil`, `screenshots`, `og-bild` |
| `features/einsatz-sammlung`, `einsatz-detail`, `einheiten-liste`, `qr-scannen`, `uebung`, Teile von `uebergabe` und `daten-und-anzeige`, `schritte/`, `support/`, `fixtures.ts` | | `features/` | `support/` übernommen, `schritte/` die allgemeinen Schritte, `daten-und-anzeige` die Szenarien zu Anzeigemodus, Offline-Start und Pflichtangaben (Phase 0); Rest offen; Phase 2: `einsatz-detail` (18 von 25 Szenarien, dazu neu die Datensicherung) und `einheiten-liste` (13 von 14), Schritte in `schritte/sammlung.steps.ts`, `fixtures.ts`, Grundlage `support/sammlung.ts`; Phase 3: `einsatz-sammlung` (5 von 7 unverändert, „Gescannten Bogen in einen neu angelegten Einsatz aufnehmen“ über die Rückfrage statt über den offenen Bogen, „Bogen schließen“ entfällt, neu: Link in laufende Sammlung, abgebrochene Rückfrage) und `qr-scannen` (2 von 2; das QR-Bild erzeugt der Prüfstand, Schritte in `schritte/eingang.steps.ts`) |
| `src/test/` (Startinhalt-Vergleich), `stilregeln-*.test.ts` (Meldekopf-Anteile) | | | `src/test/` übernommen (Phase 0: `oberflaeche.ts`, `pwa-register.ts`, `start-inhalt.test.ts`, `kopfnav.test.ts`); Stilregel-Tests offen |

## E. Übernimmt die Meldekopf-App gekürzt oder neu geschrieben

| Datei | Zeilen | Was anders wird | Stand |
| --- | --- | --- | --- |
| `app.tsx` | 4.701 | Nur der Sammlungs-Anteil: Einsatzliste, Einsatzansicht, Eingangs-Weiche („Wohin damit?"), Link-Empfang, Schnellerfassung, Fußzeilen-Verdrahtung, Datensicherung, Alle Daten löschen. Assistent, Vorlagen, Musterung, eigener Bogen entfallen. Ziel deutlich unter 2.000 Zeilen. | Phase 2: Startseite mit Weiche „Bögen sammeln", Einsatzliste, zuletzt offene Sammlung; Einsatzansicht und Ausgabewege in `einsatz-ansicht.tsx`. Phase 3: Eingangs-Weiche und Link-Empfang als Hook `eingang/aufnahme.tsx` (`useAufnahme`), `einsatzErfragen` in `einsatz-erfragen.ts`; Schnellerfassung offen (Phase 4) |
| `main.tsx` | 67 | Gleich, ohne Vorlagen-Links. | übernommen (Phase 0); seit Phase 2 mit Speicher, Uhr, Fehlerfänger und Lagemonitor-Fenster |
| `entwurf.ts` | 446 | Nur `Entwurf.fremd` (angefangene Schnellerfassung); Rückholplatz und Fensterabgleich des eigenen Bogens entfallen. | zunächst unverändert übernommen (Phase 2, Abhängigkeit der Datensicherung); Kürzung mit der Schnellerfassung (Phase 4) |
| `hilfen.ts` | 1.281 | Anzeige-Helfer (`einheitAnzeigename`, Funktions-/Kennzeichen-/Funkruftext), `bogenLaden`, `migriereBogen`-Aufruf; Vorlagen-Transport entfällt. Kandidat für den Kern, wenn beide Apps denselben Rest brauchen. | unverändert übernommen (Phase 2); Kürzung offen |
| `bogen-pruefung.ts` | 212 | Plausibilität nur für die Schnellerfassung. | unverändert übernommen (Phase 2, Abhängigkeit von `hilfen.ts`); Kürzung mit Phase 4 |
| `schritte/einheit.tsx`, `fahrzeuge.tsx`, `personal.tsx` | 2.922 | Nicht übernehmen. Die Schnellerfassung ist ein eigenes, kleines Formular aus `@bos/oberflaeche`-Bausteinen: Einheit (Organisation, Typ, Name, Ort, Funkrufname), Stärke-Zähler, Führungskraft, Fahrzeuge (Typ, Kennzeichen, Sitzplätze). Vorbilder aus den Schritten abschreiben, nicht einbinden. | offen |
| `fusszeile.tsx` | 1.318 | Ohne Vorlagen, Beispielbögen, Absenderkarte-Bearbeitung. | Phase 0: Pflichtangaben, Projekt, Ansicht, Werkzeugzeile; Phase 2: Gruppe „Daten" (`daten-gruppe.tsx`) |
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
| 1 Geteilte Bausteine | `@bos/eeb-satz` und `@bos/oberflaeche` (Repos mit Gerüst vorhanden), Dateien aus B und C mit Tests hineinbewegen, ADR-003-Regeln und CI je Repo, hier als Submodule pinnen. Der Erfassungsbogen bleibt unverändert (nutzt weiter seine Kopien). **Umgesetzt 2026-10-25**: C vollständig, B in einer ersten Stufe (eigenständige Dateien, s. Widerspruch in B). | Beide Submodule bauen; `kern-kopien` grün. |
| 2 Sammlung lesen und zeigen | D: Persistenz-Anbindung, `einsaetze-ui`, Auswertung, Liste, Tabelle, Zug, Status, Aufteilen/Zusammenführen, Fristen, Uhr, Datensicherung. Eine Datensicherung aus dem Erfassungsbogen lädt und zeigt die Sammlung. **ISK und DSFA anlegen.** **Umgesetzt 2026-10-25**, mit dem ganzen Abhängigkeitsbaum von `einsaetze-ui` (Lagemonitor, Papier-Abgleich, Ausgabewege); die Szenarien legen die Sammlung bis Phase 3 direkt auf das Gerät. | Szenarien `einsatz-detail`, `einheiten-liste` grün. |
| 3 Eingänge | Scanner, Handscanner, Bilderstapel, Datei/PDF, Link, Rückfragen, Fassungs-Vorrang, Quittungen. **Umgesetzt 2026-10-25**; ohne Absenderkarte (der Meldekopf signiert nur mit dem Geräteschlüssel). Der Fensterabgleich folgt mit Phase 5. | `einsatz-sammlung`, `qr-scannen` grün. |
| 4 Schnellerfassung | Nur-Stärke-Formular, Namen, Eintreffzeit, StAN-Vorbelegung, Entwurf; „Vollständig erfassen" per Link (Gegenstück im Erfassungsbogen: Rücksprung annehmen, ist dort eine kleine Ergänzung und darf schon jetzt gebaut werden). | Szenario „Einheit manuell in den Einsatz erfassen" grün. |
| 5 Weitergabe, Lagemonitor, Papier | Sammel-PDF, Lageblatt, CSV, XLSX, Einsatz-Datei, Export-Stand, Rückimport mit Abgleich, Lagemonitor, Papier-Abgleich. Electron und Android bauen im Release. | Alle übernommenen Szenarien grün; Release mit Installern und APK. |
| 6 Audit | Die zwölf THW-Reviewer-Rollen gegen den Produktionsbuild; Befunde beheben. | Keine P0/P1. |
| 7 Übergang | Im Erfassungsbogen: Hinweis und „An Meldekopf-App geben" an der Sammlung, Eingänge in die Sammlung sperren, `meldekopf.html` als Weiche; nach Übergangszeit Abbau und Umstellung auf `@bos/eeb-satz`/`@bos/oberflaeche`; dann Zug aus Teileinheiten. | Eigener Plan im Erfassungsbogen-Repo. |
