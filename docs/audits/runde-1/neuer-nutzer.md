# Audit Meldekopf – Rolle: THW-Helfer ohne Einweisung (thw-new-user-reviewer)

Prüfstand: Produktions-Build http://localhost:5290 (vite preview), Chromium über Playwright, Telefon 390×844 (Touch), zusätzlich 768×1024 und 1280×800. Leeres Gerät (`gesaet: false`) für den Einstieg, vorgelegte Sammlung „Hochwasser Weser“ (4 Einheiten) für die Einsatzansicht. Screenshots unter `(Prüfstand)/bilder/` (n…, s…, t…).

Nicht als Befund gewertet, weil es am Prüfstand liegt: der Hinweis „Wird für den Offline-Betrieb geladen: 0,0 von 5,1 MB“ (Service Worker im Prüfstand gesperrt), Datumsfelder im Format `mm/dd/yyyy` (Browser-Sprache en-US), „Dieses Gerät meldet keine nutzbare Kamera“ (es gibt keine Kamera).

## Urteil

Als Neuling verstehe ich auf der Startseite schnell, wofür die App da ist. „Neue Einsatz-Sammlung…“ ist der naheliegende erste Schritt. Die Schnellerfassung „Einheit manuell erfassen…“ führt mich mit Hilfetexten durch. Fehlt der Name, springt die App direkt in das richtige Feld. Die erste Einheit ist ohne fremde Hilfe erfasst.

Auf dem Telefon kippt das danach: Sobald eine Einheit in der Liste steht, reagieren die großen Knöpfe oben in der Einsatzansicht („Bogen scannen…“, „Einheit manuell erfassen…“, „‹ Startseite“) auf den ersten Tipp nicht mehr. Die Einheitenkarten lassen sich durch Antippen nicht öffnen. Ein Neuling hält die App an dieser Stelle für kaputt. Auf Tablet und Laptop (ab etwa 700 px Breite) tritt das nicht auf; dort sind alle Abläufe ohne Hilfe machbar. Daneben gibt es Reibung durch ähnliche Begriffe für das Hereinholen von Daten und durch die Einsatz-Datei, die eine PDF ist.

## Befunde

### P0-1 – Telefon: Knöpfe der Einsatzansicht reagieren nicht, Einheitenkarten lassen sich nicht öffnen

- **Fundstelle / Aufgabe:** Einsatzansicht auf dem Telefon (390×844, ebenso 600×960) mit mindestens einer Einheit. Betroffen sind die Knöpfe „Einheit manuell erfassen…“, „Bogen scannen…“, „Bögen einlesen…“, „‹ Startseite“, der Ansicht-Umschalter im Kopf, „Bedarf“ und „Zur Einheitenliste ↓“. Außerdem lässt sich keine Einheitenkarte durch Antippen öffnen.
- **Beobachtung:**
  - Mit der vorgelegten Sammlung (4 zugeklappte Karten) blieben die ersten 4 Tipps auf „Einheit manuell erfassen…“ ohne sichtbare Wirkung. Erst der 5. Tipp öffnete die Erfassung.
  - Jeder Fehltipp klappte unsichtbar, weiter unten auf der Seite, die jeweils letzte zugeklappte Einheitenkarte auf (Nr. 4, dann Nr. 3 …).
  - Beim Hit-Test lag über allen Bedienelementen der ersten 844 px der Seite der Knopf „Aufklappen: Zeiten, Details und Aktionen“ (`.karte-aufklappen`, 390×844 px, `position:absolute; inset:0`, ohne positionierten Vorfahren).
  - Umgekehrt reagierte ein Tipp direkt auf eine Einheitenkarte (z. B. „Nr. 4 DRK …“) gar nicht. Das kleine „▾“ der Karte steht oben rechts im Seitenkopf statt an der Karte.
  - Auch auf dem leeren Gerät ließ sich nach der ersten manuell erfassten Einheit die zweite erst mit dem zweiten Tipp beginnen.
  - Auf 768×1024 und 1280×800 sind die Karten offen dargestellt; dort tritt das nicht auf.
- **Erwartung der Rolle:** Ein Tipp auf einen beschrifteten Knopf löst genau diese Aktion aus. Ein Tipp auf eine Einheit öffnet diese Einheit.
- **Auswirkung im Einsatz:** Ein Neuling hält die App für eingefroren und gibt auf oder lädt neu (das hilft nicht). Er erreicht „Abrücken“, „Zug zuordnen“ und „Details“ einer Einheit nicht. Die Tabellenansicht verweist ausdrücklich zurück auf die Karten („Details, Historie und Aktionen einer Einheit stehen in der Kartenansicht“). Auf dem Telefon lässt sich die Lage damit praktisch nicht führen.
- **Empfehlung:** Der Aufklapp-Bereich einer Karte darf nur die eigene Karte bedecken. Der Pfeil zum Aufklappen muss an der Karte sichtbar sein. Nach der Code-Lage fehlt an `.einheit-zeile` die Positionierung, auf die sich der Kommentar zu `.karte-aufklappen` in `index.html` bezieht. Das ist nur ein Hinweis, keine Vorgabe.
- **Verifikation:** Prüfstand 390×844, `gesaet: true`. Ein einzelner Touch-Tipp auf „Einheit manuell erfassen…“ öffnet sofort die Erfassung. Ein Tipp auf Karte Nr. 1 öffnet Karte Nr. 1. Ein Hit-Test über alle Knöpfe der ersten Bildschirmseite meldet keinen fremden Treffer. Am besten als Gherkin-Szenario mit Telefon-Viewport gegen den produktiven Build.
- **Nachstellweg:**
  1. `seite({width:390,height:844,gesaet:true})` öffnen.
  2. `page.touchscreen.tap` auf „Einheit manuell erfassen…“: Die Erfassung öffnet sich erst beim 5. Tipp.
  3. Gegenprobe: `document.elementFromPoint` auf die Knopfmitte liefert `karte-aufklappen`.

### P2-1 – „Name der Einheit fehlt“, aber es gibt kein Feld „Name der Einheit“

- **Fundstelle / Aufgabe:** Einheit manuell erfassen, sofort „In Einsatz übernehmen“.
- **Beobachtung:**
  - Der Einleitungstext sagt „Es reichen der Name der Einheit und die Stärke“, der Fehlerdialog meldet „Name der Einheit fehlt“.
  - Ein Feld dieses Namens gibt es nicht. Der Name entsteht aus Organisation, Einheitstyp, Ebene und „Ort der Einheit (Pflicht)“.
  - Das einzige Feld mit der Beschriftung „Name“ gehört zur Führungskraft.
  - Der Knopf „Zum Namensfeld“ springt richtig auf „Ort der Einheit (Pflicht)“.
- **Erwartung der Rolle:** Ich suche ein Feld „Name“ und tippe „THW OV Oldenburg“ dort ein, also in das Führungskraft-Feld.
- **Auswirkung im Einsatz:** Ein Fehlversuch, und unter Umständen steht der Einheitsname im Feld der Führungskraft. Der Sprung im Dialog fängt das ab, deshalb nur P2.
- **Empfehlung:** Einleitung und Fehlermeldung in denselben Worten wie die Felder („Ort der Einheit“, „Einheitstyp“). Alternativ die zusammengesetzte Bezeichnung als sichtbare Vorschau direkt bei den Feldern, nicht erst im Erklärtext.
- **Verifikation:** Neulingstest: Wie viele Personen tragen den Einheitsnamen beim ersten Versuch in das Führungskraft-Feld ein?

### P2-2 – Vier ähnliche Begriffe für das Hereinholen von Daten; die Einsatz-Datei ist eine PDF

- **Fundstelle / Aufgabe:**
  - Startseite: „Bogen scannen…“ und „Einsatz importieren…“.
  - Einsatzansicht: „Bögen einlesen…“ und „Einsatz weitergeben / sichern“.
  - Fußzeile: „Datensicherung“.
- **Beobachtung:**
  - „Einsatz weitergeben / sichern“ lädt `eeb-einsatz-…_Hochwasser_Weser.pdf` herunter. Genau diese PDF ist die Datei, die das Folgegerät über „Einsatz importieren…“ einliest; geprüft, das klappt.
  - „sichern“ steht daneben auch für die „Datensicherung“, eine eigene Datei, die beim Einspielen alles ersetzt.
- **Erwartung der Rolle:** Bei „sichern“ denke ich an Datensicherung. Eine PDF halte ich für einen Ausdruck, nicht für eine Datei, die eine andere App einlesen kann.
- **Auswirkung im Einsatz:** Bei der Ablösung greift ein Neuling eher zur „Datensicherung“, die beim Einspielen alle Daten auf dem anderen Gerät ersetzt, oder er sucht nach einer „richtigen“ Datei.
- **Empfehlung:** Begriffe trennen: „Übergabe an Ablösung / S1 (PDF mit Daten)“ und „Datensicherung des Geräts“. Beim Download einmal sagen, dass diese PDF die Daten zum Einlesen enthält.
- **Verifikation:** Aufgabe „Gib den Einsatz an das Gerät der Ablösung“ ohne Hinweis. Wählt der Neuling „Einsatz weitergeben“ und auf dem Zielgerät „Einsatz importieren…“?

### P2-3 – Scan-Fenster ohne Titel und Rahmen, die Seite darunter wirkt bedienbar

- **Fundstelle / Aufgabe:** „Bogen scannen…“ auf Startseite oder Einsatzansicht (ohne Kamera).
- **Beobachtung:**
  - Oben erscheint eine weiße Fläche über etwa 60 % des Bildschirms, im oberen Teil rund 150 px leer.
  - Es gibt keine Überschrift (nur intern „QR-Code scannen“) und keine Abdunklung.
  - Darunter sind die Startseiten-Knöpfe weiter zu sehen, reagieren aber nicht (der Dialog ist modal).
  - Die Klasse `dialog.scanner` bekommt nur Rand- und Größenregeln. Die im Kommentar genannten Grundregeln für `.scanner` fehlen in `index.html`.
- **Erwartung der Rolle:** Ein klar abgegrenztes Fenster „QR-Code scannen“ mit sichtbarem Ausgang.
- **Auswirkung im Einsatz:** Ich weiß kurz nicht, ob die Seite kaputt ist, und tippe auf die sichtbaren, aber toten Knöpfe darunter. Der Text zum Handscanner ist gut. Den Handscanner-Weg habe ich als Tastatureingabe nachgestellt: Er erkannte den Bogen sofort.
- **Annahme (nicht geprüft):** Mit echter Kamera ist das Vorschaubild ebenfalls ungestaltet (Standardgröße 300×150).
- **Empfehlung:** Scanner als ganzflächiges, eindeutig betiteltes Fenster mit „Fertig/Schließen“ oben.
- **Verifikation:** Screenshot 390×844 nach „Bogen scannen…“: Titel sichtbar, Seite darunter abgedeckt. Kamera-Test auf einem echten Gerät.

### P3-1 – Tabellenansicht auf dem Telefon zeigt nur die ersten Spalten

- **Beobachtung:** Die Tabelle ist 1614 px breit. Sichtbar sind Einheit, Zug, F, U, M; „Gesamt“ ist abgeschnitten. Zeilen sind nicht antippbar, der Hinweis verweist auf die Kartenansicht.
- **Erwartung / Auswirkung:** Ich erwarte in der Tabelle mindestens die Gesamtstärke. Zusammen mit P0-1 gibt es auf dem Telefon keinen Weg zu den Aktionen.
- **Empfehlung:** Gesamtstärke als feste Spalte. Zeile antippbar, Antippen führt zur Karte.
- **Verifikation:** 390×844, Tabelle: „Gesamt“ ohne Wischen sichtbar.

### P3-2 – Drei Umschalter für „Ansicht“ in der Einsatzansicht

- **Beobachtung:**
  - Ansicht-Wahl im Kopf (Standard / Feld / Dunkel / Nacht).
  - Zusätzlich ein schwebender Knopf „◐ Ansicht: Standard“ unten links und die Ansicht-Wahl in der Fußzeile.
  - Der schwebende Knopf verdeckt Inhalt. Auf 390 px liegt er über „Weitergeben, Lageblatt, Export ↓“, auf 768 px teilweise neben der Abrück-Quittung.
- **Auswirkung:** Platz und Aufmerksamkeit gehen an eine Nebensache. Ein Neuling hält „Ansicht: Standard“ für einen Filter der Einheitenliste.
- **Empfehlung:** Ein Ort für die Ansicht-Wahl.
- **Verifikation:** Hit-Test: Kein Bedienelement wird vom schwebenden Knopf verdeckt.

### P3-3 – Langer Erklärtext im Ausgabe-Bereich

- **Beobachtung:** Der Mechanismus „Nur neue Bögen seit dem letzten Export … erst dann erscheinen dort die Nachtrag-Knöpfe“ wird in einem Absatz von 6 bis 7 Zeilen erklärt, bevor man die Knöpfe sieht.
- **Empfehlung:** Den Erklärtext kürzen und an den Schalter selbst hängen.

## Abschluss

- **Aufgabe geschafft:** mit Umwegen. Auf Tablet und Laptop ja; auf dem Telefon nur mit mehrfachen „toten“ Tipps, Aktionen an Einheiten praktisch gar nicht.
- **Fremde Hilfe nötig:** ja (Telefon), nein (Tablet/Laptop).
- **Größtes Missverständnis:** Dass die App auf dem Telefon hängt, weil Knöpfe beim ersten Tipp nichts tun. Tatsächlich klappt jeder Tipp unsichtbar eine Einheitenkarte weiter unten auf.
- **Größtes Einsatzrisiko:** Auf dem Telefon lassen sich Einheiten nicht abrücken und keinem Zug zuordnen; die Lage bleibt dadurch falsch.
- **Top-Priorität für die nächste Iteration:** Den Aufklapp-Bereich der Einheitenkarten auf die eigene Karte begrenzen (P0-1) und das mit einem Telefon-Szenario im Gherkin-Test absichern.

Zahl der Befunde: P0: 1 · P1: 0 · P2: 3 · P3: 3
