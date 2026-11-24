# language: de
# Herkunft: neu in der Meldekopf-App (Rollenaudit Runde 2, P2: Meldekopf P2-3
# und P2-6, Bereitstellungsraum P2-1 und P2-4).
Funktionalität: Lage nachführen und durchgeben
  Im Bereitstellungsraum und in der Führungsstelle ändert sich die Lage, ohne
  dass ein neuer Bogen kommt: Eine Einheit meldet Bedarf nach, die Führung
  fragt die Stärke am Funk ab, eine Erfassung bleibt halb fertig liegen.

  Grundlage:
    Angenommen auf dem Gerät liegt die Sammlung "Hochwasser Weser" mit dem alten Bogen
    Wenn ich auf "Einheit manuell erfassen…" klicke
    Und ich das Feld "Organisation" auf "DLRG" stelle
    Und ich das Feld "Ort der Einheit (Pflicht)" mit "Wardenburg" fülle
    Und ich auf "Mannschaft: erhöhen" klicke
    Und ich auf "Mannschaft: erhöhen" klicke
    Und ich auf "In Einsatz übernehmen" klicke
    Dann sehe ich die Überschrift "Einheiten (2 gemeldet"

  Szenario: Die Stärkemeldung steht als eine Zeile zum Durchgeben bereit
    Wenn ich auf "Stärkemeldung…" klicke
    Dann sehe ich den Dialog "Stärkemeldung"
    Und sehe ich den Hinweis "Hochwasser Weser: 2 Einheiten, Stärke 1 / 0 / 4 // 5"

  Szenario: Der Bedarf einer Einheit ohne Bogen lässt sich nachtragen
    Dann sehe ich den Hinweis "Bedarf nicht erfasst"
    Wenn ich bei der Einheit "DLRG Wardenburg" auf "Mehr…" klicke
    Und ich bei der Einheit "DLRG Wardenburg" auf "Bedarf ändern…" klicke
    Dann sehe ich den Dialog "Bedarf ändern"
    Wenn ich im Dialog "Diesel (Liter)" mit "80" fülle
    Und ich im Dialog auf "Bedarf übernehmen" klicke
    Dann sehe ich den Hinweis "Diesel 80 l"
    Und sehe ich den Hinweis "Bedarf am Meldekopf geändert"
    Und sehe ich die Überschrift "Einheiten (2 gemeldet"

  Szenario: Eine verlassene Erfassung bleibt in der Einsatzansicht sichtbar
    Wenn ich auf "Einheit manuell erfassen…" klicke
    Und ich das Feld "Ort der Einheit (Pflicht)" mit "Ganderkesee" fülle
    Und ich im Browser zurückgehe
    Dann sehe ich die Überschrift "Einheiten (2 gemeldet"
    Und sehe ich den Hinweis "Erfassung angefangen, noch nicht in der Lage"

  Szenario: Eine Wortfolge in Anführungszeichen trifft nur als Ganzes
    Wenn ich das Feld "Suche" mit "\"DLRG Wardenburg\"" fülle
    Dann führt die Einheitenliste genau 1 Einheiten
    Wenn ich das Feld "Suche" mit "\"Wardenburg DLRG\"" fülle
    Dann sehe ich den Hinweis "Keine Einheit passt"
