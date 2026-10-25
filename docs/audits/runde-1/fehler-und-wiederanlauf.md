# Audit Meldekopf – Rolle: THW Error Recovery Reviewer

Prüfstand: Produktions-Build unter http://localhost:5290 (vite preview), Telefon-Ansicht 390 × 844 mit Touch, Sammlung „Hochwasser Weser" mit 4 Einheiten vorgelegt. Geprüft am 25.10.2026 zwischen 20:42 und 21:13 Uhr per Playwright mit echten Interaktionen. Bilder liegen unter `(Prüfstand)/bilder/`.

**Wichtig zum Prüfstand:** Während des Audits wurde der Build ausgetauscht. `dist/index.html` und `index.html` haben um 21:09 Uhr einen neuen Stand bekommen, nicht durch dieses Audit. Befund F1 trat im Build von 20:41 auf und lässt sich im Build von 21:09 nicht mehr nachstellen. Alle übrigen Befunde habe ich nach 21:09 erneut nachgestellt (F2, F3, F4, F5).

## Urteil aus Sicht der Rolle

Die App fängt die typischen Fehler beim Erfassen ungewöhnlich gut ab:

- Fehlt der Name, springt die Rückfrage gezielt zum Namensfeld.
- Bei Stärke 0 stehen drei klare Wege zur Wahl.
- Ein Zahlendreher (81 Mannschaft) löst „Stimmt die Stärke?" aus.
- Bei einer Eintreffzeit in der Zukunft bietet die App „Zeit korrigieren / Trotzdem heute / Gestern" an.
- Ein Doppeltipp auf „In Einsatz übernehmen" erzeugt nur eine Einheit.
- Wird eine Einheit ein zweites Mal von Hand erfasst, fragt die App nach „neue Fassung / Historie / eigene Einheit".
- Neuladen mitten in der Erfassung verliert nichts.
- Eine kaputte Sicherungsdatei wird abgewiesen, mit klarer Aussage, dass die Daten unverändert sind.

Reibung entsteht an drei Stellen. Ein falsch ausgeführtes **Aufteilen** lässt sich nicht sauber zurücknehmen. Der **Papier-Abgleich** prüft Zeiten weniger streng als die übrigen Wege. **Unterbrechungen** wie Zurück-Taste, zweites Fenster oder eine liegen gebliebene Erfassung lassen sich nur bedingt nachvollziehen. Im Build von 20:41 kam ein Bedienfehler der App selbst hinzu (F1): Tipps landeten auf dem Telefon woanders als gezielt.

Mit dem aktuellen Build erledigt ein Helfer die Aufgaben ohne fremde Hilfe.

## Befunde

### F1 – P0 – Tipps oben im Bild öffnen unsichtbar eine Einheitenkarte (Build 20:41; im Build 21:09 behoben)

- **Fundstelle / Aufgabe:** Einsatzansicht am Telefon (390 px, Kartenansicht): „Bogen scannen…", „Einheit manuell erfassen…", „‹ Startseite", die Ansicht-Umschalter, die Karten selbst und „Schließen" in der Einlese-Quittung.
- **Beobachtung:** Der unsichtbare Aufklapp-Knopf jeder zugeklappten Karte war 390 × 844 px groß und lag bei (0,0). Die Karte hatte `position: static`, der Knopf war mit `inset: 0` positioniert und bedeckte so den ganzen ersten Bildschirm.
  - Ein echter Touch-Tipp auf „Einheit manuell erfassen…" öffnete nicht die Erfassung. Stattdessen klappte die 4. Karte weit unten auf, außerhalb des Blickfelds; Bild `tap-manuell.png`.
  - Bei „‹ Startseite", „Bogen scannen…" und „Feld" geschah dasselbe: jeweils eine Karte mehr ging auf, sonst nichts.
  - Erst der 5. Tipp (bei 4 Karten) öffnete die Erfassung.
  - Ein Tipp auf die Karte selbst öffnete sie nicht; Bild `karte1-tipp.png`.
  - Auch „Schließen" in der Einlese-Quittung war verdeckt.
  - Bei 768 und 1280 px trat der Fehler nicht auf.
- **Erwartung der Rolle:** Ein Knopf tut beim ersten Tipp, was draufsteht.
- **Auswirkung im Einsatz:** Am Meldekopf mit dem Telefon reagiert scheinbar nichts. Der Helfer tippt mehrfach und verliert Zeit und Vertrauen. Kommen viele Einheiten an, braucht es entsprechend viele Fehltipps. Abrücken oder Entfernen sind nur über die Tabellenansicht erreichbar, und auf die kommt man so nicht.
- **Empfehlung:** Im aktuellen Build ist der Fehler behoben, weil `.einheit-zeile.kompakt` jetzt `position: relative` hat. Gegen Rückfall absichern, mit einem Verhaltenstest bei Telefonbreite und echtem Tipp statt Klick per Rolle.
- **Verifikation:** Mit Playwright bei 390 × 844 und `hasTouch` per `touchscreen.tap` die Mitte von „Einheit manuell erfassen…" antippen. Die Erfassung muss sich beim ersten Tipp öffnen. `elementFromPoint` über den Hauptknöpfen darf keinen `.karte-aufklappen` liefern.
- **Nachstellweg (alter Build):** App mit 4 Einheiten bei 390 px öffnen und „Einheit manuell erfassen…" antippen. Es klappt eine Karte auf, die Erfassung öffnet sich nicht.

### F2 – P1 – Falsches Aufteilen lässt sich nicht sauber zurücknehmen

- **Fundstelle / Aufgabe:** Karte → „Mehr…" → „Aufteilen…" → „Aufteilen"; danach „Zusammenführen…".
- **Beobachtung:**
  - Ein Zahlendreher bei der Mannschaft (40 statt 4) wird still auf das Maximum gesetzt: „Höchstens 4 — dein Wert 40 wurde auf 4 gesetzt". Der Tipp auf „Aufteilen" führt die Teilung trotzdem sofort aus, ohne Rückfrage und ohne Rückgängig-Leiste.
  - Danach tragen **beide** Teile als Eintreffzeit die Uhrzeit des Aufteilens. Beim Rest wurde aus „eingetroffen 20:10", das von Hand erfasst war, „21:11" (Nachstellung im neuen Build). Bei einer gescannten Einheit wurde aus 20:39 die Uhrzeit 20:59. Dasselbe steht in „Übersicht als CSV" in der Spalte „Eingetroffen".
  - „Zusammenführen" stellt die Stärke wieder her (1/1/4/6), die Eintreffzeit aber nicht. Außerdem bleibt ein Eintrag „zusammengeführt" stehen: „5 gemeldet · 4 zählend" statt vorher „4 gemeldet · 4 zählend".
  - Zum Vergleich: „Stärke ändern…" und eine Folgemeldung per Scan lassen die Eintreffzeit unverändert.
- **Erwartung der Rolle:** Nach einem Vertipper komme ich mit einem Tipp auf „Rückgängig" zum vorherigen Stand zurück, wie beim Entfernen und Abrücken. Die Eintreffzeit ändert sich durch das Aufteilen nicht.
- **Auswirkung im Einsatz:** Lageblatt und Exporte weisen beide Teile als „gerade eingetroffen" aus. Für Verpflegung, Ablösung und spätere Abrechnung ist die Zeit falsch, und der Helfer merkt es nicht. Selbst wer den Fehler bemerkt, muss beide Zeiten von Hand über „ändern" nachtragen und die ursprüngliche Zeit aus der „Historie" heraussuchen.
- **Empfehlung:** Die Eintreffzeit des Originals für Rest und abgeteilten Teil übernehmen. Nach dem Aufteilen dieselbe Rückgängig-Leiste anbieten wie nach Entfernen und Abrücken. Einen gekappten Wert vor dem Ausführen bestätigen lassen.
- **Verifikation:** Eine Einheit mit Zettelzeit 20:10 erfassen und aufteilen. Beide Karten und der CSV-Export zeigen 20:10. „Rückgängig" stellt den Stand vor dem Aufteilen her, ohne Rest-Eintrag.
- **Nachstellweg:** Einheit manuell erfassen (Ort „Brake", Mannschaft 9, Eingetroffen 20:10), dann „Mehr…" → „Aufteilen…", Mannschaft 3, Bezeichnung „Trupp 2", „Aufteilen". Beide Karten zeigen jetzt die aktuelle Uhrzeit als Eintreffzeit.

### F3 – P2 – Der Papier-Abgleich übernimmt eine Eintreffzeit in der Zukunft ohne Rückfrage

- **Fundstelle / Aufgabe:** Quittung nach „Bögen einlesen…" → „Lage vom Papier abgleichen…" → „Abgleich übernehmen".
- **Beobachtung:** „Eingetroffen am" auf 26.10.2026, 20:15 gesetzt, also einen Tag in der Zukunft. Die App übernimmt die Zeit ohne Rückfrage. Erst die Karte zeigt danach „⚠ Eingetroffen 26.10.2026, 20:15 liegt in der Zukunft — Tag oder Monat vertauscht?". Dieselbe Zeit löst in der Schnellerfassung und bei „ändern" an der Karte die Rückfrage „Stimmt die Zeit?" aus.
- **Erwartung der Rolle:** Dieselbe Prüfung auf allen Wegen, gerade beim Abschreiben vom Papier, wo Zahlendreher am häufigsten sind.
- **Auswirkung im Einsatz:** Nach einem Geräteausfall werden viele Einheiten in einem Rutsch abgeglichen. Ein Tag- oder Monatsdreher fällt erst später an einzelnen Karten auf, wenn überhaupt.
- **Empfehlung:** Die Zeitprüfung beim „Abgleich übernehmen" genauso stellen wie bei der Einzelkorrektur, gesammelt für alle auffälligen Zeilen.
- **Verifikation:** Eine Abgleichszeile mit Zeit in der Zukunft führt zu „Stimmt die Zeit?", bevor etwas gespeichert wird.

### F4 – P2 – Eine zweite Bearbeitung derselben Erfassung in einem anderen Fenster wird zur zweiten Einheit

- **Fundstelle / Aufgabe:** Erfassung in Fenster A begonnen, dieselbe App in Fenster B geöffnet. B landet automatisch in derselben Erfassung.
- **Beobachtung:** In B den Namen von „Brake" auf „Nordenham" korrigiert, in A „In Einsatz übernehmen" getippt. A legt „THW Brake" an, und die Korrektur aus B kommt in A nicht an. B zeigt das Formular weiter, ohne Hinweis, dass die Erfassung schon übernommen ist. Ein Tipp auf „In Einsatz übernehmen" in B legt „THW Nordenham" als **zweite Einheit** an: „6 gemeldet". Ohne Änderung in B entsteht kein Doppel.
- **Erwartung der Rolle:** Fenster B sagt „Diese Erfassung wurde im anderen Fenster übernommen" und bietet „Zur Einheit" oder „Als Korrektur übernehmen" an.
- **Auswirkung im Einsatz:** Eine Einheit steht doppelt in der Lage, mit doppelter Stärke und doppelter Verpflegung. Am ELW-Laptop mit mehreren Tabs ist das realistisch.
- **Empfehlung:** Bei Übernahme in einem Fenster die Erfassung in den anderen Fenstern sichtbar schließen oder sperren.
- **Verifikation:** Zwei Tabs, eine Erfassung, in B ändern und in A übernehmen. B zeigt einen Hinweis, und es entsteht keine zweite Einheit.
- **Nachstellweg:** wie beschrieben, Skript `s17.cjs`.

### F5 – P2 – Eine angefangene Erfassung ist außerhalb des Formulars unsichtbar

- **Fundstelle / Aufgabe:** In der Erfassung „‹ Einsatz …" tippen; die Erfassung hat Ort „Elsfleth".
- **Beobachtung:** Die Eingaben bleiben erhalten und stehen beim nächsten „Einheit manuell erfassen…" wieder da. Weder Einsatzansicht noch Startseite zeigen aber, dass eine Erfassung offen ist. Die Textsuche nach „Elsfleth" oder „angefangen" findet nichts.
- **Erwartung der Rolle:** Eine sichtbare Marke wie „Angefangene Erfassung: THW Elsfleth – fortsetzen / verwerfen".
- **Auswirkung im Einsatz:** Nach einer Unterbrechung (Funk, Rückfrage) vergisst der Helfer die halb erfasste Einheit. Sie fehlt in der Lage, obwohl die Daten im Gerät liegen.
- **Empfehlung:** In der Einsatzansicht einen Hinweis auf die offene Erfassung mit „Fortsetzen" zeigen.
- **Verifikation:** Erfassung anfangen und zurückgehen. Die Einsatzansicht nennt die offene Erfassung mit Namen.

### F6 – P2 – Die Zurück-Taste des Browsers verlässt die App

- **Fundstelle / Aufgabe:** In der Erfassung die Zurück-Taste von Browser bzw. Telefon drücken.
- **Beobachtung:** Die App legt beim Wechsel zwischen Ansichten keine Verlaufseinträge an; die URL bleibt `/`. Zurück führte auf die vorher besuchte Seite (`impressum.html`) bzw. nach `about:blank`. Nach Vorwärts war die Erfassung samt Eingaben wieder da, verloren ging also nichts.
- **Erwartung der Rolle:** Zurück führt einen Schritt innerhalb der App zurück, aus der Erfassung also in die Einsatzansicht.
- **Auswirkung im Einsatz:** Der Helfer landet unvermittelt außerhalb der App und muss sie neu öffnen.
- **Annahme:** In der Android-App (Capacitor) nicht geprüft. Im Code gibt es keinen Handler für die Zurück-Taste (`backButton`), dort beendet sie die App vermutlich.
- **Empfehlung:** Ansichtswechsel in den Verlauf schreiben bzw. die Zurück-Taste in der App abfangen.
- **Verifikation:** Startseite → Einsatz → Erfassung, dann Zurück. Man landet in der Einsatzansicht.

### F7 – P3 – Für eine kaputte Bilddatei kommt eine unpassende Meldung

- **Fundstelle / Aufgabe:** „Bögen einlesen…" mit `kaputt.png`, einer Textdatei mit der Endung .png.
- **Beobachtung:** Die App meldet „1 Bild gelesen — 0 Bögen aufgenommen. kaputt.png: Kein QR-Code im Bild gefunden." Die Datei ist aber gar kein Bild. Eine kaputte PDF-Datei wird dagegen treffend gemeldet.
- **Empfehlung:** „Datei ließ sich nicht als Bild öffnen (beschädigt?)" melden, damit niemand das Foto erneut mit besserem Licht macht.
- **Verifikation:** Eine kaputte PNG-Datei führt zu einer Meldung, die die Datei als beschädigt benennt.

## Ohne Befund geprüft

- Schnellerfassung: fehlender Name, Stärke 0, Zahlendreher (81), Zeit in der Zukunft (23:30), Doppeltipp, Neuladen, „Erfassung verwerfen…", gleiche Einheit zweimal erfasst.
- Zeitkorrektur an der Karte: Zeit in der Zukunft, Abrücken vor Eintreffen.
- „Stärke ändern…" mit 40, also mehr als dreifach.
- Entfernen mit Prellschutz, konkreter Rückfrage und Rückgängig.
- Abrücken mit Rückgängig-Leiste (noch nach 60 s sichtbar).
- Import: fremder QR-Code, doppelter Bogen („1 bereits vorhanden"), Folgemeldung („3 → 9").
- Kaputte und ältere Datensicherung (genaue Gegenüberstellung, Haken nötig).

## Abschluss

- **Aufgabe geschafft:** ja (im Build 21:09). Im Build 20:41 nur mit Umwegen (F1).
- **Fremde Hilfe nötig:** nein
- **Größtes Missverständnis:** Wer aufteilt, hält die Eintreffzeit für unverändert. Tatsächlich steht danach bei beiden Teilen die Uhrzeit des Aufteilens.
- **Größtes Einsatzrisiko:** Unbemerkt falsche Eintreffzeiten nach dem Aufteilen gehen in Lageblatt und Exporte ein und lassen sich nur mühsam über die Historie rekonstruieren.
- **Top-Priorität für die nächste Iteration:** Aufteilen behält die ursprüngliche Eintreffzeit und bekommt eine Rückgängig-Leiste (F2). Daneben einen Rückfalltest für F1 bei Telefonbreite.
