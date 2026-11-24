# language: de
# Neu im Meldekopf (ADR-009, docs/architektur.md): keine Vorlage im Erfassungsbogen.
Funktionalität: Zweites Gerät koppeln
  Am Meldekopf im Fahrzeug scannt das Telefon draußen, der Rechner zeigt die
  Übersicht. Beide führen dieselbe Sammlung und verbinden sich direkt im selben
  Netz, ohne Server und ohne Internet. Zwei Codes stellen die Verbindung her:
  Das erste Gerät zeigt einen, das zweite scannt ihn und zeigt die Antwort.

  Im Prüfstand ersetzt der Handscanner-Weg die Kamera: Der Code wird getippt,
  wie ein USB-Scanner ihn tippt. Beide Geräte sind zwei getrennte Browser-
  Profile; die Verbindung zwischen ihnen ist echt.

  Grundlage:
    Angenommen auf dem Gerät liegt die Sammlung "Hochwasser Weser" mit dem alten Bogen
    Und ein zweites Gerät hat die App geöffnet

  Szenario: Zwei Codes koppeln die Geräte, die Sammlung erscheint auf dem zweiten
    Wenn ich auf "Zweites Gerät koppeln…" klicke
    Dann sehe ich den Dialog "Zweites Gerät koppeln"
    Wenn das zweite Gerät meinen Kopplungs-Code scannt
    Dann zeigt das zweite Gerät den Dialog "Antwort-Code für das erste Gerät"
    Wenn ich den Antwort-Code des zweiten Geräts scanne
    Dann meldet die Kopplungsleiste "Gekoppelt mit zweitem Gerät"
    Und meldet die Kopplungsleiste des zweiten Geräts "Gekoppelt mit zweitem Gerät"
    Und zeigt das zweite Gerät die Überschrift "Hochwasser Weser"
    Und zeigt das zweite Gerät den Text "THW Oldenburg"

  Szenario: Was das zweite Gerät scannt, steht auf der Übersicht des ersten
    Angenommen beide Geräte sind gekoppelt
    Dann zählt die Übersicht 1 Einheiten
    Wenn das zweite Gerät den Bogen der DLRG Wardenburg scannt
    Dann zählt die Übersicht 2 Einheiten
    Und führt die Übersicht die Einheit "DLRG Wardenburg"

  Szenario: Reißt die Verbindung, sagt es die Leiste, und das Gerät arbeitet weiter
    Angenommen beide Geräte sind gekoppelt
    Wenn das zweite Gerät die App schließt
    Dann meldet die Kopplungsleiste "Kopplung getrennt"
    Und meldet die Kopplungsleiste "bleibt auf diesem Gerät gespeichert"
    Und sehe ich die Schaltfläche "Neu koppeln…"
    Und zählt die Übersicht 1 Einheiten

  Szenario: Ein Bogen statt des Antwort-Codes wird erklärt, die Kopplung bleibt offen
    Wenn ich auf "Zweites Gerät koppeln…" klicke
    Und ich auf "Antwort scannen…" klicke
    Und ich statt des Antwort-Codes den QR-Code des alten Bogens scanne
    Dann meldet der Scanner "Das ist kein Kopplungs-Code."

  Szenario: Abbrechen beendet die Kopplung, bevor sie steht
    Wenn ich auf "Zweites Gerät koppeln…" klicke
    Und ich im Dialog auf "Abbrechen" klicke
    Dann ist kein Dialog offen
    Und zeigt die App keine Kopplungsleiste
