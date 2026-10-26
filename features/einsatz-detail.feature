# language: de
# Herkunft: Erfassungsbogen `features/einsatz-detail.feature` (Commit 441811c).
# Die Grundlage legt die Sammlung direkt auf das Gerät (support/sammlung.ts).
# Die manuelle Erfassung läuft über die Schnellerfassung (eine Seite statt des
# Assistenten, Phase 4). Nicht übernommen: Folgemeldung und getrennt
# weitergeführte Einheit, die den Bogen im Assistenten des Erfassungsbogens
# ändern, und die Rückfrage vor dem Ersetzen des eigenen Bogens (den gibt es
# hier nicht). Neu: die Datensicherung als Weg der Sammlung auf ein leeres
# Gerät (ADR-007).
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
    Wenn ich auf "Einsatz übergeben (PDF mit Daten)" klicke und eine Datei erhalte
    Dann heißt die heruntergeladene Datei wie "eeb-einsatz-*.pdf"

  # Audit Meldekopf Runde 1 (Arbeitsablauf P2-1): Der Knopf hieß „Einsatz
  # weitergeben / sichern", die Datensicherung in der Fußzeile auch „sichern".
  # Die Quittung sagt jetzt, wie die Übergabe-PDF eingelesen wird und dass sie
  # keine Datensicherung des Geräts ist.
  Szenario: Die Übergabe-PDF sagt, wie die Ablösung sie einliest
    Wenn ich auf "Einsatz übergeben (PDF mit Daten)" klicke und eine Datei erhalte
    Dann sehe ich den Hinweis "auf dem neuen Gerät über „Einsatz importieren…“"
    Und sehe ich den Hinweis "die Datensicherung des ganzen Geräts ist ein anderer Weg"

  # Audit Meldekopf Runde 1 (Führung F6): Ob das Lageblatt an der Wand noch
  # stimmt, stand nur unter der ganzen Einheitenliste.
  Szenario: Neben der Summe steht, ob das Lageblatt noch aktuell ist
    Dann sehe ich den Hinweis "Noch kein Lageblatt"
    Wenn ich auf "Lageblatt (A4 quer)" klicke und eine Datei erhalte
    Dann sehe ich den Hinweis "– aktuell"
    Wenn ich die Einheit "DLRG" "Wardenburg" manuell in den Einsatz aufnehme
    Dann sehe ich den Hinweis "– nicht mehr aktuell"
    Und sehe ich die Schaltfläche "Übergeben, Lageblatt, Export ↓"

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

  Szenario: Einheit manuell in den Einsatz erfassen
    Wenn ich auf "Einheit manuell erfassen…" klicke
    Dann sehe ich die Überschrift "Einheit erfassen"
    Wenn ich das Feld "Organisation" auf "Feuerwehr" stelle
    Und ich das Feld "Ort der Einheit (Pflicht)" mit "Wardenburg" fülle
    Und ich auf "In Einsatz übernehmen" klicke
    Dann sehe ich den Dialog "Stärke fehlt"
    Wenn ich im Dialog auf "Trotzdem mit Stärke 0 übernehmen" klicke
    Dann sehe ich die Überschrift "Hochwasser Weser"
    Und sehe ich die Überschrift "Einheiten (2 gemeldet"
    Und sehe ich den Text "Stärke fehlt"

  # R3-N1: Eine Einheit ohne Stärke lag früher ohne Rückfrage als „0 / 0 / 0"
  # in der Lage. „Stärke eintragen" führt zu den Zählern statt abzulegen.
  Szenario: Ohne Stärke führt die Rückfrage zu den Zählern
    Wenn ich auf "Einheit manuell erfassen…" klicke
    Und ich das Feld "Organisation" auf "Feuerwehr" stelle
    Und ich das Feld "Ort der Einheit (Pflicht)" mit "Wardenburg" fülle
    Und ich auf "In Einsatz übernehmen" klicke
    Dann sehe ich den Dialog "Stärke fehlt"
    Wenn ich im Dialog auf "Stärke eintragen" klicke
    Dann ist kein Dialog offen
    Und sehe ich die Überschrift "Stärke"
    Und sehe ich die Schaltfläche "In Einsatz übernehmen"

  Szenario: Eine gezählte Einheit geht ohne Rückfrage in die Lage
    Wenn ich auf "Einheit manuell erfassen…" klicke
    Und ich das Feld "Organisation" auf "DLRG" stelle
    Und ich das Feld "Ort der Einheit (Pflicht)" mit "Wardenburg" fülle
    Und ich auf "Mannschaft: erhöhen" klicke
    Und ich auf "Mannschaft: erhöhen" klicke
    Und ich auf "In Einsatz übernehmen" klicke
    Dann sehe ich die Überschrift "Einheiten (2 gemeldet"
    Und sehe ich den Hinweis "die Nummer auf dem Zettel eintragen"

  Szenario: Eine angefangene Erfassung überlebt das Neuladen
    Wenn ich auf "Einheit manuell erfassen…" klicke
    Und ich das Feld "Ort der Einheit (Pflicht)" mit "Ganderkesee" fülle
    Und ich die Seite neu lade
    Dann sehe ich die Überschrift "Einheit erfassen"
    Und steht im Feld "Ort der Einheit (Pflicht)" der Wert "Ganderkesee"

  Szenario: Ohne Namen lässt sich keine Einheit übernehmen
    Wenn ich auf "Einheit manuell erfassen…" klicke
    Und ich auf "In Einsatz übernehmen" klicke
    Dann sehe ich den Dialog "Ort der Einheit fehlt"

  Szenario: Nach dem Export lassen sich nur die seitdem neuen Bögen weitergeben
    Dann sehe ich den Hinweis "Noch kein Export aus diesem Einsatz"
    Wenn ich auf "Übersicht als CSV" klicke und eine Datei erhalte
    Dann sehe ich den Hinweis "seitdem keine neuen Bögen"
    Wenn ich "Nur neue Bögen seit dem letzten Export" ankreuze
    Dann ist die Schaltfläche "Übersicht als CSV" gesperrt
    Und ist die Schaltfläche "Sammel-PDF (erste Lieferung: alle Bögen)" bedienbar
    Und ist die Schaltfläche "Excel-Liste (Format „Oldenburg“)" bedienbar
    Wenn ich die Einheit "DLRG" "Wardenburg" manuell in den Einsatz aufnehme
    Dann sehe ich den Hinweis "seitdem 1 neuer Bogen"
    Und ist die Schaltfläche "Übersicht als CSV" bedienbar
    Wenn ich auf "Übersicht als CSV" klicke und eine Datei erhalte
    Dann sehe ich den Hinweis "seitdem keine neuen Bögen"
    Und ist die Schaltfläche "Übersicht als CSV" gesperrt
    Und ist die Schaltfläche "Excel-Liste (Format „Oldenburg“)" bedienbar

  Szenario: Mit der zweiten Meldung erscheint die Filterleiste
    Wenn ich die Einheit "DLRG" "Wardenburg" manuell in den Einsatz aufnehme
    Dann sehe ich die Überschrift "Einheiten (2 gemeldet"
    Und sehe ich den Text "Suche"

  # R2-O4: Zwei Fenster derselben App (installierte App und ein Link im
  # Browser) sehen dieselbe Sammlung; was das eine aufnimmt, zeigt das andere
  # sofort, ohne Neuladen.
  Szenario: Ein zweites Fenster nimmt eine Einheit auf, das erste zeigt sie sofort
    Wenn in einem zweiten Fenster die Einheit "DLRG" "Wardenburg" manuell aufgenommen wird
    Dann sehe ich die Überschrift "Einheiten (2 gemeldet"

  # Audit Phase 6 (P0): Am Telefon lag der Aufklappknopf jeder zugeklappten
  # Einheitenkarte über dem ganzen Bildschirm; „Bogen scannen…" klappte nur
  # unsichtbar eine Karte auf. Playwright klickt nur, was den Klick auch bekommt.
  Szenario: Am Telefon erreichen die Knöpfe über der Einheitenliste ihren Tipp
    Angenommen das Fenster 390 × 844 Pixel groß ist
    Wenn ich auf "Bogen scannen…" klicke
    Dann sehe ich den Dialog "QR-Code scannen"

  # Audit Phase 6 (P1): Eine unterbrochene Erfassung öffnete sich wortlos
  # wieder; die nächste Einheit trug Ort und Stärke der vorigen.
  Szenario: Eine unterbrochene Erfassung fragt vor dem Fortsetzen
    Wenn ich auf "Einheit manuell erfassen…" klicke
    Und ich das Feld "Ort der Einheit (Pflicht)" mit "Bremen" fülle
    Und ich auf "‹ Einsatz „Hochwasser Weser“" klicke
    Und ich auf "Einheit manuell erfassen…" klicke
    Dann sehe ich den Dialog "Angefangene Erfassung"
    Wenn ich im Dialog auf "Verwerfen und neue Einheit erfassen" klicke
    Dann steht im Feld "Ort der Einheit (Pflicht)" der Wert ""

  # Audit Phase 6 (Fehler, F4): Dieselbe Erfassung in zwei Fenstern. Ist sie
  # im einen übernommen, legt das andere keine zweite Einheit an.
  Szenario: Eine im anderen Fenster übernommene Erfassung wird nicht doppelt angelegt
    Wenn ich auf "Einheit manuell erfassen…" klicke
    Und ich das Feld "Ort der Einheit (Pflicht)" mit "Brake" fülle
    Und ich auf "Mannschaft: erhöhen" klicke
    Und ich die App in einem zweiten Fenster öffne
    Dann sehe ich im zweiten Fenster die Überschrift "Einheit erfassen"
    Wenn ich auf "In Einsatz übernehmen" klicke
    Dann sehe ich die Überschrift "Einheiten (2 gemeldet"
    Wenn ich im zweiten Fenster auf "In Einsatz übernehmen" klicke
    Dann sehe ich im zweiten Fenster den Dialog "Erst die Fassung klären"
    Und sehe ich die Überschrift "Einheiten (2 gemeldet"

  # Audit Meldekopf Runde 1 (Feld, Handschuh, P2): „Stärke ändern" bot drei
  # Textfelder, am Telefon kam die Tastatur. Jetzt dieselben Zähler wie in der
  # Schnellerfassung.
  Szenario: Stärke ändern geht mit den Zählern
    Wenn ich auf "Mehr…" klicke
    Und ich auf "Stärke ändern…" klicke
    Dann sehe ich den Dialog "Stärke ändern"
    Wenn ich im Dialog auf "Mannschaft: erhöhen" klicke
    Und ich im Dialog auf "Stärke übernehmen" klicke
    Dann sehe ich den Hinweis "Stärke 3 → 4 geändert"
