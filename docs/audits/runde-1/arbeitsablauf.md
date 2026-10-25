# Audit Meldekopf – Rolle: Ablauf-Prüfer (thw-workflow-reviewer)

Prüfstand: http://localhost:5290 (Produktions-Build), Playwright/Chromium. Telefon 390×844 mit Touch, Tablet 768×1024, Laptop 1280×800, Lagemonitor-Fenster auf 1280×720. Vorgelegte Sammlung „Hochwasser Weser“ (4 Einheiten) oder leeres Gerät. Screenshots und heruntergeladene Ausgaben (`dl_*`) liegen unter `(Prüfstand)/`.

## Erwartete Arbeitsfolgen

Die Abläufe am Meldekopf sind eine Annahme, abgeleitet aus der App-Beschreibung und allgemeiner Einsatzpraxis, nicht aus einer THW-Vorschrift.

| Szenario | Erwartete Folge | In der App durchlaufen | Ergebnis |
| --- | --- | --- | --- |
| 1 Ankunft ohne Bogen | Zettel/Meldeblock: Uhrzeit, Nr., Zug → Einheit, Stärke, Führungskraft → in die Lage → nächste Einheit | „Einheit manuell erfassen…“ → Eintreffzeit/Nr./Zug, Ort mit Vorschlägen, Einheitstyp, Stärke-Zähler, Name → „In Einsatz übernehmen“ → Quittung „Zuletzt abgelegt … Gesamt 9“ | Tablet: ja, flüssig. Telefon: erste Einheit ja; die zweite braucht einen Extratipp, bei n Einheiten n+1 Tipps (P0-1) |
| 2 Einheit mit QR-Code | Code einlesen → Zuordnung zum Einsatz → in der Lage | „Bogen scannen…“ → Handscanner (als Tastatureingabe nachgestellt) → „Meldung von … empfangen“ → neue Sammlung oder Einsatz; „QR aus Bild einlesen…“ im vorhandenen Einsatz → „Bereits vorhanden – übersprungen“ | ja; Kamera nicht prüfbar |
| 3 Folgemeldung | Neue Stärke melden → alte Meldung bleibt nachvollziehbar → Lage aktualisiert | Karte → „Mehr…“ → „Stärke ändern…“ → „Folgemeldung … Stärke 6 → 11 (+5)“, „Historie (2)“, Summe 21 → 26 | Tablet: ja. Telefon: Karte nicht erreichbar (P0-1). Folgemeldung per geändertem QR-Code nicht nachgestellt (Annahme) |
| 4 Abrücken | Einheit wählen → abrücken mit Uhrzeit → zählt nicht mehr | Karte → „Abrücken“ → sofort durchgestrichen, „ABGERÜCKT“, „3 zählend“, Quittung mit „Rückgängig“, Zeit über „ändern“ korrigierbar | Tablet: ja. Telefon: nicht erreichbar (P0-1) |
| 5 Lageblatt für den Stab | Ein Knopf → Druck-PDF → Bestätigung, was ausgegeben wurde | „Lageblatt (A4 quer)“ → `eeb-lageblatt-252055okt26_Hochwasser_Weser.pdf`, Status „Lageblatt erstellt 20:55 · seitdem keine neue Meldung“; CSV und Excel ebenso mit eigenem Bezugspunkt | ja |
| 6 Schichtwechsel / Ablösung | Lage geschlossen übergeben → das neue Gerät hat alles | „Einsatz weitergeben / sichern“ → `eeb-einsatz-…pdf` (6 Seiten) → leeres Gerät „Einsatz importieren…“ → „Einsatz übernommen: 4 Einheiten, davon 4 anwesend“; erneutes Einlesen auf einem Gerät mit demselben Einsatz → „keine neue Einheit“; Papierweg: Seiten als Fotos über „Bögen einlesen…“ → 4 Bögen, danach „Lage vom Papier abgleichen…“ | ja, mit Begriffshürde (P2-1) |

## Urteil

Die Reihenfolge der Software passt gut zur Arbeit am Meldekopf:

- Uhrzeit, Nr. und Zug „vom Zettel“ stehen zuerst.
- „Es reichen Name und Stärke“ entspricht dem, was eine Einheit an der Schranke sagen kann.
- Die Quittung nach dem Übernehmen nennt die neue Gesamtstärke.
- Folgemeldungen behalten die Historie.
- Abrücken ist mit einem Tipp erledigt und lässt sich zurücknehmen.
- Jede Weitergabe merkt sich ihren Stand und sagt ehrlich, dass sie nicht weiß, ob die Datei angekommen ist.
- Die Ablösung per Datei überträgt alles, auch auf ein leeres Gerät, und doppeltes Einlesen erzeugt keine Dubletten.

Auf dem Telefon bricht der Ablauf in der zentralen Ansicht: Neue Einheiten lassen sich nur mit „toten“ Tipps beginnen, Abrücken und Zug-Zuordnung sind gar nicht erreichbar (P0). Dazu kommt das Risiko, dass eine unterbrochene Erfassung in die nächste Einheit übergeht (P1). Auf Tablet und Laptop sind alle sechs Szenarien ohne fremde Hilfe durchführbar.

## Befunde

### P0-1 – Telefon: Szenarien 1, 3 und 4 brechen in der Einsatzansicht ab

- **Fundstelle / Aufgabe:** Einsatzansicht, Telefon 390×844 (ebenso 600×960), mindestens eine Einheit in der Liste.
- **Beobachtung:**
  - Jede zugeklappte Einheitenkarte legt einen unsichtbaren Knopf „Aufklappen: Zeiten, Details und Aktionen“ (390×844 px, `position:absolute; inset:0`) über den ersten Bildschirm der Seite.
  - Folge 1: Tipps auf „Einheit manuell erfassen…“, „Bogen scannen…“, „Bögen einlesen…“ und „‹ Startseite“ klappen zuerst nacheinander die Karten Nr. 4, 3, 2, 1 auf (außerhalb des Bildes). Erst danach reagiert der Knopf; bei 4 Einheiten beim 5. Tipp.
  - Folge 2: Ein Tipp auf eine Karte öffnet sie nicht. Die Tabellenansicht verweist für Aktionen auf die Karten.
  - Damit sind „Abrücken“, „Zug zuordnen“, „Auftrag/Notiz“, „Stärke ändern…“ und „Details“ auf dem Telefon nicht gezielt erreichbar.
  - Ab etwa 700 px Breite sind die Karten offen dargestellt, das Problem besteht dort nicht.
- **Erwartung der Rolle:** Ankunft → ein Tipp → Erfassung. Abrücken → Einheit antippen → „Abrücken“.
- **Auswirkung im Einsatz:**
  - Auf dem Telefon kann der Meldekopf Einheiten nicht abrücken lassen; die Stärke-Summe bleibt dauerhaft zu hoch.
  - Zug-Zuordnungen fehlen, das Lageblatt für den Stab ist damit falsch.
  - Jede weitere Ankunft kostet mehrere wirkungslose Tipps.
  - Ein Telefon ist laut App-Beschreibung kein Zielgerät („Tablet oder Laptop“), die Seite ist aber ausdrücklich für schmale Bildschirme gebaut. Ein Telefon ist das typische Ersatzgerät, wenn das Tablet ausfällt.
- **Empfehlung:** Tippziel der Karte auf die Karte begrenzen und den Aufklapp-Pfeil an der Karte zeigen. Vermutete Ursache: An `.einheit-zeile` fehlt die Positionierung, auf die sich die Regel für `.karte-aufklappen` in `index.html` verlässt.
- **Verifikation:** Szenarien 1, 3 und 4 als Gherkin-Szenarien mit Telefon-Viewport gegen den produktiven Build, mit echten Touch-Tipps statt programmatischer Klicks.
- **Nachstellweg:**
  1. `seite({width:390,height:844,gesaet:true})` öffnen.
  2. `touchscreen.tap` auf „Einheit manuell erfassen…“: erst beim 5. Tipp offen.
  3. Zur Liste rollen und auf „Nr. 4 DRK …“ tippen: alle Karten bleiben `aria-expanded=false`.

### P1-1 – Szenario 1, zwei Ankünfte kurz hintereinander: Die unterbrochene Erfassung geht in die nächste Einheit über

- **Fundstelle / Aufgabe:** „Einheit manuell erfassen…“. Einheit A wird begonnen und unterbrochen (zurück in den Einsatz, etwa weil Einheit B mit QR-Code dazwischenkommt). Danach wird erneut „Einheit manuell erfassen…“ getippt.
- **Beobachtung:**
  - Die Erfassung öffnet vollständig mit den Werten von A: Ort Bremen, Bergungsgruppe, 1/2/6, Führungskraft Schulz, Zug.
  - Der sichtbare Teil oben (Eintreffzeit, Nr., Zug, Organisation) sieht aus wie ein neues Formular.
  - Weder Einsatzansicht noch Erfassung zeigen, dass ein Entwurf offen ist.
  - Es gibt nur einen Entwurf je Gerät. Das Fortbestehen über Neuladen ist an sich richtig und nachgestellt.
- **Erwartung der Rolle:** Pausieren und Fortsetzen sind sichtbar: „Erfassung fortsetzen: THW Bremen B (1/2/6)“ oder „neue Einheit“.
- **Auswirkung im Einsatz:** Einheit B wird mit Namen und Stärke von A in die Lage übernommen. A fehlt, B steht falsch, und die Summe ist falsch, ohne dass es jemand bemerkt.
- **Annahme (nicht geprüft):** Die Fünf-Minuten-Rückfrage zur Eintreffzeit fängt einen Teil dieser Fälle ab.
- **Empfehlung:** Den offenen Entwurf an der Einstiegsstelle benennen und beim Öffnen oben zeigen, mit „neu beginnen“ als gleichwertiger Wahl.
- **Verifikation:** Szenario „A beginnen → zurück → erneut erfassen“. Oben steht die Bezeichnung von A, und es gibt einen Ein-Tipp-Weg zu einem leeren Formular.

### P2-1 – Szenario 6: Die Übergabe-Datei ist eine PDF, und „sichern“ ist doppelt belegt

- **Fundstelle:** Einsatzansicht „Einsatz weitergeben / sichern“, Startseite „Einsatz importieren…“, Fußzeile „Datensicherung“.
- **Beobachtung:**
  - Die Ablösung funktioniert technisch einwandfrei.
  - Die Übergabe ist aber eine PDF (`eeb-einsatz-252055okt26_Hochwasser_Weser.pdf`), die zugleich Druckvorlage und Datenträger ist.
  - Die ähnlich klingende „Datensicherung“ ist eine andere Datei, die laut Dialog beim Einspielen „die vorhandenen App-Daten auf diesem Gerät vollständig“ ersetzt.
- **Erwartung der Rolle:** Ein klar benannter Knopf „An Ablösung übergeben“ und auf dem neuen Gerät „Übergabe einlesen“.
- **Auswirkung im Einsatz:** Beim Schichtwechsel unter Zeitdruck liegt die Verwechslung mit der Datensicherung nahe. Auf einem Gerät, das schon andere Einsätze führt, ersetzt das Einspielen alle Daten. Der Ersetzungsweg selbst ist nicht nachgestellt.
- **Empfehlung:** Begriffe für Übergabe und Gerätesicherung trennen. Beim Download sagen, dass die PDF die Daten zum Einlesen enthält.
- **Verifikation:** Rollenspiel Ablösung ohne Hinweis: Welche Knöpfe werden gewählt?

### P2-2 – Scan-Fenster ohne Rahmen und Titel (Szenario 2)

- **Beobachtung:** Wie in der Neulingsrolle (Befund P2-3): Das Fenster hat keine Überschrift, oben eine leere Fläche, und die Seite darunter ist sichtbar, aber nicht bedienbar. Der Ablauf selbst (Handscanner → „Meldung von … empfangen“ → Wahl der Sammlung) ist klar.
- **Annahme:** Kamera-Ansicht nicht geprüft.

### P3-1 – Papier-Rückfallebene: Stand am Meldekopf muss von Hand übertragen werden

- **Fundstelle:** Sammel-PDF als Fotos über „Bögen einlesen…“, danach „Lage vom Papier abgleichen…“.
- **Beobachtung:**
  - 6 Seiten, davon 4 mit lesbarem Code, ergeben 4 Bögen aufgenommen.
  - Nr., Eintreffzeit, Status, Zug und Auftrag/Notiz stehen nicht im Code und müssen je Einheit abgetippt werden (5 Felder × 4 Einheiten).
  - Die App sagt das klar und hält angefangene Eingaben fest.
- **Auswirkung:** Medienbruch mit Übertragungsfehlern bei vielen Einheiten. Nur auf dem Ausfallweg, deshalb P3.
- **Empfehlung:** Prüfen, ob der Stand am Meldekopf (Nr., Zug, Status, Zeiten) mit in einen Code der Übersichtsseite passt.

### P3-2 – Lagemonitor und Lageblatt ordnen und benennen Einheiten unterschiedlich

- **Beobachtung:**
  - Das Lageblatt ist nach Nr. geordnet („Nr. 1 THW …“).
  - Der Lagemonitor listet ohne Nr.-Spalte in umgekehrter Reihenfolge (DRK, Feuerwehr, DLRG, THW) mit den Spalten Orga, Ort, Funkrufname, Einheitentyp.
- **Auswirkung:** „Meldung 3“ über Funk ist am Fernseher nicht auffindbar.
- **Empfehlung:** Nr. auch im Lagemonitor zeigen.

### P3-3 – Lageblatt: zwei verschiedene Verpflegungszahlen auf einer Seite

- **Beobachtung:** Die Kopfzeile meldet „Bedarf: Verpflegung 21“ (nach Stärke). Die Zeilen der Einheiten zeigen „Verpfl. 20 (St. 3)“ bzw. „(St. 6)“, also die Anforderung der Einheit, als Hinweis markiert.
- **Auswirkung:** Der Stab liest zwei Zahlen. Die App markiert die Abweichung zwar, entscheidet aber nicht sichtbar, welche Zahl gilt. Die Zahlen stammen aus den vorgelegten Prüfdaten.
- **Empfehlung:** Im Kopf kurz sagen, nach welcher Regel gezählt wird.

### P3-4 – Weitergabe steht ganz unten unter der Einheitenliste

- **Beobachtung:** Lageblatt, Export und Lagemonitor stehen unter der gesamten Liste. Der Sprunglink „Weitergeben, Lageblatt, Export ↓“ existiert; auf dem Telefon liegt er unter dem schwebenden Knopf „Ansicht: Standard“ (Hit-Test: verdeckt).
- **Auswirkung:** Bei vielen Einheiten ist es ein langer Weg zur häufigsten Stab-Aufgabe.
- **Empfehlung:** Lageblatt als Knopf auch im oberen Bereich.

## Abschluss

- **Aufgabe geschafft:** Tablet/Laptop ja (alle sechs Szenarien). Telefon nein für Abrücken, Zug und Folgemeldung, mit Umwegen für jede weitere Ankunft.
- **Fremde Hilfe nötig:** nein auf Tablet/Laptop, ja auf dem Telefon.
- **Größtes Missverständnis:** Ein neues Formular nach der Unterbrechung ist in Wahrheit die angefangene Erfassung der vorigen Einheit.
- **Größtes Einsatzrisiko:** Auf dem Telefon kann niemand abrücken lassen; die Stärke im Lageblatt für den Stab bleibt zu hoch.
- **Top-Priorität für die nächste Iteration:** Das Tippziel der Einheitenkarten begrenzen (P0-1) und die Szenarien Ankunft, Folgemeldung und Abrücken mit Telefon-Viewport in die Gherkin-Suite aufnehmen.

Zahl der Befunde: P0: 1 · P1: 1 · P2: 2 · P3: 4
