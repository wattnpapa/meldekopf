# language: de
# Neu im Meldekopf: Der Lagemonitor des Erfassungsbogens hatte keine
# Verhaltenstests. Die Szenarien folgen der Audit-Runde 1 des Meldekopfs
# (docs/audits/runde-1/fuehrungssicht.md, F3 und F4).
Funktionalität: Lagemonitor für den Fernseher
  Als Führungskraft sehe ich am Fernseher, wie stark welcher Zug ist, was
  gebraucht wird und wer wirklich gerade eingetroffen ist, ohne das Tablet.

  Grundlage:
    Angenommen auf dem Gerät liegt die Sammlung "Hochwasser Weser" mit dem alten Bogen
    Dann sehe ich die Überschrift "Einheiten (1 gemeldet"

  # F4: Die Tabelle hatte weder Zug noch Gesamt, Bedarf fehlte ganz.
  Szenario: Der Lagemonitor zeigt Zug, Gesamtstärke und Bedarf
    Wenn ich auf "Einheit manuell erfassen…" klicke
    Und ich das Feld "Zug / Verband (laut Zettel)" mit "2.Zug" fülle
    Und ich das Feld "Ort der Einheit (Pflicht)" mit "Brake" fülle
    Und ich auf "Mannschaft: erhöhen" klicke
    Und ich auf "Mannschaft: erhöhen" klicke
    Und ich auf "In Einsatz übernehmen" klicke
    Dann sehe ich die Überschrift "Einheiten (2 gemeldet"
    Wenn ich den Lagemonitor öffne
    Dann zeigt der Lagemonitor "Ges."
    Und zeigt der Lagemonitor "2. Zug"
    Und zeigt der Lagemonitor "ohne Zug"
    Und zeigt der Lagemonitor "Verpflegung"

  # F3: Ein Nachtrag vom Meldeblock stand als „Eingetroffen … vor 2 Min" da.
  Szenario: Eine nachgetragene Einheit steht mit ihrer Eintreffzeit am Fernseher
    Wenn ich auf "Einheit manuell erfassen…" klicke
    Und ich in das Feld "Eingetroffen um (vom Meldeblock)" die Uhrzeit vor 60 Minuten eintrage
    Und ich das Feld "Ort der Einheit (Pflicht)" mit "Brake" fülle
    Und ich auf "Mannschaft: erhöhen" klicke
    Und ich auf "In Einsatz übernehmen" klicke
    Dann sehe ich die Überschrift "Einheiten (2 gemeldet"
    Wenn ich den Lagemonitor öffne
    Dann zeigt der Lagemonitor "nachgetragen, da seit"
    Und zeigt der Lagemonitor "gerade eben" nicht
