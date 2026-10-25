# Audit: Handschuh- und Touch-Bedienbarkeit (thw-glove-touch-reviewer)

**Prüfstand:** Produktions-Build http://localhost:5290, Playwright/Chromium headless mit Touch-Emulation (`touchscreen.tap`), Telefon 390×844, zusätzlich 600 px, Tablet quer 1180×820; Modi Standard und Feld. Maße per `getBoundingClientRect` in CSS-px. Echte Handschuhe, echte Bildschirmtastatur und Einhandgriff **nicht** getestet (headless) – betreffende Punkte sind gekennzeichnet.

## Urteil aus Sicht der Rolle
Die App ist grundsätzlich grob bedienbar gebaut: fast alle Ziele ≥ 44 px, im Feld-Modus 54–68 px, Stärke-Zähler 52 px (Feld 67 px) mit 6–8 px Abstand, kritische Aktionen mit Rückgängig oder Rückfrage, ein Doppeltipp-Schutz. **Auf dem Telefon ist die Einsatzansicht aber praktisch unbedienbar**, weil eine unsichtbare Fläche alle Tipps im oberen Bereich abfängt (P0). Ohne fremde Hilfe ist die Aufgabe „Einheit erfassen / abrücken" auf dem Telefon nicht zu schaffen; auf dem Tablet ja.

---

### 1. [P0] Unsichtbare Tippfläche über dem ganzen oberen Bildschirm (Telefon)
- **Fundstelle:** Einsatzansicht, Breite < 768 px, sobald eine Einheit als Karte gelistet ist; auch im Feld-Modus.
- **Beobachtung:** Die vier Aufklapp-Knöpfe der Einheitenkarten messen je **390×844 px ab Seitenanfang** statt Kartengröße (Karte z. B. 324×132 px). Sie liegen über „‹ Startseite" (80×44), Ansicht-Umschalter (67–100×46), „Bogen scannen…" (358×57), „Einheit manuell erfassen…" (358×57), „Bögen einlesen…" (358×57), „Bedarf" (324×44), „Zur Einheitenliste ↓" (110×47). Touch-Tipp auf „Bogen scannen…" → nichts sichtbar, Karte Nr. 4 klappt außerhalb des Bildes auf. Tipp auf Karte Nr. 1 selbst (Seiten-y ≈ 1097) → nichts, weil die Fehlflächen nur die oberen 844 px decken.
- **Nachstellweg:** `seite({width:390,height:844,gesaet:true})`, `page.touchscreen.tap(195,465)`; `document.elementFromPoint(195,465).className` = `karte-aufklappen`. Breite 600 px gleich; 768 und 1024 px nicht betroffen.
- **Erwartung der Rolle:** Großer Knopf = sicherer Treffer.
- **Auswirkung im Einsatz:** Wiederholtes Tippen ohne Wirkung; Helfer hält das Gerät für defekt. Keine Aufnahme, kein Abrücken, kein Nachtmodus über den Kopf.
- **Empfehlung:** Tippfläche jeder Karte auf die Karte selbst begrenzen.
- **Verifikation:** Touch-Test aller oberen Knöpfe und jeder Karte auf 390×844 mit 1, 4 und 20 Einheiten.

### 2. [P1] Erster Tipp nach Ortseingabe geht verloren, Seite springt ~700 px
- **Fundstelle:** Schnellerfassung, Feld „Ort der Einheit (Pflicht)" mit Vorschlagsliste → Stärke „+".
- **Beobachtung:** Nach Eingabe „Wardenburg" wird der erste Tipp auf „Führer: erhöhen" (52×52 px) nicht gezählt; die App übernimmt stattdessen den Vorschlag und fügt OV-Kontakt sowie RB- und LV-Ebene ein. Stärke-Block springt aus dem Bild. Übernommen wurde 0/1/3/4 statt 1/1/3/5. Ohne Vorschlag („Xyzdorf") zählt der erste Tipp.
- **Erwartung:** Jeder Tipp auf „+" zählt eins.
- **Auswirkung:** Falsche Stärke, Helfer mit Handschuh merkt den verlorenen Tipp kaum.
- **Empfehlung:** Tipp außerhalb der Vorschlagsliste nicht verschlucken; Vorschlag nur bei ausdrücklichem Antippen übernehmen; keine Layoutsprünge nach Fokuswechsel.
- **Verifikation:** Ort mit Vorschlag tippen, direkt dreimal „+" → Wert 3.

### 3. [P2] Scan-Dialog: Knöpfe ohne Abstand, Aufklapper nur 24 px hoch
- **Fundstelle:** „Bogen scannen…" ohne Kamera.
- **Beobachtung:** „Hinweise zum Handscanner" (summary) **342×24 px**, direkt darunter ohne Abstand „Kamera erneut versuchen" (195×44), darunter **0 px** Abstand „QR aus Bild einlesen…" (177×44) und daneben **0 px** Abstand „Fertig" (68×44). Ränder berühren sich.
- **Auswirkung:** Mit Handschuh wird statt „QR aus Bild einlesen…" leicht „Fertig" (schließt den Dialog) oder „Kamera erneut versuchen" getroffen.
- **Empfehlung:** ≥ 8 px Abstand, Aufklapper ≥ 44 px, „Fertig" räumlich absetzen.
- **Verifikation:** Maße nachmessen; Tipp-Test mit Handschuh.

### 4. [P2] Tabellenansicht auf dem Telefon: Sortierköpfe 44 px ohne Abstand, 1651 px Breite
- **Fundstelle:** Einsatzansicht → „Tabelle" (390 px).
- **Beobachtung:** Scrollbreite 1651 px bei 356 px sichtbarer Breite; Spaltenköpfe Zug/F/U/M/Kfz je 44×44 px, lückenlos nebeneinander; Tipp sortiert die Tabelle um. Gesamtspalte erst nach Wischen sichtbar.
- **Auswirkung:** Beim seitlichen Wischen mit Handschuh versehentliches Umsortieren; Orientierung geht verloren.
- **Empfehlung:** Auf dem Telefon Karten bevorzugen oder Tabelle auf wenige Spalten begrenzen; Sortierung über eigenes Auswahlfeld.

### 5. [P2] Stärke korrigieren nur per Tastatur
- **Fundstelle:** Karte → „Mehr…" → „Stärke ändern…".
- **Beobachtung:** Drei Textfelder 332×44 px (inputmode numeric), keine −/+-Zähler; Erfassung hingegen mit 52-px-Zählern.
- **Auswirkung:** Mit Handschuh Bildschirmtastatur nötig; ob die Knöpfe „Stärke übernehmen"/„Abbrechen" bei offener Tastatur sichtbar bleiben, **nicht verifiziert**.
- **Empfehlung:** Gleiche Zähler wie in der Erfassung.

### 6. [P2] Feste „Ansicht"-Leiste überdeckt Inhalte
- **Fundstelle:** Einsatzansicht Telefon: feste Leiste 390×57 px am unteren Rand. Bei Startposition liegt der Sprunglink „Weitergeben, Lageblatt, Export ↓" (187×47, y 775–822) zu drei Vierteln darunter; Tipp trifft die Leiste und öffnet die Ansichtswahl.
- **Empfehlung:** Unteren Abstand freihalten.

### 7. [P3] Kleine Textlinks mitten im Fließtext
- **Fundstelle:** Karte aufgeklappt: „ändern" (Eintreffzeit) 45×47 px, eingebettet in eine Textzeile; „4 ohne Auftrag" (84×47) und „4 ohne Zug" (65×47) nebeneinander, getrennt nur durch „·".
- **Auswirkung:** Trefferflächen formal ≥ 44 px, optisch aber unscheinbar und dicht beieinander.

### 8. [P3] Feld-Modus vergrößert die feste Übernehmen-Leiste nicht
- **Fundstelle:** Schnellerfassung im Feld-Modus: „In Einsatz übernehmen" bleibt 354×48 px (andere Knöpfe 54–68 px); Ansicht-Leiste 159×48 px.

### Gut gelöst (erhalten)
- Doppeltipp-Schutz: Rückt nach „Abrücken" „Zug zuordnen" unter den Finger, wird der Folgetipp mit „Einen Moment …" blockiert (beobachtet).
- Abrücken mit „Rückgängig" (123×44) statt Rückfrage.
- „Alle Daten löschen": Häkchen-Zeile 308×48 + Knopf, „Endgültig löschen" und „Abbrechen" je 308×45 mit 12 px Abstand.
- Dialog-Knöpfe in „Neue Einsatz-Sammlung" und „Meldung entfernen" vollbreit 332×44.
- Prellschutz in neuen Dialogen (~1 s) – bekannte Eigenheit, schützt vor Fehltipp.
- Ansicht-Leiste unten (Telefon) funktioniert per Touch: 4 Knöpfe je ~90×44.

### Abschluss
- **Aufgabe geschafft:** Telefon: nein (Einsatzansicht); Tablet: ja
- **Fremde Hilfe nötig:** ja (Telefon)
- **Größtes Missverständnis:** Der Helfer hält „Bogen scannen…" für defekt, weil sein Tipp unsichtbar eine Karte weiter unten aufklappt.
- **Größtes Einsatzrisiko:** Auf dem Telefon lassen sich keine Einheiten aufnehmen oder abrücken; bei Ortsvorschlag geht ein Stärke-Tipp verloren.
- **Top-Priorität für die nächste Iteration:** Tippfläche der Einheitenkarten auf die Karte selbst begrenzen und per Touch-Szenario auf 390 px absichern.
