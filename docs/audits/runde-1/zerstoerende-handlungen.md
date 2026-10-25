# Audit Meldekopf – Rolle: THW Destructive Action Reviewer

Prüfstand: Produktions-Build http://localhost:5290, Telefon-Ansicht 390 × 844 mit Touch, Sammlung „Hochwasser Weser" mit 4 Einheiten. Geprüft per Playwright mit echten Interaktionen am 25.10.2026 zwischen 20:42 und 21:13 Uhr. Der Build wurde um 21:09 Uhr von außen ausgetauscht; D1 habe ich danach erneut nachgestellt. Bilder liegen unter `(Prüfstand)/bilder/`.

## Urteil aus Sicht der Rolle

Die folgenschweren Aktionen sind vorbildlich abgesichert:

- **Meldung entfernen:**
  - Die Rückfrage nennt die Einheit und den Stand.
  - Sie warnt, dass sich die Nummern verschieben („Nr. 2–4 rücken auf … Am Funk genannte Nummern und ein gedrucktes Lageblatt passen dann nicht mehr").
  - Sie sagt, ob es schon einen Export gibt.
  - Danach steht eine Rückgängig-Leiste bereit.
- **Einsatz löschen:** Der Einsatz geht in den Papierkorb und bleibt 30 Tage rückholbar; die Quittung hat „Rückgängig".
- **Endgültig löschen:** Die Rückfrage sagt „es ist die einzige Kopie".
- **Alle Daten löschen:**
  - Die Rückfrage zählt alles auf, was betroffen ist.
  - Sie bietet „Vorher Sicherung erstellen…" an.
  - Der Löschknopf bleibt gesperrt, bis der Haken gesetzt ist.
- **Sicherung einspielen:**
  - Die Rückfrage stellt „geht verloren: Sammlung mit 5 Meldungen" gegen „in der Datei: 4 Meldungen".
  - Auch hier ist ein Haken Pflicht.
- **Prellschutz:** Knöpfe in neuen Dialogen reagieren rund 1 s lang nicht. Ein sofortiger Tipp auf „Meldung entfernen" wirkte nachweislich nicht.
- **Geräteschlüssel neu erzeugen** und **Fassung verwerfen** sagen konkret, was danach gilt.

Die eine echte Schwachstelle ist das **Aufteilen**. Es läuft ohne Rückfrage, hat keinen Rückweg und verändert nebenbei die Eintreffzeiten.

## Befunde

### D1 – P1 – Aufteilen überschreibt still die Eintreffzeiten und hat kein Rückgängig

- **Fundstelle / Aufgabe:** Karte aufklappen → „Mehr…" → „Aufteilen…" → „Aufteilen".
- **Beobachtung:**
  - Ein Tipp auf „Aufteilen" führt die Teilung sofort aus, ohne Rückfrage und ohne Rückgängig-Leiste. Bei Entfernen und Abrücken gibt es die Leiste.
  - Der Rest und der abgeteilte Teil bekommen als Eintreffzeit die Uhrzeit des Aufteilens. Nachgestellt im Build 21:09: von Hand erfasst „eingetroffen 20:10", nach dem Aufteilen bei beiden Teilen „21:11". Auch der CSV-Export zeigt in der Spalte „Eingetroffen" die neue Uhrzeit.
  - Die ursprüngliche Zeit steht nur noch in der „Historie" („eingegangen 20:39").
  - „Zusammenführen" stellt die Stärke wieder her, nicht aber die Zeit. Ein Eintrag „zusammengeführt" bleibt stehen („5 gemeldet · 4 zählend").
  - Ein Zahlendreher (40 statt 4) wird auf 4 gekappt und dann ohne weitere Bestätigung ausgeführt.
- **Erwartung der Rolle:** Aufteilen verschiebt nur Stärke und Fahrzeuge. Zeiten bleiben, und ein Fehlgriff lässt sich mit einem Tipp zurücknehmen.
- **Auswirkung im Einsatz:** Gemeinsam genutzte Einsatzdaten (Lageblatt, Lagemonitor, Exporte an den Stab) zeigen falsche Eintreffzeiten. Die Abweichung fällt niemandem auf, weil die Karte sie als normale Zeit darstellt.
- **Empfehlung:**
  - Die Eintreffzeit des Originals für beide Teile behalten.
  - Nach dem Aufteilen eine Rückgängig-Leiste anbieten.
  - Einen gekappten Wert vor dem Ausführen ausdrücklich bestätigen lassen.
- **Verifikation:**
  - Einheit mit 20:10 aufteilen: Beide Karten und die CSV zeigen 20:10.
  - „Rückgängig" stellt den alten Zustand ohne Reste her.
- **Nachstellweg:**
  1. „Einheit manuell erfassen…": Ort „Brake", Mannschaft 9, Eingetroffen 20:10, übernehmen.
  2. Karte aufklappen → „Mehr…" → „Aufteilen…": Bezeichnung „Trupp 2", Mannschaft 3, „Aufteilen".
  3. Ergebnis: Beide Karten zeigen die aktuelle Uhrzeit als Eintreffzeit.

### D2 – P3 – Abrücken mit einem Tipp, ohne Rückfrage

- **Fundstelle / Aufgabe:** Aufgeklappte Karte, Knopf „Abrücken" in einer Reihe mit „Details", „Bogen als PDF", „Zug zuordnen" und „Auftrag/Notiz".
- **Beobachtung:**
  - Ein Tipp rückt die Einheit sofort ab. Die Summen ändern sich (4 → 3 Einheiten).
  - Unten erscheint die Leiste „Abgerückt 20:47: Nr. 1 … Rückgängig". Sie war nach 60 s noch da.
  - Bei zwei Abrückungen nacheinander nimmt die Leiste nur die letzte zurück. Die erste lässt sich über „Wieder anwesend" an der Karte zurücknehmen.
- **Bewertung:** Der Rückweg ist da und gut erreichbar. Das Risiko ist gering, die Summen im Lagemonitor springen aber sofort.
- **Empfehlung:** Unverändert lassen oder den Knopf räumlich etwas von „Zug zuordnen" absetzen.
- **Verifikation:** Fehlgriff bei „Zug zuordnen" testen; es darf nicht versehentlich abgerückt werden.

### D3 – P3 – Die Rückfrage beim Einspielen der Sicherung nennt einen verwirrenden Grund

- **Fundstelle / Aufgabe:** Datensicherung → „Sicherung einspielen…" mit einer Datei, die eine Minute vorher erstellt wurde.
- **Beobachtung:** Der Dialog sagt „Davon fällt sofort wieder weg: die Namen in 4 Meldungen — die Datei ist älter als die Fristen". Die Datei war eine Minute alt, und die Namen waren schon anonymisiert („ANONYMISIERT"). Gemeint ist offenbar das Alter der Bögen (Stand 14.05.2025), nicht das der Datei.
- **Auswirkung:** Unsicherheit in genau dem Dialog, in dem ich entscheiden muss, ob ich alle Daten ersetze.
- **Empfehlung:** Den Grund richtig benennen („Bögen älter als 90 Tage") und schon anonymisierte Meldungen nicht mitzählen.
- **Verifikation:** Eine frische Sicherung mit alten Bögen einspielen; der Dialog nennt den richtigen Grund.

### D4 – P3 – „Erfassung verwerfen…" ohne Rückweg

- **Fundstelle / Aufgabe:** Schnellerfassung → „Erfassung verwerfen…".
- **Beobachtung:** Die Rückfrage ist konkret („„THW Brake" wird nicht übernommen; die Eingaben gehen verloren") und hat Prellschutz. Nach „Verwerfen" ist der Entwurf gelöscht (`eeb.entwurf.v1` = null), und es gibt kein „Rückgängig".
- **Bewertung:** Vertretbar, weil die Rückfrage klar ist. Für Konsistenz mit Entfernen und Abrücken wäre eine kurze Rückgängig-Leiste angenehm.
- **Verifikation:** Nach dem Verwerfen stellt „Rückgängig" die Eingaben wieder her.

### D5 – P3 (Annahme) – Die Löschwarnung hängt am Erzeugen einer Datei, nicht an der Zustellung

- **Fundstelle / Aufgabe:** Die Rückfragen bei „Endgültig löschen" und „Meldung entfernen" stützen ihre Warnung auf Export oder Weitergabe („es ist die einzige Kopie" bzw. „noch keinen Export").
- **Beobachtung:** Nach „Einsatz weitergeben / sichern" zeigt die Einsatzansicht „Weitergegeben 21:03 — seitdem hier nichts Neues". Die App weiß aber nur, dass eine Datei erzeugt wurde; das räumt der Export-Block selbst ein („ob sie beim Stab angekommen ist, weiß das Gerät nicht").
- **Annahme (nicht nachgestellt):** Nach einem Export, dessen Datei nie angekommen ist, entfällt im Endgültig-löschen-Dialog die Warnung „einzige Kopie".
- **Empfehlung:** In Lösch-Rückfragen „Datei erzeugt am …" schreiben statt „weitergegeben".
- **Verifikation:** Exportieren, Einsatz in den Papierkorb legen, „Endgültig löschen…" öffnen und den Wortlaut prüfen.

## Querverweis

Im Build von 20:41 lagen unsichtbare Aufklapp-Knöpfe über den Hauptknöpfen der Einsatzansicht; Details im Error-Recovery-Bericht, F1. Destruktiv hat das nichts ausgelöst: Fehltipps klappten nur Karten auf. Im Build von 21:09 ist der Fehler behoben.

## Abschluss

- **Aufgabe geschafft:** ja
- **Fremde Hilfe nötig:** nein
- **Größtes Missverständnis:** „Aufteilen" wirkt wie eine harmlose Umbuchung von Köpfen, verändert aber die Eintreffzeiten beider Teile.
- **Größtes Einsatzrisiko:** Falsche Eintreffzeiten nach dem Aufteilen gelangen ohne Hinweis in Lageblatt und Exporte und lassen sich nicht mit einem Tipp zurücknehmen.
- **Top-Priorität für die nächste Iteration:** Aufteilen behält die ursprünglichen Zeiten und bekommt dieselbe Rückgängig-Leiste wie Entfernen und Abrücken.
