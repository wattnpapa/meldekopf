# Audit Führungssicht (thw-command-reviewer) – Meldekopf-App

Prüfstand: Produktions-Build http://localhost:5290 (vite preview), Playwright/Chromium, Sammlung „Hochwasser Weser" (4 Einheiten) vorgelegt; zusätzlich selbst erzeugt: Schnellerfassung Nr. 7 „THW Bremen Bergungsgruppe" (Eintreffzeit 19:55 vom Zettel, Zug „2.Zug"), Zug „2. Zug" an Nr. 1, Abrücken Nr. 2, Auftrag an Nr. 3. Geprüft: Summenzeile, Bedarf, Karten- und Tabellensicht, Filter, Zwischensummen nach Zug, Lagemonitor (`?lagemonitor=<ID>`, 1280×720 und 1920×1080), Lageblatt-PDF, Sammel-PDF, CSV. Telefon 390×844 und 360×740, Tablet 768×1024 / 1024×768.

Hinweis zu Prüfdaten: Die vorgelegten Bögen tragen „Stand 14.05.2025" und Einsatzzeitraum Mai 2025. Die Marken „ANONYMISIERT", „älter als 24 h", „Zeitraum vorbei" und „Jahr prüfen" auf allen vier Karten folgen daraus und werden **nicht** als Befund gewertet. Bilder: `bilder/c*.png`, Downloads: `dl/`.

## Urteil

Am Tablet/Laptop liefert die App, was eine Führungskraft am Meldekopf braucht: Stärke F/UF/M/Gesamt groß oben, Bedarf aufgeschlüsselt, „Neu seit der letzten Kenntnisnahme", Zähler „ohne Auftrag / ohne Zug" als Sprungfilter, Zwischensummen je Zug, und ein Lageblatt, das man ohne Erklärung an den Stab geben kann (Summe laut Gerät, Nachtragszeilen von Hand, Bedarf gesamt, Abweichungs-Hinweise je Einheit). Die Sammel-PDF bringt die gesamte Lage auf ein leeres Gerät zurück (geprüft).

Am **Telefon** ist die Einsatzansicht aber im ersten Bildschirm praktisch nicht bedienbar: Jeder Tipp auf „Bogen scannen…", „Einheit manuell erfassen…", „Bedarf", „‹ Startseite" oder die Ansichtswahl klappt unsichtbar eine Einheitenkarte weiter unten auf; erst nach N+1 Tipps (N = Zahl der Einheiten) reagiert der Knopf. Daneben verfälscht die Schnellerfassung die Zwischensummen je Zug, weil der Zug vom Zettel nicht vereinheitlicht wird. Der Lagemonitor zeigt nachgetragene Einheiten als „gerade eingetroffen".

Aufgabe ohne fremde Hilfe: am Tablet ja, am Telefon nur mit Umweg (der Nutzer muss den Fehler erst durchschauen).

## Befunde

### F1 – P0 – Erster Bildschirm am Telefon ist von einer unsichtbaren Tippfläche überdeckt
- **Fundstelle / Aufgabe:** Einsatzansicht, Breite ≤ 600 px (geprüft 320, 360, 390, 430, 600 px), sobald die Einheitenkarten zugeklappt sind (Standard am Telefon). Aufgaben: Lage lesen und Einheit aufnehmen.
- **Beobachtung:** Der Aufklapp-Knopf jeder zugeklappten Karte (`button.karte-aufklappen`, `position:absolute; inset:0`) hat keinen positionierten Elternteil und spannt sich über die gesamte erste Bildschirmhöhe des Dokuments (gemessen 0,0 – 390×844 bzw. 360×740). `elementFromPoint` liefert an den Stellen von „‹ Startseite", Ansicht „Feld", „Bogen scannen…", „Einheit manuell erfassen…", „Bedarf" und „Zur Einheitenliste ↓" jeweils diesen Knopf der Karte Nr. 4. Echter Tipp auf „Bogen scannen…" (390×844): kein Dialog, stattdessen klappt Karte Nr. 4 außerhalb des Sichtbereichs auf – auf dem Bildschirm ändert sich nichts. Der Kameradialog erscheint erst beim **5.** Tipp (4 Einheiten). Die Überdeckung wandert beim Scrollen nicht mit (Dokument-Bereich y 0–844); die Knöpfe liegen aber genau dort. Ab 700 px Breite (Karten offen) tritt es nicht auf.
- **Erwartung der Rolle:** Ein Tipp auf „Bogen scannen" öffnet den Scanner; ein Tipp auf „Bedarf" zeigt den Bedarf.
- **Auswirkung im Einsatz:** Bei 30 Einheiten braucht es 31 Tipps, bis die nächste Einheit aufgenommen werden kann. Die App wirkt eingefroren; der Helfer gibt auf oder lädt neu (danach sind die Karten wieder zu und alles beginnt von vorn). Bedarf und Zurück zur Startseite sind ebenso blockiert.
- **Empfehlung:** Die Tippfläche einer Karte darf nur die Karte selbst bedecken. Nach der Korrektur am Telefon mit vielen Einheiten erneut prüfen.
- **Verifikation:** 390×844, Sammlung mit ≥ 4 zugeklappten Karten: ein einziger Tipp auf „Bogen scannen…", „Einheit manuell erfassen…", „Bedarf" und „‹ Startseite" löst jeweils sofort die eigene Aktion aus; `elementFromPoint` an diesen Stellen liefert den Knopf selbst.

### F2 – P1 – Zug aus der Schnellerfassung wird nicht vereinheitlicht, Zwischensummen je Zug zerfallen
- **Fundstelle / Aufgabe:** Schnellerfassung, Feld „Zug / Verband (laut Zettel)"; danach Einsatzansicht „Zwischensummen nach Zug" und Tabelle.
- **Beobachtung:** Nr. 7 mit Zug „2.Zug" erfasst; Nr. 1 über „Zug zuordnen" auf „2. Zug" gesetzt. Zwischensummen zeigen zwei getrennte Züge: „2. Zug · 1 Einheit · Stärke 1/0/2/3" und „2.Zug · 1 Einheit · Stärke 1/2/6/9" („2 Züge + Einheiten ohne Zug"). Der Papier-Abgleich dagegen vereinheitlicht „2.Zug", „Zug 2" und „2. Zug" korrekt zu „2. Zug" (geprüft).
- **Erwartung der Rolle:** Der 2. Zug ist ein Zug mit einer Summe, egal wie der Zettel ihn schreibt.
- **Auswirkung im Einsatz:** Die Zugstärke des 2. Zuges steht als 3 statt 12 da; wer nach Zwischensumme Kräfte einteilt oder an den Zugführer meldet, meldet falsch.
- **Empfehlung:** Dieselbe Vereinheitlichung und Vorschlagsliste wie bei „Zug zuordnen" und im Papier-Abgleich auch in der Schnellerfassung.
- **Verifikation:** Schnellerfassung mit „2.Zug", eine andere Einheit mit „2. Zug" – Zwischensummen zeigen einen Zug mit beiden Einheiten.

### F3 – P2 – Lagemonitor zeigt nachgetragene Einheiten als „gerade eingetroffen"
- **Fundstelle:** Lagemonitor, Bewegungsliste und Sortierung der Einheitentabelle.
- **Beobachtung:** Nr. 7 mit Eintreffzeit 19:55 (vom Meldeblock) um 20:49 nachgetragen. Lagemonitor um 20:51: „Eingetroffen: THW Bremen Bergungsgruppe vor 2 Min", Einheit an erster Stelle („zuletzt gemeldet zuerst"). Die Einsatzdauer („seit erster Meldung 0 Stunden, 56 Minuten") rechnet dagegen richtig ab 19:55. Ursache: Bewegungen nutzen den Empfangszeitpunkt, nicht die Eintreffzeit.
- **Erwartung der Rolle:** Der Fernseher zeigt, wann die Einheit wirklich da war; ein Nachtrag ist als Nachtrag erkennbar.
- **Auswirkung:** Am Fernseher entsteht der Eindruck eines frischen Zugangs; wer danach fragt („wer ist eben gekommen?"), bekommt eine Einheit, die seit einer Stunde da ist.
- **Empfehlung:** Bewegung nach Eintreffzeit anzeigen oder als „nachgetragen (eingetroffen 19:55)" kennzeichnen.
- **Verifikation:** Einheit mit Eintreffzeit −60 min erfassen; Lagemonitor nennt 19:55 bzw. „nachgetragen".

### F4 – P2 – Lagemonitor ohne Zug, Bedarf und Abweichungen
- **Fundstelle:** Lagemonitor (1280×720, 1920×1080).
- **Beobachtung:** Tabelle hat nur Orga, Ort, Funkrufname, Einheitentyp, F, U, M (keine Gesamtspalte je Einheit, kein Zug). Kein Sofortbedarf (Verpflegung, Ruhezeit, Unterbringung) – auch nicht die auf den Karten als dringend markierte Abweichung „Verpflegung 20 (Stärke 3)". Bei 1280×720 schiebt das Aufklappen von „Einsatzdaten" die Einheitentabelle auf eine Zeile zusammen, „+ 3 weitere Einheiten" wird überdeckt.
- **Erwartung:** Der Fernseher in der Führungsstelle beantwortet „Wie stark ist welcher Zug, was wird gebraucht?" ohne das Tablet.
- **Auswirkung:** Für Zug- und Bedarfsfragen muss jemand doch wieder an das Tablet; der Fernseher trägt nur die Gesamtstärke.
- **Empfehlung:** Zug und Gesamt je Einheit, dazu eine Bedarfszeile (nur wenn etwas offen ist).
- **Verifikation:** Lagemonitor mit zwei Zügen und einer Ruhezeit-Meldung zeigt beides ohne Klick.

### F5 – P2 – Bedarfssumme „Verpflegung 21" verschweigt die angeforderten 80 Portionen
- **Fundstelle:** Summenzeile „Bedarf: Verpflegung 21", Lageblatt „Verpflegung: 21 Portionen".
- **Beobachtung:** Alle vier Einheiten haben „Verpflegung für 20 Personen" angefordert (Bogen, Sammel-PDF S. 3–6), Stärken 3/6/6/6. Die Summe rechnet 21 (nach Stärke). Die Abweichung steht nur einzeln je Karte bzw. Tabellenzeile („Verpfl. 20 (St. 3)"); die Tabellenspalte „VERPFL." zeigt 3/6/6/6, die Karte 20 – zwei verschiedene Zahlen unter fast gleichem Namen.
- **Erwartung:** Die Summe sagt, ob es eine Abweichung zur Anforderung gibt („21 nach Stärke · angefordert 80 · 4 Abweichungen").
- **Auswirkung:** Wer die Summe an die Verpflegung meldet, unterschlägt die Anforderung der Einheiten oder muss jede Karte einzeln prüfen.
- **Empfehlung:** In der Bedarfssumme (App, Lageblatt, Lagemonitor) Hinweis auf abweichende Anforderungen mit Anzahl; Spaltenbezeichnung eindeutig („nach Stärke" / „angefordert").
- **Verifikation:** Einheit mit Anforderung ≠ Stärke – Summenzeile nennt die Abweichung.

### F6 – P2 – Weitergabe, Lageblatt und Export liegen unter der gesamten Einheitenliste
- **Fundstelle:** Einsatzansicht, Telefon.
- **Beobachtung:** „Einsatz weitergeben / sichern" bei 4 Einheiten und aufgeklappten Karten bei y≈1615 (390 px). Es gibt den Sprunglink „Weitergeben, Lageblatt, Export ↓", der am Telefon aber von F1 ebenfalls überdeckt ist. Der Stand „Noch kein Lageblatt aus diesem Einsatz" steht ebenfalls unten.
- **Auswirkung:** Bei 40 Einheiten ist der Weg zum Lageblatt lang; ob und wann zuletzt etwas an den Stab ging, ist oben nicht sichtbar (die Startseite zeigt „Lageblatt: noch keins · Export: noch keiner", die Einsatzansicht oben nicht).
- **Empfehlung:** Stand der letzten Weitergabe / des letzten Lageblatts neben die Summenzeile.
- **Verifikation:** Erster Bildschirm nennt „Lageblatt zuletzt HH:MM, seitdem N neue Meldungen".

### F7 – P3 – Zugeklappte Karte ohne Eintreffzeit; „kürzlich eingetroffen" auch nach Stunden
- Zugeklappt zeigt die Karte nur „kürzlich eingetroffen", keine Uhrzeit. Nach Papier-Abgleich trugen Einheiten mit Eintreffzeit 18:05–18:20 um 20:53 weiter „kürzlich eingetroffen" (Marke hängt auch an der Kenntnisnahme, Tooltip erklärt das, auf Touch nicht sichtbar). Empfehlung: Eintreffzeit (HH:MM) in die zugeklappte Zeile; Marke nach Kenntnisnahme „neu gemeldet" nennen.

### F8 – P3 – Lageblatt-Kopf ohne DTG und ohne Funkrufname der Führungsstelle
- Lageblatt: „Erstellt 25.10.2026, 20:47"; der Dateiname trägt die DTG (252047okt26), das Blatt selbst nicht. Der Funkrufname der Führungsstelle (Lagemonitor) steht nicht auf dem Lageblatt. Empfehlung: DTG und Absender (Funkrufname/Meldekopf) in den Kopf. (Feld Funkrufname war im Test leer; ob er bei gesetztem Wert übernommen wird, ist **nicht geprüft**.)

### F9 – P3 – Tabelle am Telefon zeigt die Gesamtstärke nicht im ersten Blick
- 390 px: Tabelle 1615 px breit, 22 Spalten; sichtbar Einheit, Zug (angeschnitten), F, U, M; „GES." beginnt am rechten Rand. Für die Führung reicht meist Einheit/Zug/Gesamt/Bedarf; Reihenfolge der Spalten am Telefon prüfen.

## Abschluss

- **Aufgabe geschafft:** mit Umwegen (Tablet ja, Telefon erst nach mehrfachem Tippen bzw. Durchschauen von F1)
- **Fremde Hilfe nötig:** nein am Tablet; am Telefon wahrscheinlich ja, weil die blockierten Knöpfe ohne Rückmeldung bleiben
- **Größtes Missverständnis:** „Die App hängt" – Tipps auf die Hauptknöpfe am Telefon bewirken sichtbar nichts.
- **Größtes Einsatzrisiko:** Falsche Zugstärke in den Zwischensummen, wenn Züge über die Schnellerfassung in anderer Schreibweise ankommen.
- **Top-Priorität für die nächste Iteration:** Tippfläche der zugeklappten Karte auf die Karte begrenzen (F1).
