# language: de
# Neu im Meldekopf, nach der Audit-Runde 1 (docs/audits/runde-1/
# nacht-und-sicht.md, Befunde 2 und 3).
Funktionalität: Nachtmodus unterscheidet Zustände und Fenster
  Nachts ist alles gedimmt und warm. Eine Warnung muss sich trotzdem von einem
  Hinweis abheben, und ein offenes Fenster von der Seite dahinter.

  Grundlage:
    Angenommen auf dem Gerät liegt die Sammlung "Hochwasser Weser" mit dem alten Bogen
    Dann sehe ich die Überschrift "Einheiten (1 gemeldet"
    Wenn ich den Anzeigemodus "Nacht" wähle
    Dann ist der Anzeigemodus "Nacht" aktiv

  Szenario: Nachts trägt eine Warnung ein Zeichen, ein Hinweis keine Füllung
    Dann trägt die Marke "älter als 24 h" ein Warnzeichen
    Und ist die Marke "kürzlich eingetroffen" nicht farbig gefüllt

  Szenario: Nachts dunkelt ein offenes Fenster die Seite ab
    Wenn ich auf "Mehr…" klicke
    Und ich auf "Entfernen" klicke
    Dann sehe ich den Dialog "Meldung entfernen?"
    Dann dunkelt das offene Fenster die Seite deutlich ab
