# language: de
# Herkunft: Erfassungsbogen `features/einsatz-detail.feature` (Commit 441811c).
# Die Grundlage legt die Sammlung direkt auf das Gerät (support/sammlung.ts),
# weil Bogen-Link und Assistent erst mit Phase 3 und 4 kommen; Szenarien, die
# einen Eingang brauchen (Folgemeldung, manuell erfassen, Nachtrag nach neuem
# Bogen, Einsatz importieren), folgen mit diesen Phasen. Neu: die
# Datensicherung als Weg der Sammlung auf ein leeres Gerät (ADR-007).
Funktionalität: Einsatz-Sammlung führen (Meldekopf)
  Als Meldekopf sammle ich fremde Bögen unter einem Einsatz, sehe die Summen
  über alle anwesenden Einheiten, ordne Züge zu, verfolge Folgemeldungen in der
  Historie und gebe die Sammlung als PDF oder CSV weiter.

  Grundlage:
    Angenommen auf dem Gerät liegt die Sammlung "Hochwasser Weser" mit dem alten Bogen
    Dann sehe ich die Überschrift "Hochwasser Weser"
    Und sehe ich die Überschrift "Einheiten (1 gemeldet"

  Szenario: Die Sammlung summiert Stärke und Bedarf über alle Einheiten
    Dann sehe ich die Überschrift "Bedarf (anwesende Einheiten)"
    Und sehe ich zu "Verpflegung" den Wert "vegetarisch"
    Und sehe ich zu "Kraftstoff" den Wert "Diesel"
    Und sehe ich zu "Fahrzeuge" den Wert "1"

  Szenario: Die Vollansicht einer gemeldeten Einheit aufklappen
    Wenn ich auf "Details" klicke
    Dann sehe ich die Überschrift "Zugehörigkeit"
    Und sehe ich den Hinweis "Rudolph"
    Wenn ich auf "Details schließen" klicke
    Dann sehe ich "Zugehörigkeit" nicht

  Szenario: Abgerückte Einheit zählt nicht mehr in die Summe
    Wenn ich auf "Abrücken" klicke
    Dann sehe ich die Schaltfläche "Wieder anwesend"
    Und sehe ich den Hinweis "abgerückt"
    Wenn ich auf "Wieder anwesend" klicke
    Dann sehe ich die Schaltfläche "Abrücken"

  Szenario: Einheit einem Zug zuordnen
    Wenn ich auf "Zug zuordnen" klicke
    Und ich das Feld mit dem Platzhalter "z. B. 2. Zug" mit "2. Zug" fülle
    Und ich auf "Speichern" klicke
    Dann sehe ich die Schaltfläche "Zug ändern"
    Und sehe ich den Hinweis "2. Zug"

  Szenario: Zug-Zuordnung abbrechen ändert nichts
    Wenn ich auf "Zug zuordnen" klicke
    Und ich das Feld mit dem Platzhalter "z. B. 2. Zug" mit "3. Zug" fülle
    Und ich auf "Abbrechen" klicke
    Dann sehe ich die Schaltfläche "Zug zuordnen"

  Szenario: Bogen aufteilen — der Fachberater steht plötzlich einzeln
    Wenn ich auf "Mehr…" klicke
    Und ich auf "Aufteilen…" klicke
    Dann sehe ich den Hinweis "Der abgeteilte Teil braucht eine Bezeichnung."
    Wenn ich das Feld "Bezeichnung des abgeteilten Teils" mit "Fachberater" fülle
    Und ich "Rudolph, Johannes" ankreuze
    Und ich auf "Aufteilen" klicke
    Dann sehe ich die Überschrift "Einheiten (2 gemeldet"
    Und sehe ich den Hinweis "Fachberater"
    Und sehe ich den Hinweis "abgeteilt aus"
    # Die Stärke verteilt sich, sie verschwindet nicht: aus 1 / 0 / 2 / 3 werden
    # zwei Meldungen, die zusammen wieder 3 ergeben.
    Und sehe ich den Hinweis "Stärke 1 / 0 / 0 / 1"
    Und sehe ich den Hinweis "Stärke 0 / 0 / 2 / 2"

  Szenario: Aufgeteilte Teile wieder zusammenführen — der Zug sammelt sich
    Wenn ich auf "Mehr…" klicke
    Und ich auf "Aufteilen…" klicke
    Und ich das Feld "Bezeichnung des abgeteilten Teils" mit "Fachberater" fülle
    Und ich "Rudolph, Johannes" ankreuze
    Und ich auf "Aufteilen" klicke
    Dann sehe ich die Überschrift "Einheiten (2 gemeldet"
    # Zusammenführen wird erst angeboten, wenn es einen zweiten Teil gibt — und
    # nur zeilenweise: nach der Aufteilung trägt jede Zeile den Knopf.
    Wenn ich bei der Einheit "Fachberater" auf "Mehr…" klicke
    Und ich bei der Einheit "Fachberater" auf "Zusammenführen…" klicke
    Und ich das Feld "Bezeichnung danach" mit "" fülle
    Und ich auf "Zusammenführen" klicke
    # Die Einheit steht wieder mit ihrer vollen Stärke da, nichts doppelt.
    Dann sehe ich den Hinweis "Stärke 1 / 0 / 2 / 3"
    Und sehe ich den Hinweis "zusammengeführt"
    Und sehe ich den Hinweis "aufgegangen in"

  Szenario: Ohne zweiten Teil gibt es nichts zusammenzuführen
    Wenn ich auf "Mehr…" klicke
    Dann sehe ich die Schaltfläche "Zusammenführen…" nicht

  Szenario: Aufteilen abbrechen ändert nichts
    Wenn ich auf "Mehr…" klicke
    Und ich auf "Aufteilen…" klicke
    Und ich das Feld "Bezeichnung des abgeteilten Teils" mit "Fachberater" fülle
    Und ich "Rudolph, Johannes" ankreuze
    Und ich auf "Abbrechen" klicke
    Dann sehe ich die Überschrift "Einheiten (1 gemeldet"

  Szenario: Meldung entfernen fragt in der App zurück
    Wenn ich auf "Mehr…" klicke
    Und ich auf "Entfernen" klicke
    Dann sehe ich den Dialog "Meldung entfernen?"
    Wenn ich im Dialog auf "Meldung entfernen" klicke
    Dann sehe ich die Überschrift "Einheiten (0 gemeldet"
    Und sehe ich den Hinweis "Noch keine Meldung."

  Szenario: Sammel-PDF bündelt alle Bögen in einer Datei
    Wenn ich auf "Einsatz weitergeben / sichern" klicke und eine Datei erhalte
    Dann heißt die heruntergeladene Datei wie "eeb-einsatz-*.pdf"

  Szenario: CSV-Übersicht für die Lagekarte
    Wenn ich auf "Übersicht als CSV" klicke und eine Datei erhalte
    Dann heißt die heruntergeladene Datei wie "eeb-einsatz-*.csv"

  Szenario: CSV mit allen Daten aller Bögen für die Auswertung
    Wenn ich auf "Alle Daten als CSV" klicke und eine Datei erhalte
    Dann heißt die heruntergeladene Datei wie "eeb-einsatz-*-alle-daten.csv"

  Szenario: Excel-Liste der Einheiten im Format „Oldenburg“
    Wenn ich auf "Excel-Liste (Format „Oldenburg“)" klicke und eine Datei erhalte
    Dann heißt die heruntergeladene Datei wie "eeb-einsatz-*-oldenburg.xlsx"

  Szenario: Gelöschter Einsatz liegt im Papierkorb und kommt zurück
    Wenn ich auf "Einsatz löschen…" klicke
    Und ich im Dialog auf "In den Papierkorb" klicke
    Dann sehe ich die Schaltfläche "Neue Einsatz-Sammlung…"
    Und sehe ich die Schaltfläche "Papierkorb Einsätze (1)"
    Wenn ich auf "Papierkorb Einsätze (1)" klicke
    Und ich auf "Wiederherstellen" klicke
    Dann sehe ich die Schaltfläche "Öffnen"

  Szenario: Einsatz endgültig löschen fragt in der App zurück
    Wenn ich auf "Einsatz löschen…" klicke
    Und ich im Dialog auf "In den Papierkorb" klicke
    Und ich auf "Papierkorb Einsätze (1)" klicke
    Und ich auf "Endgültig löschen…" klicke
    Dann sehe ich den Dialog "Einsatz endgültig löschen?"
    Und sehe ich den Hinweis "Darin stecken fremde Personendaten"
    Wenn ich im Dialog auf "Endgültig löschen" klicke
    Dann sehe ich die Schaltfläche "Papierkorb Einsätze (1)" nicht

  Szenario: Bei einer einzigen Meldung bleibt die Filterleiste weg
    Dann sehe ich "Suche" nicht

  Szenario: Zurück zur Startseite listet den Einsatz mit seinen Summen
    Wenn ich auf "‹ Startseite" klicke
    Dann sehe ich die Überschrift "Einsatz-Sammlung (Meldekopf)"
    Und sehe ich die Überschrift "Hochwasser Weser"
    Und sehe ich den Hinweis "1 Einheit(en) anwesend"

  # Phase 2: Eine Sammlung kommt über die Datensicherung auf ein leeres Gerät —
  # derselbe Weg wie aus dem Erfassungsbogen (gleiche Schlüssel, ADR-007).
  Szenario: Die Datensicherung bringt die Sammlung auf ein leeres Gerät
    Wenn ich auf "‹ Startseite" klicke
    Und ich auf "Datensicherung" klicke
    Und ich im Dialog auf "Sicherung erstellen…" klicke
    Und ich den Dialog mit Esc schließe
    Und ich auf "Alle Daten löschen" klicke
    Und ich im Dialog "Ja, alle lokalen Daten dieser App endgültig löschen" ankreuze
    Und ich im Dialog auf "Endgültig löschen" klicke
    Und ich im Dialog auf "Neu starten" klicke
    Dann sehe ich "Hochwasser Weser" nicht
    Wenn ich auf "Datensicherung" klicke
    Und ich die zuletzt erhaltene Datei über "Sicherung einspielen…" einlese
    Dann sehe ich den Dialog "Sicherung einspielen?"
    Wenn ich im Dialog auf "Einspielen und ersetzen" klicke
    Und ich im Dialog auf "Neu laden" klicke
    Dann sehe ich die Überschrift "Hochwasser Weser"
    Und sehe ich den Hinweis "1 Einheit(en) anwesend"
