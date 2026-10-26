# language: de
# Neu im Meldekopf, nach der Audit-Runde 1 (docs/audits/runde-1/
# fehler-und-wiederanlauf.md, F3). Die Sammlung liegt so auf dem Gerät, wie
# sie nach „Bögen einlesen…" vom Ausdruck aussieht.
Funktionalität: Lage vom Papier abgleichen
  Nach einem Ausfall lese ich die Bögen vom Ausdruck ein und trage vom Blatt
  nach, was nur dort steht: Nummer, Eintreffzeit, Status, Zug.

  Grundlage:
    Angenommen auf dem Gerät liegt die Sammlung "Hochwasser Weser" mit dem alten Bogen, vom Papier eingelesen
    Dann sehe ich die Überschrift "Einheiten (1 gemeldet"

  # F3: Ein Tagesdreher vom Blatt ging ohne Rückfrage in die Lage.
  Szenario: Eine Eintreffzeit in der Zukunft fragt vor dem Übernehmen
    Wenn ich auf "Lage vom Papier abgleichen…" klicke
    Und ich im Feld "Eingetroffen am (leer = Zeit des Einlesens, nicht bestätigt)" Datum und Uhrzeit in 24 Stunden eintrage
    Und ich auf "Abgleich übernehmen" klicke
    Dann sehe ich den Dialog "Stimmt die Zeit?"
    Wenn ich im Dialog auf "Zeiten korrigieren" klicke
    Dann sehe ich die Überschrift "Lage vom Papier abgleichen (1)"
