# language: de
# Herkunft: neu in der Meldekopf-App (Rollenaudit Runde 2: Meldekopf P1-1,
# UEAL U3, Bereitstellungsraum P1-1).
Funktionalität: Angaben einer von Hand erfassten Einheit berichtigen
  Unter Zeitdruck wird der falsche Einheitstyp gewählt oder die Führungskraft
  vergessen. Früher blieb das stehen; wer die Einheit deshalb noch einmal
  erfasste, zählte sie doppelt. „Angaben berichtigen…" ändert die Einheit
  unter ihrer Nummer, und die Suche findet sie danach über ihren Funkrufnamen.

  Grundlage:
    Angenommen auf dem Gerät liegt die Sammlung "Hochwasser Weser" mit dem alten Bogen
    Wenn ich auf "Einheit manuell erfassen…" klicke
    Und ich das Feld "Organisation" auf "DLRG" stelle
    Und ich das Feld "Ort der Einheit (Pflicht)" mit "Wardenburg" fülle
    Und ich auf "Mannschaft: erhöhen" klicke
    Und ich auf "Mannschaft: erhöhen" klicke
    Und ich auf "In Einsatz übernehmen" klicke
    Dann sehe ich die Überschrift "Einheiten (2 gemeldet"

  Szenario: Die Berichtigung ändert die Einheit und legt keine zweite an
    Wenn ich bei der Einheit "DLRG Wardenburg" auf "Mehr…" klicke
    Und ich bei der Einheit "DLRG Wardenburg" auf "Angaben berichtigen…" klicke
    Dann sehe ich die Überschrift "Angaben berichtigen"
    Und steht im Feld "Ort der Einheit (Pflicht)" der Wert "Wardenburg"
    Wenn ich das Feld "Name" mit "Lang" fülle
    Und ich das Feld "Funkrufname (optional)" mit "Pelikan Wardenburg 1" fülle
    Und ich auf "Mannschaft: erhöhen" klicke
    Und ich auf "Berichtigung übernehmen" klicke
    Dann sehe ich die Überschrift "Einheiten (2 gemeldet"
    Und meldet die Kopfleiste 2 Einheiten
    Und sehe ich den Hinweis "Stärke 0 / 0 / 3 // 3"
    Und sehe ich den Hinweis "Angaben am Meldekopf berichtigt"
    Und sehe ich den Hinweis "Funkrufname: Pelikan Wardenburg 1"

  Szenario: Die Suche findet die Einheit über den Funkrufnamen der Führungskraft
    Wenn ich bei der Einheit "DLRG Wardenburg" auf "Mehr…" klicke
    Und ich bei der Einheit "DLRG Wardenburg" auf "Angaben berichtigen…" klicke
    Und ich das Feld "Funkrufname (optional)" mit "Pelikan Wardenburg 1" fülle
    Und ich auf "Berichtigung übernehmen" klicke
    Und ich das Feld "Suche" mit "pelikan" fülle
    Dann führt die Einheitenliste genau 1 Einheiten
    Und führt die Einheitenliste "DLRG Wardenburg" an Stelle 1

  Szenario: Abbrechen lässt die Einheit, wie sie ist
    Wenn ich bei der Einheit "DLRG Wardenburg" auf "Mehr…" klicke
    Und ich bei der Einheit "DLRG Wardenburg" auf "Angaben berichtigen…" klicke
    Und ich auf "Mannschaft: erhöhen" klicke
    Und ich auf "Abbrechen, nichts ändern" klicke
    Dann sehe ich den Dialog "Berichtigung verwerfen?"
    Wenn ich im Dialog auf "Verwerfen" klicke
    Dann sehe ich die Überschrift "Einheiten (2 gemeldet"
    Und sehe ich den Hinweis "Stärke 0 / 0 / 2 // 2"

  Szenario: Ein eingelesener Bogen wird nicht am Meldekopf berichtigt
    Wenn ich bei der Einheit "THW" auf "Mehr…" klicke
    Dann sehe ich die Schaltfläche "Angaben berichtigen…" nicht
