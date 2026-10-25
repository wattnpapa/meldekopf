# Funktionsumfang der Meldekopf-App

Stand: 2026-10-25, Projektanlage. Spalte **Stand** je Funktion: `übernehmen`
(existiert im Erfassungsbogen, wird herausgelöst), `neu` (gibt es noch
nirgends), `erledigt` (in dieser App fertig). Die Spalte **Herkunft** nennt
die Dateien im Erfassungsbogen (`src/app/`), aus denen die Funktion kommt;
Gherkin-Szenarien stehen in `features/` dort.

Grundsatz: Die Funktionen werden übernommen, nicht neu erfunden. Jede davon
hat im Erfassungsbogen acht Audit-Runden aus zwölf Nutzerrollen hinter sich;
die Befund-Nummern (R2-D4, R4-W1 …) in den Kopfkommentaren der Dateien
erklären, warum etwas so ist, wie es ist. Diese Begründungen gehen mit.

## 1. Einsätze anlegen und führen

| Funktion | Beschreibung | Herkunft | Stand |
| --- | --- | --- | --- |
| Einsatz anlegen | Name, Art (Einsatz, Übung, Bereitstellungsraum), Ort. Eingabetaste legt an, Esc bricht ab, ohne Namen kein Einsatz. | `einsaetze-ui.tsx`, `@bos/meldekopf/einsaetze` (`einsatzAnlegen`), `einsatz-sammlung.feature` | übernehmen |
| Einsatzliste auf der Startseite | Alle Sammlungen mit Summen, zuletzt geöffnete zuerst; „Fortsetzen" für die zuletzt offene Sammlung (12 Stunden gemerkt). | `einsaetze-ui.tsx` (`EinsatzListe`), `kartenstapel.tsx` | übernehmen |
| Einsatzansicht | Detailsicht mit Summenzeile, Karten- oder Tabellensicht, Filterleiste ab der zweiten Meldung, Knöpfe für Eingang, Weitergabe, Lagemonitor. | `einsaetze-ui.tsx` (`EinsatzDetail`) | übernehmen |
| Übung | Ein als Übung gekennzeichneter Bogen oder Einsatz wird nicht zur Lage gezählt; Wasserzeichen im PDF; Datenschutzfrist greift nicht. | `uebung-wasserzeichen.ts`, `uebung.feature` | übernehmen |
| Einsatz löschen, Papierkorb | Gelöschte Sammlungen liegen 30 Tage im Papierkorb und kommen zurück; endgültiges Löschen fragt in der App zurück. | `@bos/meldekopf/papierkorb`, `papierkorb-frist.ts`, `papierkorb-ui.test.tsx` | übernehmen |
| Ruhende Sammlungen | Nach 90 Tagen ohne Änderung löscht der Kern die Sammlung; die App merkt sich Name, Zeitraum und Zahl der Meldungen und sagt es einmal auf der Startseite. | `aufraeum-hinweis.ts` | übernehmen |
| Zwei Fenster, ein Speicher | Änderungen aus einem anderen Fenster derselben App werden sofort übernommen (`storage`-Ereignis), nichts überschreibt sich still. | `fenster-abgleich.tsx`, `fenster-unterschied.ts` | übernehmen |

## 2. Eingänge: Bögen aufnehmen

| Funktion | Beschreibung | Herkunft | Stand |
| --- | --- | --- | --- |
| Kamera-Scan | Web: `getUserMedia` mit ZXing (bis zu acht Symbole je Bild), jsQR als Rückfallebene; nativ: Capacitor-Barcode-Scanner. Mehrteilige Bögen mit Kästchenzeile je Teil und Mindestanzeigedauer. | `qr-scanner-web.tsx`, `qr-decoder.ts`, `kamera.ts`, `teil-quittung.tsx`, `qr-scannen.feature` | übernehmen |
| USB-Handscanner | Scanner tippt den QR-Inhalt wie eine Tastatur; die App entwirrt Tastaturbelegungsfehler. | `tastaturbelegung.ts`, `tastatur.ts` | übernehmen |
| Bilderstapel | Fotos und Screenshots aus Messenger, Mail, Ordner: Mehrfachauswahl, am Rechner ganzer Ordner. Sequenzielle Verarbeitung, Mehrteil-Erkennung über Bilder hinweg (`TeileMerker`, eine Stunde im Arbeitsspeicher), Bericht am Ende: aufgenommen, doppelt, fehlende Teile. | `qr-stapel.ts`, `qr-bild.ts`, `qr-boegen.ts`, `stapel-quittung.tsx` | übernehmen |
| Datei und PDF | JSON-Bogen, Einsatz-Datei, PDF mit QR (Bild-Objekte roh lesen, ohne PDF-Renderer). Erkennt, ob eine PDF eine Sammlung, einzelne Bögen oder nur QR enthält. | `einsatz-transport.ts`, `pdf-bilder.ts`, `pdf-stroeme.ts`, `pdf-qr.ts`, `datei-fehler.ts` | übernehmen |
| Link | `https://…/#<Payload>` aus AirDrop, Quick Share, Messenger; bei laufender App über `hashchange`, beim Kaltstart nach dem Mounten; „Wohin damit?" bei mehreren Sammlungen. Wartender Link im Sitzungsspeicher. | `wartender-link.ts`, Teile von `app.tsx` (`uebernimmBogen`, `empfangsZielWaehlen`) | übernehmen |
| Rückweg „An Meldekopf geben" | Der Erfassungsbogen schickt einen fertigen Bogen per Link an die Meldekopf-App auf demselben oder einem anderen Gerät. | neu, Gegenstück im Erfassungsbogen | neu |
| Aufnahme-Logik | Fingerabdruck je Einheit, Dedupe über Inhalts-Hash, Folgemeldung als neue Revision, Diff gegen die letzte Meldung, Zug-Etikett. | `@bos/meldekopf/einsaetze`, `eintrag-zeiten.ts` (`meldungAufnehmen`), `arc42` Kap. 6.3 | übernehmen |
| Rückfrage „Einheit ist bereits gemeldet" | Gegenüberstellung beider Meldungen (Stärke, Ansprechperson, Kennzeichen, Änderungen); Hinweis, wenn keine Person und kein Fahrzeug gemeinsam ist. | `meldungs-vergleich.ts`, `nacherfassung.tsx` (`aehnlicherOrt`, `andererEinheitstyp`) | übernehmen |
| Welche Fassung gilt | App-Regel über der Kern-Regel: Eine ausdrücklich verdrängte Fassung trägt `ersetztDurch`; Schnellerfassung wird vom später eintreffenden, aber älter datierten Bogen abgelöst. | `fassung-vorrang.ts` | übernehmen |
| Signatur und Herkunft | Ed25519-Signatur prüfen, Signaturkette (Gegenzeichnen), Absenderkarte des Senders anzeigen; unsignierte Bögen behaupten keine Herkunft. | `@bos/eeb-format/signatur`, `geraete-schluessel.ts`, `absenderkarte.ts`, `rolle-marke.tsx` | übernehmen |
| Schema-Migration | Alte QR-Codes und Dateien (ab Schema 2) werden beim Lesen auf das aktuelle Schema gehoben. | `@bos/eeb-format/model` (`migriereBogen`), `hilfen.ts` (`bogenLaden`) | übernehmen |
| Eingangsquittung | Quittung fest am unteren Rand mit „Rückgängig" in voller Knopfgröße; bleibt, bis sie ersetzt oder geschlossen wird. | `daumen-quittung.tsx`, `einlese-quittung.tsx`, `quittung.ts` | übernehmen |

## 3. Schnellerfassung: Einheit ohne Bogen

| Funktion | Beschreibung | Herkunft | Stand |
| --- | --- | --- | --- |
| Nur-Stärke-Bogen | Einheit, Stärke (F/UF/M), Führungskraft, Fahrzeuge; in wenigen Minuten erfasst, als Bogen gedruckt und in die Sammlung aufgenommen. Zähler statt Personenliste. | `nur-staerke.ts`, `bogen-transport.feature` („Meldekopf-Schnellerfassung"), Teile von `schritte/` | übernehmen, reduziert |
| Namen schnell einsetzen | Namensliste aus der Zwischenablage oder vom Papier als Text einfügen, Rollen aus der Funktion ableiten. | `personal-schnell.ts` | übernehmen |
| Eintreffzeit | Beim manuellen Erfassen Vorschlag aus dem Beginn der Erfassung; Plausibilität (gestern, Zukunft). | `nacherfassung.tsx` (`EintreffzeitFeld`, `eintreffzeitPruefen`) | übernehmen |
| Vorbelegung aus StAN | THW-Einheitstyp wählt Sollausstattung (Personal, Fahrzeuge) und Funkrufnamen vor. | `@bos/vokabulare/thw-stan-*`, `thw-funkrufnamen`, `vorbelegung-rueckweg.ts` | übernehmen |
| Vollständiger Bogen | Nicht in dieser App: „Vollständig erfassen" öffnet den Erfassungsbogen per Link mit dem Payload; der Bogen kommt per Link zurück in die Sammlung. | neu | neu |
| Entwurf der Fremderfassung | Angefangene Schnellerfassung überlebt Neuladen; sie ist an die Ziel-Sammlung gebunden. | `entwurf.ts` (`Entwurf.fremd`) | übernehmen, reduziert |

## 4. Die Lage: Summen, Liste, Tabelle

| Funktion | Beschreibung | Herkunft | Stand |
| --- | --- | --- | --- |
| Summen | Stärke (F/UF/M//Ges), Sofortbedarf (Verpflegung, Unterbringung M/W/D, Kraftstoff), Fahrzeuge über alle anwesenden Einheiten; Zwischensummen je Zug. Abgerückte zählen nicht. | `auswertung.ts` (`aggregiere`, `aggregiereNachZug`) | übernehmen |
| Kartensicht | Eine Karte je Einheit: Stärke, Führungskraft, Fahrzeuge, Status, Zug, Marken (neue Fassung, vom Papier, signiert); Vollansicht aufklappbar. | `einsaetze-ui.tsx` | übernehmen |
| Tabellensicht | Eine Zeile je Einheit mit Stärke, Verpflegung, Unterbringung, Kraftstoff; Sortierung je Spalte, Summenzeile. Suche und Filter gelten für beide Sichten. | `einheiten-tabelle.ts`, `tabellen-scroll.tsx`, `einheiten-liste.feature` | übernehmen |
| Suche und Filter | UND-Suche über Einheit, Organisation, Ort, Zug, Kennzeichen, Funkrufname, Auftrag, Bemerkung; nicht über Personennamen. Qualifikationsfilter („wer hat Atemschutzgeräteträger gemeldet?") mit Namen; Kraftfahrer-Filter mit eingeschlossenen Klassen. Sortierung nach Name, Eintreffzeit, Stärke. | `einheiten-liste.ts`, `haeufige-funktionen.ts`, `einheiten-index.ts` | übernehmen |
| Zug zuordnen | Freitext mit Vorschlagsliste; Schreibweisen werden vereinheitlicht („Zug 2", „2.Zug" → „2. Zug"). | `zug-name.ts` | übernehmen |
| Abrücken und Status | Anwesend, abgerückt (mit Zeit), Zeitkorrektur; jeder Wechsel als Vermerk mit Uhrzeit im Verlauf der Einheit. | `eintrag-zeiten.ts` (`vermerke`, `eingetroffenAm`, `abgerueckAm`) | übernehmen |
| Auftrag/Notiz | Freitext der Führungsstelle je Einheit; erbt sich auf Folgemeldungen. | `eintrag-zeiten.ts` (`notiz`) | übernehmen |
| Aufteilen | Eine Meldung in zwei zählende Einheiten trennen, ohne Stärke zu verlieren (der Fachberater steht plötzlich einzeln). | `@bos/meldekopf/aufteilen`, `aufteilen-ui.tsx` | übernehmen |
| Zusammenführen | Gegenrichtung: aufgeteilte Teile wieder zu einer Einheit. | `@bos/meldekopf/zusammenfuehren`, `zusammenfuehren-ui.tsx` | übernehmen |
| Entfernen | Einheit samt Fassungen aus der Sammlung nehmen; die App merkt sich die Kennung, damit ein späterer Import nachfragt statt sie still zurückzuholen. | `entfernte-meldungen.ts` | übernehmen |
| Folgemeldung und Historie | Jede neue Fassung derselben Einheit wandert in die Historie; die neueste zählt. Dieselbe Einheit lässt sich getrennt weiterführen. | `@bos/meldekopf/einsaetze` (`revisionen`), `einsatz-detail.feature` | übernehmen |
| Schichtübergabe-Diff | Was sich gegenüber der letzten Meldung geändert hat („Stärke 12 → 9, Fahrzeug abgemeldet, Ruhezeit nötig"); Marke „neue Fassung", bis sie zur Kenntnis genommen ist. | `@bos/meldekopf/meldung-diff`, `export-stand.ts` (Kenntnis-Stand) | übernehmen |
| Taktische Zeichen | Zeichen je Einheit und Fahrzeug auf Karte, Tabelle, Lagemonitor und PDF. | `@bos/taktische-zeichen`, `taktische-zeichen-bogen.ts`, `org-farben.ts` | übernehmen |
| Bewegung an Listen | Zugang und Abgang sichtbar (Stempel, abgehende Karte), unter reduzierter Bewegung ersatzlos. | `eintrag-bewegung.ts`, `kartenstapel.tsx` | übernehmen |

## 5. Lagemonitor für den Fernseher

| Funktion | Beschreibung | Herkunft | Stand |
| --- | --- | --- | --- |
| Zweites Fenster | Eigene Adresse (`?lagemonitor=<Einsatz>`), auf den per Kabel angeschlossenen Fernseher gezogen; liest denselben lokalen Speicher, hält den Bildschirm wach, aktualisiert sich selbst. | `lagemonitor-ui.tsx`, `lagemonitor.ts` | übernehmen |
| Inhalt | Funkrufname der Führungsstelle, Einsatzname, DTG, Einsatzdauer ab handgesetztem Beginn, Stärke F/UF/M; aufklappbar die Einheitentabelle mit Organisation, Ort, Funkrufname, Einheitentyp, Stärke, Fahrzeuge. Keine Personennamen. | `lagemonitor.ts`, `lagemonitor-beginn.ts`, `lagemonitor-speicher.ts` | übernehmen |
| Helligkeitsstufen | Dunkel und Nacht für das Fahrzeug, gemerkt unter `eeb.lagestufe.v1`. | `lagemonitor-ui.tsx` | übernehmen |
| Beginn und Funkrufname reisen mit | Beide Angaben wandern im Umschlag der Sammel-PDF und der Einsatz-Datei mit und werden nur gesetzt, wenn das Gerät noch nichts hat. | `lage-angaben.ts` | übernehmen |

## 6. Weitergabe und Exporte

| Funktion | Beschreibung | Herkunft | Stand |
| --- | --- | --- | --- |
| Sammel-PDF | Alle Bögen eines Einsatzes in einer Datei im Papier-Layout, voran das Lageblatt mit der Übersicht (eine Zeile je Einheit, Diff seit der letzten Meldung) und dem Kasten „Stand am Meldekopf"; QR je Bogen, Kopfzeile je Seite, enge Setzung ohne Restseiten. Die Sammel-PDF bringt die ganze Sammlung auf ein leeres Gerät. | `pdf-dokument.ts` (`einsatzPdfDokumentGesetzt`, Lageblatt), `pdf.ts` | übernehmen |
| Lageblatt allein | Nur die Übersichtsseite, mit Lageblatt-Stand („Lageblatt erstellt um …"). | `pdf-dokument.ts`, `export-stand.ts` (`lageblattVermerken`) | übernehmen |
| CSV-Übersicht | Eine Zeile je Einheit für die Lagekarte. | `einsatz-csv.ts`, `csv.ts` | übernehmen |
| CSV mit allen Daten | Langformat mit Satzart-Spalte: je eine Zeile für Einheit, jede Person, jedes Fahrzeug; Semikolon, UTF-8-BOM, Dezimalkomma. | `bogen-csv.ts`, `csv.ts` | übernehmen |
| Excel-Liste „Oldenburg" | 38 Spalten, Farben, Datumsformate der Oldenburger Vorlage; eigener minimaler XLSX-Writer. | `oldenburg-xlsx.ts`, `xlsx.ts` | übernehmen |
| Einsatz-Datei | JSON-Umschlag mit Sammlung, Export-Ständen und Lage-Angaben; Eingang in S1-Control und in ein zweites Meldekopf-Gerät. | `einsatz-transport.ts` (`einsatzDateiInhalt`, `einsatzAusDatei`) | übernehmen |
| Nur neue seit dem letzten Export | Export-Stand je Einsatz **und Format**; Haken „Nur neue Bögen seit dem letzten Export", Zeile darüber nennt den Zeitpunkt; Nachtragsgründe (neue Fassung, Ort geändert). | `export-stand.ts` (`eeb.export-stand.v2`) | übernehmen |
| Weitergabe-Stand | Wann ging zuletzt die ganze Sammlung heraus; Übergabevermerk mit Zustand je Einheit. | `export-stand.ts` (`weitergabeVermerken`) | übernehmen |
| Einsatz importieren und abgleichen | Rückimport einer Sammlung vom zweiten Gerät (Ablösung): neue Meldungen kommen dazu, Zusätze der Führungsstelle (Status, Zug, Notiz, Eintreffzeit) werden je Feld nach Vermerk-Zeit abgeglichen, Widersprüche genannt. | `einsatz-abgleich.ts`, `einsatz-wiederherstellen.ts` | übernehmen |
| Teilen nativ | AirDrop, Quick Share, Share-Sheet über Capacitor; Dateien speichern. | `nativ.ts` | übernehmen |

## 7. Papier als Rückfallebene

| Funktion | Beschreibung | Herkunft | Stand |
| --- | --- | --- | --- |
| Lage vom Papier abgleichen | Nach Geräteausfall: Bögen von der Sammel-PDF scannen, dann Eintreffzeit, Status und Zug je Einheit in einer Liste nachtragen, „Abgleich übernehmen" schreibt alles in einem Schritt; bis dahin Marke „vom Papier, Zeiten prüfen". | `papier-abgleich-ui.tsx`, `papier-abgleich.test.ts` | übernehmen |
| Zwischenstand des Abgleichs | Eingaben überleben Neuladen im Sitzungsspeicher (`eeb.papierabgleich.v1.<Einsatz>`). | `papier-abgleich-entwurf.ts` | übernehmen |
| Blanko-Bogen | Leerer Bogen zum Ausdrucken für die Handschrift. | `blanko.ts` | übernehmen |

## 8. Speicher, Fristen, Sicherung

| Funktion | Beschreibung | Herkunft | Stand |
| --- | --- | --- | --- |
| Lokale Ablage | Alles im `localStorage` des Geräts, Schlüssel mit Präfix `eeb.`; der Kern bekommt die Ablage hineingereicht. Schonende Hülle: kein Schreiben unveränderten Textes, Lesen scheitert nicht an gesperrtem Speicher. | `speicher-browser.ts`, `speicher-schonend.ts`, `einsaetze-lesen.ts` | übernehmen |
| Datenschutzfrist | 90 Tage nach `stand` werden Personaldaten einer Meldung anonymisiert (Übungen ausgenommen); Anzeige, wann es fällig wird. | `@bos/eeb-format/datenschutzfrist`, `datenschutz-uhr.ts` | übernehmen |
| Geprüfte Geräteuhr | Sprung der Uhr um mehr als 60 Tage hält alle Fristen an, bis „Geräteuhr stimmt" bestätigt ist; nie durch Zeitablauf. | `datenschutz-uhr.ts`, `uhr-korrektur.ts`, `uhr-warnung.tsx`, `uhr-folgen.ts` | übernehmen |
| Datensicherung | Alle Daten als Datei sichern und auf ein leeres Gerät zurückholen; Erinnerung nach drei Tagen. | `sicherung.ts`, `sicherung-datei.ts`, `daten-und-anzeige.feature` | übernehmen |
| Alle Daten löschen | Mit bewusstem Haken; leert den Gerätespeicher vollständig. | `app.tsx`, `daten-und-anzeige.feature` | übernehmen |
| Speicherwarnung | Voller oder gesperrter Speicher wird gemeldet, nichts geht still verloren. | `speicher-warnung.tsx`, `speicher-fehler-text.ts` | übernehmen |
| Unlesbarer Bestand | Ein Eintrag, den die App nicht lesen kann, wird beiseitegelegt und genannt, nicht überschrieben. | `unlesbar.ts`, `unlesbar-hinweis.tsx` | übernehmen |
| Bestandsdaten aus dem Erfassungsbogen | Sammlungen aus `eeb.einsaetze.v1` des Erfassungsbogens per Datensicherung oder Einsatz-Datei übernehmen; gleiche Schlüssel, gleiche Fassung. | neu, Leser vorhanden | neu |

## 9. Oberfläche und Plattform

| Funktion | Beschreibung | Herkunft | Stand |
| --- | --- | --- | --- |
| Anzeigemodi | Hell, Dunkel, Feld (Sonne, 7:1), Nacht; nur per Schalter, ohne gespeicherte Wahl die Systemeinstellung; Kopfbalken in Kennfarbe der Organisation. | `anzeige-modus.ts`, `anzeige-schalter.tsx`, `org-farben.ts` | übernehmen |
| Dialogschicht | `frageText`, `frageFelder`, `frageJaNein`, `frageWahl`, `zeigeHinweis` statt Systemdialoge. | `dialoge.tsx`, `modal-overlay.ts` | übernehmen |
| Tipp-Schutz | Fingerstellen-Sperre nach Handlungen, die unter dem Finger etwas austauschen; Prellschutz an Quittungen. | `tipp-schutz.ts` | übernehmen |
| Schriftstufen und Tastatur | `schrift-gross` ab 22 px Grundschrift; `tastatur-offen` blendet die Fußleiste unter der Bildschirmtastatur aus. | `schrift-stufe.ts`, `tastatur.ts` | übernehmen |
| Zurück-Geste | Schließt zuerst das oberste offene Fenster, wie Escape. | Teile von `app.tsx` | übernehmen |
| Kopfnavigation, Fußzeile | Gemeinsame Kopfzeile mit den Inhaltsseiten; Fußzeile mit Datensicherung, Anzeigemodus, Pflichtangaben, Offline-Vorrat. | `kopfnav.ts`, `kopfnav-ui.tsx`, `fusszeile.tsx`, `seiten-kopf.tsx`, `offline-bereit.ts`, `offline-vorrat.ts` | übernehmen, gekürzt |
| Offline-Start | Service Worker (Workbox) mit zweistufigem Vorrat; Fortschritt „2,1 von 6,7 MB". | `vite.config.ts` (VitePWA), `offline-vorrat.ts`, `nachladen.ts` | übernehmen |
| Update-Hinweise | Service-Worker-Banner im Web, Auto-Update-Status im Desktop. | `aktualisierung.tsx` | übernehmen |
| Fehlerfänger | Abgefangener Renderfehler mit verständlicher Meldung statt weißem Bildschirm. | `fehlerfaenger.tsx`, `fehler-im-bild.tsx`, `feste-warnung.tsx` | übernehmen |
| Nutzungsmessung | Ein Treffer je Kaltstart an GoatCounter, cookielos, ohne Fremdcode, Widerspruch per Schlüssel. | `statistik.ts` | übernehmen |
| Electron-Hülle | Desktop-Fenster, Auto-Update, Berechtigungen (Kamera erlaubt), externe Links im Systembrowser, zweites Fenster für den Lagemonitor. | `electron/main.js` | übernehmen |
| Capacitor-Hülle | Android (und später iOS): Barcode-Scanner, Dateisystem, Teilen, App-Links. | `android/`, `capacitor.config.json`, `nativ.ts` | übernehmen |
| Startseite | Erklärender Text einmal als Daten, daraus React-Ansicht und statisches Gerüst in `index.html`. | `start-inhalt.ts`, `scripts/start-inhalt.mts` | übernehmen, neuer Text |
| Erststart | Erklärt das Grundprinzip beim ersten Aufruf. | `app.tsx`, `daten-und-anzeige.feature` | übernehmen, neuer Text |

## 10. Bewusst nicht in dieser App

| Nicht hier | Wo stattdessen |
| --- | --- |
| Vollständiger Assistent (Einheit, Einsatz, Personal, Fahrzeuge, Sofortbedarf, Übersicht) | Erfassungsbogen; von hier per Link erreichbar |
| Eigene Vorlagen, Musterung, Landes- und Organisations-Beispielbögen | Erfassungsbogen |
| Eigener Bogen, Entwurf, Absenderkarte als Sender | Erfassungsbogen |
| Zug aus Teileinheiten zusammenstellen | Erfassungsbogen (geplant, nach Fertigstellung dieser App) |
| Lagekarte, Einsatztagebuch, Aufträge, Kräfteübersicht über mehrere Meldeköpfe, mehrere Geräte, Verlauf über Tage | S1-Control |
| Server, Anmeldung, Cloud, Synchronisation | nirgends |

## 11. Übernommene Gherkin-Szenarien

Aus `features/` des Erfassungsbogens gehören mit: `einsatz-sammlung.feature`
(7 Szenarien), `einsatz-detail.feature` (28), `einheiten-liste.feature` (16),
`uebergabe.feature` nur die Teile zu Sammel-PDF, CSV, Excel und Link-Eingang,
`qr-scannen.feature` (2), `daten-und-anzeige.feature` (Anzeigemodus,
Datensicherung, Alle Daten löschen, Offline-Start, Erststart, kaputter Link),
`uebung.feature`. Die Schritt-Definitionen unter `features/schritte/` und
`features/support/` sind die Grundlage; Formulierungen, die den Assistenten
voraussetzen, werden auf die Schnellerfassung umgeschrieben.
