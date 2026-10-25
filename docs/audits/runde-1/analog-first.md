# Audit Analog zuerst (thw-analog-first-reviewer) – Meldekopf-App

Prüfstand: Produktions-Build http://localhost:5290, Playwright/Chromium. Geprüft und tatsächlich durchgespielt:
- Blanko-Vordruck, Lageblatt (A4 quer) und Sammel-PDF erzeugt und gelesen (`dl/`).
- **Gerät weg, Datei da:** leeres Gerät, „Einsatz importieren…" mit der Sammel-PDF → Sammlung „Hochwasser Weser" mit 4 Einheiten vollständig zurück.
- **Gerät weg, nur Papier da:** leeres Gerät, neue Sammlung, die vier Bogenseiten der Sammel-PDF als Fotos (PNG, 110 dpi) über „Bögen einlesen…" → „4 Bilder gelesen — 4 Bögen aufgenommen", Marke „vom Papier, Zeiten prüfen", danach „Lage vom Papier abgleichen" mit Nr., Eintreffzeit, Status (inkl. „Abgerückt am"), Zug und Auftrag ausgefüllt und übernommen.
- **Schnellerfassung vom Zettel:** Eintreffzeit 19:55, Nr. 2 (bereits vergeben → klare Rückfrage), dann Nr. 7, Zug „2.Zug", Stärke 1/2/6.
- Datensicherung erstellt (`dl/eeb-sicherung-2026-10-25.json`).

Nicht prüfbar: echter Offline-Betrieb (Service Worker im Prüfstand gesperrt; die Startseite zeigt deshalb „0,0 von 5,1 MB" – kein Befund), echter Druck und Kamera-Scan vom Ausdruck (ersetzt durch gerenderte PDF-Seiten), Erinnerung „nach drei Tagen" (nur laut Doku). Prüfdaten haben Stand Mai 2025; Marken „ANONYMISIERT/Zeitraum vorbei" daraus sind kein Befund.

## Urteil

Hier hat jemand mitgedacht, der Papier kennt. Der Blanko-Vordruck hat oben genau die Kopfzeile, die der Meldekopf von Hand braucht (Nr., eingegangen am/um, Zug, „ins Gerät übertragen von … um …"), und die Schnellerfassung fragt dieselben drei Dinge ab („Eingetroffen um (vom Meldeblock)", „Nr. laut Zettel", „Zug laut Zettel"). Das Lageblatt hat Nachtragszeilen und trennt „Summe laut Gerät" von „Summe einschl. Nachträge (von Hand)" – damit ist klar, welcher Stand gilt. Die Sammel-PDF ist zugleich Ausdruck und Transportmittel; jeder Bogen trägt den Kasten „Stand am Meldekopf" und eine „übertragen [ ] von … um …"-Zeile gegen Dubletten. Der Papier-Abgleich nach Geräteausfall funktioniert und vereinheitlicht die Zugschreibweisen.

Reibung: Am Telefon kommt man an die Schnellerfassung erst nach mehreren wirkungslosen Tipps (gleiche Ursache wie im Führungs-Audit F1). Die Schnellerfassung selbst ist für „Zettel abtippen" zu lang. Ein leeres Eingangsbuch (eine Zeile je Einheit) gibt es nicht, und Sicherungen landen auf demselben Gerät, das ausfallen soll.

## Befunde

### A1 – P0 – Nachtragen vom Zettel am Telefon blockiert
- **Fundstelle / Aufgabe:** Einsatzansicht am Telefon (≤ 600 px), Knopf „Einheit manuell erfassen…" bzw. „Bögen einlesen…" (Rückweg vom Papier).
- **Beobachtung:** Die zugeklappten Einheitenkarten legen eine unsichtbare Tippfläche über den gesamten ersten Bildschirm. Tipp auf „Einheit manuell erfassen…" bei 390×844: es öffnet sich nichts, unten außer Sicht klappt Karte Nr. 4 auf. Erst nach (Zahl der Einheiten + 1) Tipps öffnet sich die Schnellerfassung (mit 4 Einheiten: 5. Tipp beim Scanner gemessen; dieselbe Fläche liegt über „manuell erfassen" und „Bögen einlesen", per `elementFromPoint` geprüft).
- **Erwartung der Rolle:** Wenn ich nach dem Ausfall einen Stapel Zettel abtippe, öffnet ein Tipp die Erfassung.
- **Auswirkung:** Genau im Wiederanlauf, wenn viele Einheiten in der Liste stehen, wird das Nachtragen zur Geduldsprobe; nach jedem Abschluss sind die Karten wieder zu und das Spiel beginnt neu. Wer das nicht durchschaut, legt das Gerät weg und bleibt beim Papier – der Abgleich unterbleibt.
- **Empfehlung:** Tippfläche der Karte auf die Karte begrenzen (siehe Führungs-Audit F1).
- **Verifikation:** Nach drei Schnellerfassungen hintereinander am Telefon öffnet jeder einzelne Tipp auf „Einheit manuell erfassen…" sofort das Formular.

### A2 – P1 – Schnellerfassung zum Abtippen vom Zettel zu lang, Stärke zwei Bildschirme tief
- **Fundstelle:** Schnellerfassung, 360×740.
- **Beobachtung:** Seite 3324 px hoch; die Zählfelder der Stärke beginnen bei y≈1796 px, also nach rund 2,5 Bildschirmhöhen mit Organisation, Organisationsname, Einheitstyp, Ebene, Ort (Pflicht), Kürzel, Telefon, E-Mail, „+ übergeordnete Ebene", „OV/RB/LV-Vorlage". Für den Zettel braucht es: Zeit, Nr., Zug, Einheit, Stärke. Pflicht ist laut Rückfrage der „Name der Einheit" – das Feld heißt aber „Ort der Einheit (Pflicht)" (Rückfrage „Name der Einheit fehlt" mit Knopf „Zum Namensfeld").
- **Erwartung:** Zettel-Zeile in einem Bildschirm übertragen, Details später.
- **Auswirkung:** 20 Zettel nach einem Ausfall = 20× scrollen über Kontaktfelder, die auf dem Zettel nicht stehen. Die Versuchung, gar nicht nachzutragen, steigt.
- **Empfehlung:** Zeit, Nr., Zug, Organisation, Einheit/Ort, F/UF/M direkt hintereinander; Zugehörigkeit/Kontakt aufklappbar darunter. Pflichtfeld und Rückfrage gleich benennen.
- **Verifikation:** 360×740: alle Felder einer Zettelzeile und „In Einsatz übernehmen" ohne Scrollen bzw. mit einem Wisch erreichbar; Zeit pro Zettel stoppen.

### A3 – P2 – Zug vom Zettel wird in der Schnellerfassung nicht vereinheitlicht
- **Beobachtung:** „2.Zug" aus der Schnellerfassung bleibt „2.Zug" und bildet in den Zwischensummen einen eigenen Zug neben „2. Zug". Im Papier-Abgleich wird dieselbe Schreibweise korrekt zu „2. Zug" (geprüft). Siehe Führungs-Audit F2 (dort P1 wegen falscher Zugstärke).
- **Auswirkung aus Analog-Sicht:** Gerade der vom Zettel übernommene Vorgang erzeugt die Abweichung zwischen Papierstand und Gerät.
- **Empfehlung / Verifikation:** wie F2 im Führungs-Audit.

### A4 – P2 – Kein leeres Eingangsbuch für den Totalausfall vor dem ersten Ausdruck
- **Fundstelle:** „Blanko-Vordruck (Papier-Reserve)", Lageblatt.
- **Beobachtung:** Der Blanko-Vordruck ist der vollständige Erfassungsbogen einer Einheit (2 Seiten, Platz für 29 Personen, 4 Fahrzeuge). Das Lageblatt hat 6 Nachtragszeilen, gibt es aber nur, wenn vor dem Ausfall gedruckt wurde. Eine leere Liste „eine Zeile je Einheit: Nr., Zeit, Einheit, Org., Stärke F/UF/M/G, Zug, Bedarf, übertragen [ ]" gibt es nicht. Der Blanko-Vordruck ist zudem nur innerhalb eines Einsatzes erreichbar, nicht auf der Startseite (geprüft: auf der leeren Startseite kein „Blanko").
- **Erwartung:** Am Meldekopf liegt vor Einsatzbeginn ein leerer Meldeblock mit den Spalten, die die App später abfragt.
- **Auswirkung:** Fällt das Gerät aus, bevor ein Lageblatt gedruckt wurde, schreibt jeder seine eigene Liste; die spätere Übernahme in die Schnellerfassung passt dann nicht Feld für Feld.
- **Empfehlung:** Leeres Eingangsbuch (A4, ~20 Zeilen, gleiche Spalten wie Lageblatt/Schnellerfassung, Spalte „übertragen") und Blanko-Vordrucke auch von der Startseite.
- **Verifikation:** Ausfall vor erstem Ausdruck durchspielen: mit vorab gedrucktem Eingangsbuch alle Einheiten führen und danach zeilenweise in die Schnellerfassung übernehmen.

### A5 – P2 – Sicherung und Sammel-PDF landen auf dem Gerät, das ausfallen kann
- **Fundstelle:** „Einsatz weitergeben / sichern", Fußzeile „Datensicherung".
- **Beobachtung:** Rückmeldung nach dem Lageblatt: „liegt im Download-Ordner bzw. wurde über das Teilen-Menü abgelegt". Datensicherung: „Letzte Sicherung auf diesem Gerät erstellt: …". Kein Hinweis „auf USB-Stick/zweites Gerät/ausdrucken", kein sichtbarer Zeitstempel der letzten Sicherung oder Weitergabe oben in der Einsatzansicht (nur „Noch kein Lageblatt aus diesem Einsatz" weit unten; Startseite: „Lageblatt: noch keins · Export: noch keiner"). Die Erinnerung zur Datensicherung kommt laut Doku erst nach drei Tagen (Annahme, nicht beobachtet).
- **Erwartung:** Bei Akku weg / Gerät kaputt zählt nur, was **nicht** auf diesem Gerät liegt – Papier oder ein zweiter Datenträger.
- **Auswirkung:** Die Sicherung wird gemacht, ist aber mit dem Gerät verloren. Der „Wann zuletzt ausgedruckt?"-Stand ist bei Ausfall nicht im Blick.
- **Empfehlung:** Oben in der Einsatzansicht „Zuletzt gesichert/gedruckt HH:MM, seitdem N Meldungen"; Rückmeldung nach der Sicherung mit klarer Aufforderung, die Datei vom Gerät wegzubringen oder auszudrucken; Erinnerung nach Meldungszahl/Stunden statt Tagen.
- **Verifikation:** Nach 10 neuen Meldungen ohne Weitergabe erinnert die App sichtbar.

### A6 – P3 – Papier-Abgleich: Reihenfolge und Nummern hängen an der Lesereihenfolge
- Nach dem Einlesen der Fotos trugen die Karten bereits Nr. 1–4 in Lesereihenfolge, obwohl der Abgleich sagt „ohne … Nummer" und das Nummernfeld „leer = App vergibt" anbietet. Im Test stimmte die Reihenfolge zufällig mit dem Papier überein. **Annahme:** Bei anders sortiertem Fotostapel weicht die App-Nr. von der Papier-Nr. ab, wenn das Feld leer bleibt. Empfehlung: Abgleichzeilen mit der Nummer aus dem Bogen-Kopf („Nr. 1 · THW Oldenburg …", steht im QR-Begleittext) vorbelegen oder deutlich als „vorläufig" zeigen.

### A7 – P3 – „Von Hand geändert" auf dem Ausdruck: Korrekturweg der Stärke nicht im Abgleich
- Der Einlese-Bericht sagt korrekt: „Ist dort neben der Stärke ‚von Hand geändert' angekreuzt … die Karte gegen das Blatt prüfen … und in der App nachtragen". Der Papier-Abgleich bietet aber kein Stärkefeld; wo die Stärke einer gescannten Einheit korrigiert wird, sagt der Bericht nicht (nicht weiter geprüft). Empfehlung: im Abgleich je Zeile „Stärke laut Blatt" optional.

## Analog-/Digital-Übergabematrix

| Prozessschritt | Digitaler Nutzen | Analoger Fallback | Sauberer Wiedereinstieg in Digital |
|---|---|---|---|
| Einheit trifft ohne Bogen/QR ein | Stärke sofort in Summe und Zug | Blanko-Vordruck (Kopf: Nr., Zeit, Zug, übertragen) bzw. Meldeblock | Schnellerfassung mit „Eingetroffen um", „Nr. laut Zettel", „Zug laut Zettel"; doppelte Nr. wird abgewiesen (geprüft). Bremsen: A1, A2, A3 |
| Laufende Lage (Stärke, Bedarf) | Summen, Zwischensummen je Zug, Lagemonitor | Lageblatt A4 quer mit 6 Nachtragszeilen und „Summe einschl. Nachträge (von Hand)" | Nachtragszeilen tragen „übertragen [ ]"; Übernahme über Schnellerfassung |
| Gerät/Akku fällt aus, Datei vorhanden | Gesamte Sammlung inkl. Zeiten, Zügen, Historie in einer PDF | Ausdruck der Sammel-PDF | „Einsatz importieren…" mit der PDF – geprüft, vollständig. Voraussetzung: Datei liegt nicht nur auf dem ausgefallenen Gerät (A5) |
| Gerät fällt aus, nur Papier vorhanden | QR je Bogen spart das Abtippen der Bögen | Ausdruck der Sammel-PDF (Lageblatt + Bögen mit Kasten „Stand am Meldekopf") | „Bögen einlesen…" (Foto/Scan) → Marke „vom Papier, Zeiten prüfen" → „Lage vom Papier abgleichen" (Nr., Eintreffzeit, Status, Abrückzeit, Zug, Auftrag) – geprüft. Lücken: A6, A7 |
| Ausfall vor dem ersten Ausdruck | – | Kein vorbereitetes Eingangsbuch (A4) | Nur zeilenweise über Schnellerfassung |
| Übergabe an Stab | PDF/CSV/Excel, „nur neue seit letztem Export" | Lageblatt ausgedruckt | Stab-seitig nicht Gegenstand dieser App |

## Würde ich dafür das Papier weglegen?

Am Tablet für das Zählen und die Weitergabe an den Stab: ja, weil Lageblatt und Sammel-PDF genau das Papier liefern, das ich sonst von Hand schreiben würde, und der Rückweg vom Papier nachweislich funktioniert. Am Telefon im jetzigen Stand: nein, weil der Meldeblock beim Nachtragen schneller ist als eine Erfassung, die erst nach mehreren wirkungslosen Tipps aufgeht.

## Abschluss

- **Aufgabe geschafft:** mit Umwegen (Papier-Rückweg vollständig, Telefon-Bedienung behindert)
- **Fremde Hilfe nötig:** nein
- **Größtes Missverständnis:** „Ich habe gesichert" – die Datei liegt auf dem Gerät, das gleich ausfällt.
- **Größtes Einsatzrisiko:** Nachträge vom Zettel unterbleiben am Telefon, weil die Erfassung nicht auf den ersten Tipp aufgeht und dann sehr lang ist.
- **Top-Priorität für die nächste Iteration:** A1 beheben, dann die Schnellerfassung auf die Felder einer Zettelzeile verdichten (A2).
