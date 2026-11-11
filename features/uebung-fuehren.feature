# language: de
# Neu im Meldekopf. Vorgefallen beim ersten Versuch mit der Tafel: Die Sammlung
# war als „Einsatz" angelegt (die Vorgabe), die Bögen als Übung gekennzeichnet.
# Hauptfenster und Fernseher zeigten null, und die Art ließ sich nicht mehr
# umstellen.
Funktionalität: Eine Sammlung nachträglich als Übung führen
  Als Meldekopf übe ich mit denselben Handgriffen wie im Einsatz. Lege ich die
  Sammlung dabei als „Einsatz" an, zählen die Übungsbögen nicht in die Lage.
  Das will ich dort beheben können, wo die Null steht, ohne die Sammlung neu
  anzulegen; bis dahin sollen die Einheiten am Fernseher trotzdem zu sehen sein.

  Szenario: Übungsbögen in einer Einsatz-Sammlung stehen auf der Tafel, ohne zu zählen
    Angenommen auf dem Gerät liegt die Sammlung "Tafel Test" mit 4 Übungsbögen
    Dann sehe ich die Überschrift "Einheiten (4 gemeldet"
    Und sehe ich den Hinweis "Nichts gezählt: alle 4 eingegangenen Meldungen sind Übung"
    Wenn ich für den Fernseher die Darstellung "Tafel" wähle
    Und ich den Lagemonitor öffne
    Dann zeigt der Lagemonitor die Tafel
    Und zeigt der Lagemonitor "Keine Einheit in der Lage (4 Übung, nicht gezählt)."
    Und zeigt der Lagemonitor "Als Übung führen…"
    Und zeigt die Tafel die Gesamtstärke 0
    Und zeigt die Tafel 4 Karten mit der Marke "Übung"
    Und trägt jede Einheit der Tafel ihr taktisches Zeichen
    Und stehen alle Einheiten der Tafel ganz im Bild
    Und überdeckt auf der Tafel keine Angabe eine andere

  Szenario: „Als Übung führen" lässt die Übungsbögen zählen, auch am offenen Fernseher
    Angenommen auf dem Gerät liegt die Sammlung "Tafel Test" mit 4 Übungsbögen
    Wenn ich für den Fernseher die Darstellung "Tafel" wähle
    Und ich den Lagemonitor öffne
    Dann zeigt die Tafel die Gesamtstärke 0
    Wenn ich auf "Als Übung führen…" klicke
    Dann sehe ich den Dialog "Als Übung führen?"
    Wenn ich im Dialog auf "Als Übung führen" klicke
    Dann sehe ich den Hinweis "Übung · letzte Meldung"
    Und sehe ich den Hinweis "Nichts gezählt" nicht
    Und zeigt der Lagemonitor "ÜBUNG – keine Echtlage"
    Und zeigt die Tafel die Gesamtstärke 24
    Und zeigt die Tafel keine Karte mit der Marke "Übung"
    Und zeigt der Lagemonitor "nicht gezählt" nicht
    # Der Rückweg steht an der Quittung.
    Wenn ich auf "Änderung am Einsatz rückgängig machen" klicke
    Dann sehe ich den Hinweis "Nichts gezählt: alle 4 eingegangenen Meldungen sind Übung"
    Und zeigt die Tafel die Gesamtstärke 0
    Und zeigt die Tafel 4 Karten mit der Marke "Übung"

  Szenario: Die Art steht unter „Einsatz bearbeiten" und lässt sich dort umstellen
    Angenommen auf dem Gerät liegt die Sammlung "Tafel Test" mit 4 Übungsbögen
    Wenn ich auf "Ort eintragen…" klicke
    Dann sehe ich den Dialog "Einsatz bearbeiten"
    Wenn ich im Dialog "Art" auf "Übung" stelle
    Und ich im Dialog auf "Übernehmen" klicke
    Dann sehe ich den Hinweis "Übung · letzte Meldung"
    Und sehe ich den Hinweis "Nichts gezählt" nicht

  # Die Vorgabe beim Anlegen ist „Einsatz". Kommt dann der erste Übungsbogen,
  # steht der Weg zur Übung in derselben Rückfrage.
  Szenario: Der erste Übungsbogen bietet an, die Sammlung als Übung zu führen
    Angenommen ich öffne die App
    Wenn ich auf "Neue Einsatz-Sammlung…" klicke
    Und ich im Dialog "Name" mit "Wattsturm" fülle
    Und ich im Dialog auf "Einsatz anlegen" klicke
    Dann sehe ich den Hinweis "Einsatz"
    Wenn ich einen geteilten Bogen-Link eines Übungsbogens öffne
    Dann sehe ich den Dialog "Meldung von"
    Wenn ich im Dialog auf "In „Wattsturm“ aufnehmen" klicke
    Dann sehe ich den Dialog "Übungsbogen in diese Sammlung?"
    Wenn ich im Dialog auf "Als Übung führen und ablegen" klicke
    Dann sehe ich die Überschrift "Einheiten (1 gemeldet"
    Und sehe ich den Hinweis "Übung · letzte Meldung"
    Und sehe ich den Hinweis "Nichts gezählt" nicht
