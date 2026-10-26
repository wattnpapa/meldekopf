# language: de
# Neu im Meldekopf, nach der Audit-Runde 1 (docs/audits/runde-1/
# fehler-und-wiederanlauf.md, F6): Die App legte keine Verlaufseinträge an,
# Zurück verließ die Seite.
Funktionalität: Zurück bleibt in der App
  Die Zurück-Taste von Browser und Telefon führt einen Schritt innerhalb der
  App zurück: aus der Erfassung in den Einsatz, aus dem Einsatz zur Startseite.

  Grundlage:
    Angenommen auf dem Gerät liegt die Sammlung "Hochwasser Weser" mit dem alten Bogen
    Dann sehe ich die Überschrift "Einheiten (1 gemeldet"

  Szenario: Zurück führt aus der Erfassung in den Einsatz und weiter zur Startseite
    Wenn ich auf "Einheit manuell erfassen…" klicke
    Dann sehe ich die Überschrift "Einheit erfassen"
    Wenn ich im Browser zurückgehe
    Dann sehe ich die Überschrift "Einheiten (1 gemeldet"
    Wenn ich im Browser zurückgehe
    Dann sehe ich die Überschrift "Bögen sammeln"
    Und ist die App noch offen
    Wenn ich im Browser vorgehe
    Dann sehe ich die Überschrift "Einheiten (1 gemeldet"

  Szenario: Nach „‹ Startseite“ führt Zurück nicht wieder in den Einsatz
    Wenn ich auf "‹ Startseite" klicke
    Dann sehe ich die Überschrift "Bögen sammeln"
    Wenn ich die Sammlung "Hochwasser Weser" auf der Startseite öffne
    Dann sehe ich die Überschrift "Einheiten (1 gemeldet"
    Wenn ich im Browser zurückgehe
    Dann sehe ich die Überschrift "Bögen sammeln"
    Und ist die App noch offen

  Szenario: Zurück schließt erst ein offenes Fenster
    Wenn ich auf "Bogen scannen…" klicke
    Dann sehe ich den Dialog "QR-Code scannen"
    Wenn ich im Browser zurückgehe
    Dann ist kein Dialog offen
    Und sehe ich die Überschrift "Einheiten (1 gemeldet"
