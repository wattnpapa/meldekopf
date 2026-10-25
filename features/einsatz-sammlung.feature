# language: de
Funktionalität: Einsatz-Sammlung anlegen und Bögen darin sammeln
  Als Meldekopf möchte ich einen Einsatz anlegen und fremde Bögen darin sammeln.
  Die Rückfragen dazu müssen in der Oberfläche der App stehen: Die eingebauten
  JavaScript-Dialoge (prompt/confirm) beantwortet die iOS-App nicht — dort tat
  der Knopf scheinbar nichts. Jedes Szenario hier scheitert zusätzlich, sobald
  ein Systemdialog auftaucht (Wachhund in features/support/haken.ts).

  Herkunft: Erfassungsbogen features/einsatz-sammlung.feature (441811c). Ein
  geteilter Bogen-Link öffnet hier keinen Bogen, sondern fragt, in welche
  Sammlung er gehört; „Bogen schließen" gibt es deshalb nicht.

  Szenario: Einsatz von der Startseite aus anlegen
    Angenommen ich öffne die App
    Wenn ich auf "Neue Einsatz-Sammlung…" klicke
    Dann sehe ich den Dialog "Neue Einsatz-Sammlung anlegen"
    Wenn ich im Dialog "Name" mit "Hochwasser Weser" fülle
    Und ich im Dialog "Ort / Auftrag (optional)" mit "Deichabschnitt Nord" fülle
    Und ich im Dialog auf "Einsatz anlegen" klicke
    Dann sehe ich die Überschrift "Hochwasser Weser"
    Und sehe ich den Text "Einsatz · Deichabschnitt Nord"

  Szenario: Ohne Namen lässt sich kein Einsatz anlegen
    Angenommen ich öffne die App
    Wenn ich auf "Neue Einsatz-Sammlung…" klicke
    Dann sehe ich den Dialog "Neue Einsatz-Sammlung anlegen"
    Und ist im Dialog "Einsatz anlegen" gesperrt

  Szenario: Die Eingabetaste legt den Einsatz an
    Angenommen ich öffne die App
    Wenn ich auf "Neue Einsatz-Sammlung…" klicke
    Und ich im Dialog "Name" mit "Sturmflut Wangerland" fülle
    Und ich im Dialog die Eingabetaste drücke
    Dann sehe ich die Überschrift "Sturmflut Wangerland"

  Szenario: Esc schließt den Dialog ohne etwas anzulegen
    Angenommen ich öffne die App
    Wenn ich auf "Neue Einsatz-Sammlung…" klicke
    Und ich im Dialog "Name" mit "Nie angelegt" fülle
    Und ich den Dialog mit Esc schließe
    Dann ist kein Dialog offen
    Und sehe ich die Schaltfläche "Bogen scannen…"
    Und sehe ich "Nie angelegt" nicht

  Szenario: Abgebrochener Dialog legt nichts an
    Angenommen ich öffne die App
    Wenn ich auf "Neue Einsatz-Sammlung…" klicke
    Und ich im Dialog "Name" mit "Verworfen" fülle
    Und ich im Dialog auf "Abbrechen" klicke
    Dann sehe ich die Schaltfläche "Bogen scannen…"
    Und sehe ich "Verworfen" nicht

  Szenario: Bogen-Link in einen neu angelegten Einsatz aufnehmen
    Angenommen ich öffne einen geteilten Bogen-Link eines alten Bogens
    Dann sehe ich den Dialog "Meldung von"
    Wenn ich im Dialog auf "Neue Einsatz-Sammlung anlegen und aufnehmen" klicke
    Dann sehe ich den Dialog "Neue Einsatz-Sammlung anlegen"
    Wenn ich im Dialog "Name" mit "Sammelübung Nord" fülle
    Und ich im Dialog "Art" auf "Übung" stelle
    Und ich im Dialog auf "Einsatz anlegen" klicke
    Dann sehe ich die Überschrift "Sammelübung Nord"
    # Hinter der Art steht seit R3-K5 die Zeit der letzten Meldung.
    Und sehe ich den Hinweis "Übung · letzte Meldung"
    Und sehe ich die Überschrift "Einheiten (1 gemeldet"

  Szenario: Bogen-Link in eine laufende Sammlung aufnehmen
    Angenommen auf dem Gerät liegt die Sammlung "Hochwasser Weser" mit dem alten Bogen
    Wenn ich öffne einen geteilten Bogen-Link eines alten Bogens
    Dann sehe ich den Dialog "Meldung von"
    Und sehe ich die Schaltfläche "In „Hochwasser Weser“ aufnehmen"
    Und sehe ich die Schaltfläche "In eine neue Einsatz-Sammlung…"
    Und sehe ich die Schaltfläche "Im Erfassungsbogen öffnen (ansehen oder bearbeiten)"

  Szenario: Abgebrochene Rückfrage legt nichts an
    Angenommen ich öffne einen geteilten Bogen-Link eines alten Bogens
    Dann sehe ich den Dialog "Meldung von"
    Wenn ich den Dialog mit Esc schließe
    Dann ist kein Dialog offen
    Und sehe ich die Schaltfläche "Bogen scannen…"
    Und sehe ich die Schaltfläche "Neue Einsatz-Sammlung…"
