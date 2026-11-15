# language: de
Funktionalität: Einzelpersonen am Meldekopf führen
  Als Meldekopf möchte ich Fachberater und andere, die ohne Einheit anrücken,
  als einzelne Person in der Lage sehen — nicht als Gruppe mit der Stärke eins.

  Szenario: Ein Baufachberater mit eigenem Bogen erscheint als Person
    Angenommen ich öffne die App
    Wenn ich auf "Neue Einsatz-Sammlung…" klicke
    Und ich im Dialog "Name" mit "Wattsturm" fülle
    Und ich im Dialog auf "Einsatz anlegen" klicke
    Dann sehe ich den Hinweis "Einsatz"
    Wenn ich einen geteilten Bogen-Link einer Einzelperson öffne
    Dann sehe ich den Dialog "Meldung von"
    Wenn ich im Dialog auf "In „Wattsturm“ aufnehmen" klicke
    Dann sehe ich die Überschrift "Einheiten (1 gemeldet"
    # Die Lage führt sie mit der Stärke eins und unter ihrer Funktion.
    Und sehe ich den Hinweis "THW Siegburg Baufachberater/in"
    # Auf der Tafel: Raute der Person mit Sonderfunktion statt des Zeichens einer Gruppe.
    Wenn ich für den Fernseher die Darstellung "Tafel" wähle
    Und ich den Lagemonitor öffne
    Dann zeigt der Lagemonitor die Tafel
    Und trägt die Tafel das Zeichen einer Person
