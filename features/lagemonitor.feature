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
    Und ich "Angaben vom Zettel (optional)" aufklappe
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
    Und ich "Angaben vom Zettel (optional)" aufklappe
    Und ich in das Feld "Eingetroffen um (vom Meldeblock)" die Uhrzeit vor 60 Minuten eintrage
    Und ich das Feld "Ort der Einheit (Pflicht)" mit "Brake" fülle
    Und ich auf "Mannschaft: erhöhen" klicke
    Und ich auf "In Einsatz übernehmen" klicke
    Dann sehe ich die Überschrift "Einheiten (2 gemeldet"
    Wenn ich den Lagemonitor öffne
    Dann zeigt der Lagemonitor "nachgetragen, da seit"
    Und zeigt der Lagemonitor "gerade eben" nicht

  # Neu im Meldekopf: die Tafel als zweite Ansicht, für den großen Fernseher im
  # Führungsfahrzeug, auf den alle schauen. Jede Einheit steht mit taktischem
  # Zeichen an festem Platz in ihrem Zug; nichts rückt nach oben, weil es zuletzt
  # gemeldet hat.
  Szenario: Die Tafel stellt jede Einheit mit Zeichen an ihren Platz im Zug
    Wenn ich auf "Einheit manuell erfassen…" klicke
    Und ich "Angaben vom Zettel (optional)" aufklappe
    Und ich das Feld "Zug / Verband (laut Zettel)" mit "2.Zug" fülle
    Und ich das Feld "Ort der Einheit (Pflicht)" mit "Brake" fülle
    Und ich auf "Mannschaft: erhöhen" klicke
    Und ich auf "Mannschaft: erhöhen" klicke
    Und ich auf "In Einsatz übernehmen" klicke
    Dann sehe ich die Überschrift "Einheiten (2 gemeldet"
    Wenn ich für den Fernseher die Ansicht "Tafel" wähle
    Und ich den Lagemonitor öffne
    Dann zeigt der Lagemonitor die Tafel
    Und zeigt der Lagemonitor "2. Zug"
    Und zeigt der Lagemonitor "ohne Zug"
    Und zeigt der Lagemonitor "Brake"
    Und zeigt der Lagemonitor "Unterführer"
    Und zeigt der Lagemonitor "Verpflegung"
    Und trägt jede Einheit der Tafel ihr taktisches Zeichen
    Und stehen alle Einheiten der Tafel ganz im Bild

  # Der Fernseher hängt an der Wand: Wer am Arbeitsplatz die Ansicht wählt,
  # stellt ihn um, ohne mit der Maus auf den zweiten Bildschirm zu müssen.
  Szenario: Die Wahl am Arbeitsplatz stellt den offenen Fernseher um
    Wenn ich den Lagemonitor öffne
    Dann zeigt der Lagemonitor die Zeilen
    Wenn ich für den Fernseher die Ansicht "Tafel" wähle
    Dann zeigt der Lagemonitor die Tafel
    Wenn ich im Lagemonitor auf "Ansicht: Zeilen" klicke
    Dann zeigt der Lagemonitor die Zeilen
    Und ist für den Fernseher die Ansicht "Zeilen" gewählt

  # Die volle Tafel: viele Einheiten, ein langer Zugname, Sofortbedarf an den meisten Karten. Vorgefallen (Durchsicht
  # nach dem ersten Stand): Bedarfsmarken liefen über Typ und Zeichen, „(Fortsetzung)" im Gruppenkopf war nie zu sehen.
  Szenario: Auf der vollen Tafel überdeckt nichts, und geteilte Züge sind als Fortsetzung zu erkennen
    Angenommen auf dem Gerät liegt eine Lage mit 30 Einheiten in 2 Zügen, viele mit Sofortbedarf
    Dann sehe ich die Überschrift "Einheiten (30 gemeldet"
    Wenn ich für den Fernseher die Ansicht "Tafel" wähle
    Und ich den Lagemonitor öffne
    Dann zeigt der Lagemonitor die Tafel
    Und zeigt der Lagemonitor "(Fortsetzung)"
    Und zeigt der Lagemonitor "Ruhezeit"
    Und trägt jede Einheit der Tafel ihr taktisches Zeichen
    Und stehen alle Einheiten der Tafel ganz im Bild
    Und überdeckt auf der Tafel keine Angabe eine andere
