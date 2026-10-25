# Funktionsumfang der Meldekopf-App

Stand: 2026-10-25, Phase 2 (Sammlung lesen und zeigen) umgesetzt. Spalte **Stand**
je Funktion: `übernehmen` (existiert im Erfassungsbogen, wird herausgelöst),
`neu` (gibt es noch nirgends), `erledigt` (in dieser App fertig),
`aus @bos/oberflaeche` (Mechanik im geteilten Oberflächen-Baustein, in dieser
App eingebunden, Phase 1). Die Spalte **Herkunft** nennt
die Dateien im Erfassungsbogen (`src/app/`), aus denen die Funktion kommt;
Gherkin-Szenarien stehen in `features/` dort.

Grundsatz: Die Funktionen werden übernommen, nicht neu erfunden. Jede davon
hat im Erfassungsbogen acht Audit-Runden aus zwölf Nutzerrollen hinter sich;
die Befund-Nummern (R2-D4, R4-W1 …) in den Kopfkommentaren der Dateien
erklären, warum etwas so ist, wie es ist. Diese Begründungen gehen mit.

## 1. Einsätze anlegen und führen

| Funktion | Beschreibung | Herkunft | Stand |
| --- | --- | --- | --- |
| Einsatz anlegen | Name, Art (Einsatz, Übung, Bereitstellungsraum), Ort. Eingabetaste legt an, Esc bricht ab, ohne Namen kein Einsatz. | `einsaetze-ui.tsx`, `@bos/meldekopf/einsaetze` (`einsatzAnlegen`), `einsatz-sammlung.feature` | erledigt (Phase 2) |
| Einsatzliste auf der Startseite | Alle Sammlungen mit Summen, zuletzt geöffnete zuerst; „Fortsetzen" für die zuletzt offene Sammlung (12 Stunden gemerkt). | `einsaetze-ui.tsx` (`EinsatzListe`), `kartenstapel.tsx` | erledigt (Phase 2) |
| Einsatzansicht | Detailsicht mit Summenzeile, Karten- oder Tabellensicht, Filterleiste ab der zweiten Meldung, Knöpfe für Eingang, Weitergabe, Lagemonitor. | `einsaetze-ui.tsx` (`EinsatzDetail`) | erledigt (Phase 2); Aufnahme-Knöpfe verdrahtet (Phase 3), „Einheit manuell erfassen…“ öffnet die Schnellerfassung (Phase 4) |
| Übung | Ein als Übung gekennzeichneter Bogen oder Einsatz wird nicht zur Lage gezählt; Wasserzeichen im PDF; die Datenschutzfrist greift beim Übungsbogen nicht (eine Sammlung der Art „Übung" nimmt ihre Meldungen davon nicht aus). | `uebung-wasserzeichen.ts`, `uebung.feature` | erledigt (Phase 2) |
| Einsatz löschen, Papierkorb | Gelöschte Sammlungen liegen 30 Tage im Papierkorb und kommen zurück; endgültiges Löschen fragt in der App zurück. | `@bos/meldekopf/papierkorb`, `papierkorb-frist.ts`, `papierkorb-ui.test.tsx` | erledigt (Phase 2) |
| Ruhende Sammlungen | Nach 90 Tagen ohne Änderung löscht der Kern die Sammlung; die App merkt sich Name, Zeitraum und Zahl der Meldungen und sagt es einmal auf der Startseite. | `aufraeum-hinweis.ts` | erledigt (Phase 2) |
| Zwei Fenster, ein Speicher | Änderungen aus einem anderen Fenster derselben App werden sofort übernommen (`storage`-Ereignis), nichts überschreibt sich still. | `fenster-abgleich.tsx`, `fenster-unterschied.ts` | Module übernommen (Phase 2), Verdrahtung in `app.tsx` mit Phase 3 |

## 2. Eingänge: Bögen aufnehmen

| Funktion | Beschreibung | Herkunft | Stand |
| --- | --- | --- | --- |
| Kamera-Scan | Web: `getUserMedia` mit ZXing (bis zu acht Symbole je Bild), jsQR als Rückfallebene; nativ: Capacitor-Barcode-Scanner. Mehrteilige Bögen mit Kästchenzeile je Teil und Mindestanzeigedauer. | `qr-scanner-web.tsx`, `qr-decoder.ts`, `kamera.ts`, `teil-quittung.tsx`, `qr-scannen.feature` | erledigt (Phase 3, `eingang/`; nativer Weg über `nativ.ts`, geprüft mit der Capacitor-Hülle in Phase 5) |
| USB-Handscanner | Scanner tippt den QR-Inhalt wie eine Tastatur; die App entwirrt Tastaturbelegungsfehler. | `tastaturbelegung.ts`, `tastatur.ts` | erledigt (Phase 3, `eingang/tastaturbelegung.ts`) |
| Bilderstapel | Fotos und Screenshots aus Messenger, Mail, Ordner: Mehrfachauswahl, am Rechner ganzer Ordner. Sequenzielle Verarbeitung, Mehrteil-Erkennung über Bilder hinweg (`TeileMerker`, eine Stunde im Arbeitsspeicher), Bericht am Ende: aufgenommen, doppelt, fehlende Teile. | `qr-stapel.ts`, `qr-bild.ts`, `qr-boegen.ts`, `stapel-quittung.tsx` | erledigt (Phase 3, `eingang/qr-boegen.ts`, `eingang/stapel-quittung.tsx`) |
| Datei und PDF | JSON-Bogen, Einsatz-Datei, PDF mit QR (Bild-Objekte roh lesen, ohne PDF-Renderer). Erkennt, ob eine PDF eine Sammlung, einzelne Bögen oder nur QR enthält. | `einsatz-transport.ts`, `pdf-bilder.ts`, `pdf-stroeme.ts`, `pdf-qr.ts`, `datei-fehler.ts` | erledigt (Phase 3, `eingang/pdf-qr.ts`; Satz-Leser aus `@bos/eeb-satz`) |
| Link | `https://…/#<Payload>` aus AirDrop, Quick Share, Messenger; bei laufender App über `hashchange`, beim Kaltstart nach dem Mounten; „Wohin damit?" bei mehreren Sammlungen. Wartender Link im Sitzungsspeicher. | `wartender-link.ts`, Teile von `app.tsx` (`uebernimmBogen`, `empfangsZielWaehlen`) | erledigt (Phase 3, `eingang/aufnahme.tsx`): Ein Bogen öffnet sich hier nicht; die Rückfrage bietet die Sammlungen, eine neue Sammlung oder den Erfassungsbogen an |
| Rückweg „An Meldekopf geben" | Der Erfassungsbogen schickt einen fertigen Bogen per Link an die Meldekopf-App auf demselben oder einem anderen Gerät. | neu, Gegenstück im Erfassungsbogen | neu |
| Aufnahme-Logik | Fingerabdruck je Einheit, Dedupe über Inhalts-Hash, Folgemeldung als neue Revision, Diff gegen die letzte Meldung, Zug-Etikett. | `@bos/meldekopf/einsaetze`, `eintrag-zeiten.ts` (`meldungAufnehmen`), `arc42` Kap. 6.3 | erledigt (Phase 2 Logik, Phase 3 Eingänge) |
| Rückfrage „Einheit ist bereits gemeldet" | Gegenüberstellung beider Meldungen (Stärke, Ansprechperson, Kennzeichen, Änderungen); Hinweis, wenn keine Person und kein Fahrzeug gemeinsam ist. | `meldungs-vergleich.ts`, `nacherfassung.tsx` (`aehnlicherOrt`, `andererEinheitstyp`) | erledigt (Phase 3, `eingang/aufnahme.tsx`) |
| Welche Fassung gilt | App-Regel über der Kern-Regel: Eine ausdrücklich verdrängte Fassung trägt `ersetztDurch`; Schnellerfassung wird vom später eintreffenden, aber älter datierten Bogen abgelöst. | `fassung-vorrang.ts` | erledigt (Phase 2 Anzeige, Phase 3 Rückfrage beim Eingang) |
| Signatur und Herkunft | Ed25519-Signatur prüfen, Signaturkette (Gegenzeichnen), Absenderkarte des Senders anzeigen; unsignierte Bögen behaupten keine Herkunft. | `@bos/eeb-format/signatur`, `geraete-schluessel.ts`, `absenderkarte.ts`, `rolle-marke.tsx` | Prüfung, Anzeige und Gegenzeichnen erledigt (Phase 2 und 3); eine eigene Absenderkarte hat der Meldekopf nicht, er signiert nur mit dem Geräteschlüssel |
| Schema-Migration | Alte QR-Codes und Dateien (ab Schema 2) werden beim Lesen auf das aktuelle Schema gehoben. | `@bos/eeb-format/model` (`migriereBogen`), `hilfen.ts` (`bogenLaden`) | erledigt (Phase 2, Kern und `hilfen.ts`) |
| Eingangsquittung | Quittung fest am unteren Rand mit „Rückgängig" in voller Knopfgröße; bleibt, bis sie ersetzt oder geschlossen wird. | `daumen-quittung.tsx`, `einlese-quittung.tsx`, `quittung.ts` | erledigt (Phase 3, Bausteine aus `@bos/oberflaeche`) |

## 3. Schnellerfassung: Einheit ohne Bogen

| Funktion | Beschreibung | Herkunft | Stand |
| --- | --- | --- | --- |
| Nur-Stärke-Bogen | Einheit, Stärke (F/UF/M), Führungskraft, Fahrzeuge; in wenigen Minuten erfasst, als Bogen gedruckt und in die Sammlung aufgenommen. Zähler statt Personenliste. | `nur-staerke.ts`, `bogen-transport.feature` („Meldekopf-Schnellerfassung"), Teile von `schritte/` | erledigt (Phase 4, `schnellerfassung/schnellerfassung.tsx`, `staerke.tsx`); eine Seite statt des Assistenten, Führungskraft als eine Zeile (Name, Telefon); gedruckt wird über die Sammel-PDF |
| Namen schnell einsetzen | Namensliste aus der Zwischenablage oder vom Papier als Text einfügen, Rollen aus der Funktion ableiten. | `personal-schnell.ts` | entfällt (Phase 4): Die Schnellerfassung führt keine Personenliste; Namenslisten gehören in den vollständigen Bogen im Erfassungsbogen |
| Eintreffzeit | Beim manuellen Erfassen Vorschlag aus dem Beginn der Erfassung; Plausibilität (gestern, Zukunft). | `nacherfassung.tsx` (`EintreffzeitFeld`, `eintreffzeitPruefen`) | erledigt (Phase 4, mit Nr. laut Zettel und Zug) |
| Vorbelegung aus StAN | THW-Einheitstyp wählt Sollausstattung (Personal, Fahrzeuge) und Funkrufnamen vor. | `@bos/vokabulare/thw-stan-*`, `thw-funkrufnamen`, `vorbelegung-rueckweg.ts` | erledigt (Phase 4, `schnellerfassung/einheit.tsx`): Einheitstyp, OV-Verzeichnis, Funkrufnamen der Fahrzeuge; Sollplätze nur im Erfassungsbogen, weil die Schnellerfassung die Stärke zählt |
| Vollständiger Bogen | Nicht in dieser App: „Vollständig erfassen" öffnet den Erfassungsbogen per Link mit dem Payload; der Bogen kommt per Link zurück in die Sammlung. | neu | erledigt (Phase 4): „Im Erfassungsbogen vollständig erfassen…“ öffnet ihn mit dem Payload im Fragment; zurück per QR-Code oder Link. Ein Rücksprung-Parameter (`rueck=meldekopf`) fehlt noch, er braucht das Gegenstück im Erfassungsbogen (Phase 7) |
| Entwurf der Fremderfassung | Angefangene Schnellerfassung überlebt Neuladen; sie ist an die Ziel-Sammlung gebunden. | `entwurf.ts` (`Entwurf.fremd`) | erledigt (Phase 4); `entwurf.ts` ist noch die ungekürzte Fassung |

## 4. Die Lage: Summen, Liste, Tabelle

| Funktion | Beschreibung | Herkunft | Stand |
| --- | --- | --- | --- |
| Summen | Stärke (F/UF/M//Ges), Sofortbedarf (Verpflegung, Unterbringung M/W/D, Kraftstoff), Fahrzeuge über alle anwesenden Einheiten; Zwischensummen je Zug. Abgerückte zählen nicht. | `auswertung.ts` (`aggregiere`, `aggregiereNachZug`) | erledigt (Phase 2) |
| Kartensicht | Eine Karte je Einheit: Stärke, Führungskraft, Fahrzeuge, Status, Zug, Marken (neue Fassung, vom Papier, signiert); Vollansicht aufklappbar. | `einsaetze-ui.tsx` | erledigt (Phase 2) |
| Tabellensicht | Eine Zeile je Einheit mit Stärke, Verpflegung, Unterbringung, Kraftstoff; Sortierung je Spalte, Summenzeile. Suche und Filter gelten für beide Sichten. | `einheiten-tabelle.ts`, `tabellen-scroll.tsx`, `einheiten-liste.feature` | erledigt (Phase 2) |
| Suche und Filter | UND-Suche über Einheit, Organisation, Ort, Zug, Kennzeichen, Funkrufname, Auftrag, Bemerkung; nicht über Personennamen. Qualifikationsfilter („wer hat Atemschutzgeräteträger gemeldet?") mit Namen; Kraftfahrer-Filter mit eingeschlossenen Klassen. Sortierung nach Name, Eintreffzeit, Stärke. | `einheiten-liste.ts`, `haeufige-funktionen.ts`, `einheiten-index.ts` | erledigt (Phase 2) |
| Zug zuordnen | Freitext mit Vorschlagsliste; Schreibweisen werden vereinheitlicht („Zug 2", „2.Zug" → „2. Zug"). | `zug-name.ts` | erledigt (Phase 2) |
| Abrücken und Status | Anwesend, abgerückt (mit Zeit), Zeitkorrektur; jeder Wechsel als Vermerk mit Uhrzeit im Verlauf der Einheit. | `eintrag-zeiten.ts` (`vermerke`, `eingetroffenAm`, `abgerueckAm`) | erledigt (Phase 2) |
| Auftrag/Notiz | Freitext der Führungsstelle je Einheit; erbt sich auf Folgemeldungen. | `eintrag-zeiten.ts` (`notiz`) | erledigt (Phase 2) |
| Aufteilen | Eine Meldung in zwei zählende Einheiten trennen, ohne Stärke zu verlieren (der Fachberater steht plötzlich einzeln). | `@bos/meldekopf/aufteilen`, `aufteilen-ui.tsx` | erledigt (Phase 2) |
| Zusammenführen | Gegenrichtung: aufgeteilte Teile wieder zu einer Einheit. | `@bos/meldekopf/zusammenfuehren`, `zusammenfuehren-ui.tsx` | erledigt (Phase 2) |
| Entfernen | Einheit samt Fassungen aus der Sammlung nehmen; die App merkt sich die Kennung, damit ein späterer Import nachfragt statt sie still zurückzuholen. | `entfernte-meldungen.ts` | erledigt (Phase 2) |
| Folgemeldung und Historie | Jede neue Fassung derselben Einheit wandert in die Historie; die neueste zählt. Dieselbe Einheit lässt sich getrennt weiterführen. | `@bos/meldekopf/einsaetze` (`revisionen`), `einsatz-detail.feature` | Historie erledigt (Phase 2); neue Fassung aufnehmen mit Phase 3 |
| Schichtübergabe-Diff | Was sich gegenüber der letzten Meldung geändert hat („Stärke 12 → 9, Fahrzeug abgemeldet, Ruhezeit nötig"); Marke „neue Fassung", bis sie zur Kenntnis genommen ist. | `@bos/meldekopf/meldung-diff`, `export-stand.ts` (Kenntnis-Stand) | erledigt (Phase 2) |
| Taktische Zeichen | Zeichen je Einheit und Fahrzeug auf Karte, Tabelle, Lagemonitor und PDF. | `@bos/taktische-zeichen`, `taktische-zeichen-bogen.ts`, `org-farben.ts` | erledigt (Phase 2) |
| Bewegung an Listen | Zugang und Abgang sichtbar (Stempel, abgehende Karte), unter reduzierter Bewegung ersatzlos. | `eintrag-bewegung.ts`, `kartenstapel.tsx` | erledigt (Phase 2) |

## 5. Lagemonitor für den Fernseher

| Funktion | Beschreibung | Herkunft | Stand |
| --- | --- | --- | --- |
| Zweites Fenster | Eigene Adresse (`?lagemonitor=<Einsatz>`), auf den per Kabel angeschlossenen Fernseher gezogen; liest denselben lokalen Speicher, hält den Bildschirm wach, aktualisiert sich selbst. | `lagemonitor-ui.tsx`, `lagemonitor.ts` | übernommen und eingebunden (Phase 2); eigenes Electron-Fenster und Szenario mit Phase 5 |
| Inhalt | Funkrufname der Führungsstelle, Einsatzname, DTG, Einsatzdauer ab handgesetztem Beginn, Stärke F/UF/M; aufklappbar die Einheitentabelle mit Organisation, Ort, Funkrufname, Einheitentyp, Stärke, Fahrzeuge. Keine Personennamen. | `lagemonitor.ts`, `lagemonitor-beginn.ts`, `lagemonitor-speicher.ts` | übernommen (Phase 2) |
| Helligkeitsstufen | Dunkel und Nacht für das Fahrzeug, gemerkt unter `eeb.lagestufe.v1`. | `lagemonitor-ui.tsx` | übernommen (Phase 2) |
| Beginn und Funkrufname reisen mit | Beide Angaben wandern im Umschlag der Sammel-PDF und der Einsatz-Datei mit und werden nur gesetzt, wenn das Gerät noch nichts hat. | `lage-angaben.ts` | übernommen (Phase 2) |

## 6. Weitergabe und Exporte

| Funktion | Beschreibung | Herkunft | Stand |
| --- | --- | --- | --- |
| Sammel-PDF | Alle Bögen eines Einsatzes in einer Datei im Papier-Layout, voran das Lageblatt mit der Übersicht (eine Zeile je Einheit, Diff seit der letzten Meldung) und dem Kasten „Stand am Meldekopf"; QR je Bogen, Kopfzeile je Seite, enge Setzung ohne Restseiten. Die Sammel-PDF bringt die ganze Sammlung auf ein leeres Gerät. | `pdf-dokument.ts` (`einsatzPdfDokumentGesetzt`, Lageblatt), `pdf.ts` | erledigt (Phase 2) |
| Lageblatt allein | Nur die Übersichtsseite, mit Lageblatt-Stand („Lageblatt erstellt um …"). | `pdf-dokument.ts`, `export-stand.ts` (`lageblattVermerken`) | erledigt (Phase 2) |
| CSV-Übersicht | Eine Zeile je Einheit für die Lagekarte. | `einsatz-csv.ts`, `csv.ts` | erledigt (Phase 2) |
| CSV mit allen Daten | Langformat mit Satzart-Spalte: je eine Zeile für Einheit, jede Person, jedes Fahrzeug; Semikolon, UTF-8-BOM, Dezimalkomma. | `bogen-csv.ts`, `csv.ts` | erledigt (Phase 2) |
| Excel-Liste „Oldenburg" | 38 Spalten, Farben, Datumsformate der Oldenburger Vorlage; eigener minimaler XLSX-Writer. | `oldenburg-xlsx.ts`, `xlsx.ts` | erledigt (Phase 2) |
| Einsatz-Datei | JSON-Umschlag mit Sammlung, Export-Ständen und Lage-Angaben; Eingang in S1-Control und in ein zweites Meldekopf-Gerät. | `einsatz-transport.ts` (`einsatzDateiInhalt`, `einsatzAusDatei`) | Schreiben übernommen (Phase 2); wie im Erfassungsbogen trägt die Sammel-PDF die Sammlung eingebettet, der JSON-Knopf steht nur im Debug-Modus |
| Nur neue seit dem letzten Export | Export-Stand je Einsatz **und Format**; Haken „Nur neue Bögen seit dem letzten Export", Zeile darüber nennt den Zeitpunkt; Nachtragsgründe (neue Fassung, Ort geändert). | `export-stand.ts` (`eeb.export-stand.v2`) | erledigt (Phase 2) |
| Weitergabe-Stand | Wann ging zuletzt die ganze Sammlung heraus; Übergabevermerk mit Zustand je Einheit. | `export-stand.ts` (`weitergabeVermerken`) | erledigt (Phase 2) |
| Einsatz importieren und abgleichen | Rückimport einer Sammlung vom zweiten Gerät (Ablösung): neue Meldungen kommen dazu, Zusätze der Führungsstelle (Status, Zug, Notiz, Eintreffzeit) werden je Feld nach Vermerk-Zeit abgeglichen, Widersprüche genannt. | `einsatz-abgleich.ts`, `einsatz-wiederherstellen.ts` | erledigt (Phase 3, Knopf „Einsatz importieren…“ auf der Startseite) |
| Teilen nativ | AirDrop, Quick Share, Share-Sheet über Capacitor; Dateien speichern. | `nativ.ts` | übernommen (Phase 2, `nativ.ts`), wirksam mit den Hüllen (Phase 5) |

## 7. Papier als Rückfallebene

| Funktion | Beschreibung | Herkunft | Stand |
| --- | --- | --- | --- |
| Lage vom Papier abgleichen | Nach Geräteausfall: Bögen von der Sammel-PDF scannen, dann Eintreffzeit, Status und Zug je Einheit in einer Liste nachtragen, „Abgleich übernehmen" schreibt alles in einem Schritt; bis dahin Marke „vom Papier, Zeiten prüfen". | `papier-abgleich-ui.tsx`, `papier-abgleich.test.ts` | erledigt (Phase 2) |
| Zwischenstand des Abgleichs | Eingaben überleben Neuladen im Sitzungsspeicher (`eeb.papierabgleich.v1.<Einsatz>`). | `papier-abgleich-entwurf.ts` | erledigt (Phase 2) |
| Blanko-Bogen | Leerer Bogen zum Ausdrucken für die Handschrift. | `blanko.ts` | erledigt (Phase 2) |

## 8. Speicher, Fristen, Sicherung

| Funktion | Beschreibung | Herkunft | Stand |
| --- | --- | --- | --- |
| Lokale Ablage | Alles im `localStorage` des Geräts, Schlüssel mit Präfix `eeb.`; der Kern bekommt die Ablage hineingereicht. Schonende Hülle: kein Schreiben unveränderten Textes, Lesen scheitert nicht an gesperrtem Speicher. | `speicher-browser.ts`, `speicher-schonend.ts`, `einsaetze-lesen.ts` | erledigt (Phase 2) |
| Datenschutzfrist | 90 Tage nach `stand` werden Personaldaten einer Meldung anonymisiert (Übungen ausgenommen); Anzeige, wann es fällig wird. | `@bos/eeb-format/datenschutzfrist`, `datenschutz-uhr.ts` | erledigt (Phase 2) |
| Geprüfte Geräteuhr | Sprung der Uhr um mehr als 60 Tage hält alle Fristen an, bis „Geräteuhr stimmt" bestätigt ist; nie durch Zeitablauf. | `datenschutz-uhr.ts`, `uhr-korrektur.ts`, `uhr-warnung.tsx`, `uhr-folgen.ts` | erledigt (Phase 2) |
| Datensicherung | Alle Daten als Datei sichern und auf ein leeres Gerät zurückholen; Erinnerung nach drei Tagen. | `sicherung.ts`, `sicherung-datei.ts`, `daten-und-anzeige.feature` | erledigt (Phase 2), `daten-gruppe.tsx` |
| Alle Daten löschen | Mit bewusstem Haken; leert den Gerätespeicher vollständig. | `app.tsx`, `daten-und-anzeige.feature` | erledigt (Phase 2) |
| Speicherwarnung | Voller oder gesperrter Speicher wird gemeldet, nichts geht still verloren. | `speicher-warnung.tsx`, `speicher-fehler-text.ts` | erledigt (Phase 2) |
| Unlesbarer Bestand | Ein Eintrag, den die App nicht lesen kann, wird beiseitegelegt und genannt, nicht überschrieben. | `unlesbar.ts`, `unlesbar-hinweis.tsx` | erledigt (Phase 2) |
| Bestandsdaten aus dem Erfassungsbogen | Sammlungen aus `eeb.einsaetze.v1` des Erfassungsbogens per Datensicherung oder Einsatz-Datei übernehmen; gleiche Schlüssel, gleiche Fassung. | neu, Leser vorhanden | erledigt: über die Datensicherung (Phase 2) und über die Einsatz-Datei (Phase 3) |

## 9. Oberfläche und Plattform

| Funktion | Beschreibung | Herkunft | Stand |
| --- | --- | --- | --- |
| Anzeigemodi | Hell, Dunkel, Feld (Sonne, 7:1), Nacht; nur per Schalter, ohne gespeicherte Wahl die Systemeinstellung; Kopfbalken in Kennfarbe der Organisation. | `anzeige-modus.ts`, `anzeige-schalter.tsx`, `org-farben.ts` | aus @bos/oberflaeche; Kennfarbe Petrol über `standardThemeFarbeSetzen` (`kennfarbe.ts`), Kopfbalken fest in der Meldekopf-Farbe; `org-farben` liegt im Baustein und färbt ab Phase 2 Zeichen und Marken |
| Dialogschicht | `frageText`, `frageFelder`, `frageJaNein`, `frageWahl`, `zeigeHinweis` statt Systemdialoge. | `dialoge.tsx`, `modal-overlay.ts` | aus @bos/oberflaeche |
| Tipp-Schutz | Fingerstellen-Sperre nach Handlungen, die unter dem Finger etwas austauschen; Prellschutz an Quittungen. | `tipp-schutz.ts` | aus @bos/oberflaeche |
| Schriftstufen und Tastatur | `schrift-gross` ab 22 px Grundschrift; `tastatur-offen` blendet die Fußleiste unter der Bildschirmtastatur aus. | `schrift-stufe.ts`, `tastatur.ts` | aus @bos/oberflaeche |
| Zurück-Geste | Schließt zuerst das oberste offene Fenster, wie Escape. | Teile von `app.tsx` | übernehmen |
| Kopfnavigation, Fußzeile | Gemeinsame Kopfzeile mit den Inhaltsseiten; Fußzeile mit Datensicherung, Anzeigemodus, Pflichtangaben, Offline-Vorrat. | `kopfnav.ts`, `kopfnav-ui.tsx`, `fusszeile.tsx`, `seiten-kopf.tsx`, `offline-bereit.ts`, `offline-vorrat.ts` | Kopfnav, Seitenkopf, Werkzeugzeile: aus @bos/oberflaeche, Einträge in `kopfnav.ts` und `werkzeuge.ts` dieser App; Fußzeile gekürzt (Phase 0: Pflichtangaben, Projekt, Ansicht, Werkzeugzeile); Offline-Vorrat offen (Phase 2) |
| Offline-Start | Service Worker (Workbox) mit zweistufigem Vorrat; Fortschritt „2,1 von 6,7 MB". | `vite.config.ts` (VitePWA), `offline-vorrat.ts`, `nachladen.ts` | Service Worker und zweistufiger Vorrat erledigt (Phase 0); Fortschrittsanzeige offen (Phase 2) |
| Update-Hinweise | Service-Worker-Banner im Web, Auto-Update-Status im Desktop. | `aktualisierung.tsx` | Web erledigt (Phase 0); Desktop-Status mit Electron-Release (Phase 5) |
| Fehlerfänger | Abgefangener Renderfehler mit verständlicher Meldung statt weißem Bildschirm. | `fehlerfaenger.tsx`, `fehler-im-bild.tsx`, `feste-warnung.tsx` | erledigt (Phase 2): aus @bos/oberflaeche, Sichern und Löschen aus `sicherung.ts` |
| Nutzungsmessung | Ein Treffer je Kaltstart an GoatCounter, cookielos, ohne Fremdcode, Widerspruch per Schlüssel. | `statistik.ts` | erledigt (Phase 0), eigene GoatCounter-Site `meldekopf.goatcounter.com` |
| Electron-Hülle | Desktop-Fenster, Auto-Update, Berechtigungen (Kamera erlaubt), externe Links im Systembrowser, zweites Fenster für den Lagemonitor. | `electron/main.js` | Hülle übernommen (Phase 0), Release-Build ungeprüft bis Phase 5 |
| Capacitor-Hülle | Android (und später iOS): Barcode-Scanner, Dateisystem, Teilen, App-Links. | `android/`, `capacitor.config.json`, `nativ.ts` | übernehmen |
| Startseite | Erklärender Text einmal als Daten, daraus React-Ansicht und statisches Gerüst in `index.html`. | `start-inhalt.ts`, `scripts/start-inhalt.mts` | erledigt (Phase 0, neuer Text) |
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
