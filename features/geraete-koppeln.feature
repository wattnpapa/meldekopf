# language: de
# Neu im Meldekopf (ADR-009, docs/architektur.md): keine Vorlage im Erfassungsbogen.
Funktionalität: Zweites Gerät koppeln
  Am Meldekopf im Fahrzeug scannt das Telefon draußen, der Rechner zeigt die
  Übersicht. Das Telefon ist dabei ein reiner Sammler: Es schickt, was es
  aufnimmt, und bekommt die Lage nicht. Die Geräte verbinden sich direkt im
  selben Netz, ohne Server und ohne Internet. Ein Scan genügt: Das erste Gerät
  zeigt einen Code, das zweite scannt ihn, danach verbinden sich beide von
  selbst. Am ersten Gerät ist nichts zu scannen und nichts einzugeben, denn im
  Fahrzeug hat der Rechner oft weder Kamera noch Handscanner. Der Antwort-Code
  des zweiten Geräts bleibt der Ausweichweg.

  Im Prüfstand ersetzt der Handscanner-Weg die Kamera: Der Code wird getippt,
  wie ein USB-Scanner ihn tippt. Beide Geräte sind zwei getrennte Browser-
  Profile; die Verbindung zwischen ihnen ist echt.

  Grundlage:
    Angenommen auf dem Gerät liegt die Sammlung "Hochwasser Weser" mit dem alten Bogen
    Und ein zweites Gerät hat die App geöffnet

  Szenario: Ein Scan genügt: Das erste Gerät muss nichts scannen und nichts eingeben
    Wenn ich auf "Zweites Gerät koppeln…" klicke
    Dann sehe ich den Dialog "Zweites Gerät koppeln"
    Und meldet der Dialog "Die Geräte verbinden sich danach von selbst"
    Wenn das zweite Gerät meinen Kopplungs-Code scannt
    Dann meldet die Kopplungsleiste "Verbindung aktiv"
    Und meldet die Kopplungsleiste des zweiten Geräts "Verbindung aktiv"
    Und ist kein Dialog offen
    Und zeigt das zweite Gerät die Überschrift "Hochwasser Weser"
    Und zeigt das zweite Gerät den Text "Dieses Gerät sammelt"
    Und zeigt das zweite Gerät den Text "Von diesem Gerät aufgenommen (0)"
    Und zeigt das zweite Gerät "THW Oldenburg" nicht

  Szenario: Ausweichweg: Klappt es nicht von selbst, koppelt der Antwort-Code
    Angenommen das erste Gerät öffnet keine Türen zum Anklopfen
    Wenn ich auf "Zweites Gerät koppeln…" klicke
    Dann meldet der Dialog "hier „Antwort scannen…“ tippen"
    Wenn das zweite Gerät meinen Kopplungs-Code scannt
    Dann zeigt das zweite Gerät den Dialog "Antwort-Code für das erste Gerät"
    Wenn ich den Antwort-Code des zweiten Geräts scanne
    Dann meldet die Kopplungsleiste "Verbindung aktiv"
    Und meldet die Kopplungsleiste des zweiten Geräts "Verbindung aktiv"

  Szenario: Was das zweite Gerät scannt, steht auf der Übersicht des ersten
    Angenommen beide Geräte sind gekoppelt
    Dann zählt die Übersicht 1 Einheiten
    Wenn das zweite Gerät den Bogen der DLRG Wardenburg scannt
    Dann zählt die Übersicht 2 Einheiten
    Und führt die Übersicht die Einheit "DLRG Wardenburg"
    Und zeigt das zweite Gerät den Text "Von diesem Gerät aufgenommen (1)"
    Und zeigt das zweite Gerät den Text "✓ übertragen"
    Und zeigt das zweite Gerät den Text "Alles übertragen"

  Szenario: Schläft das zweite Gerät ein, verbindet es sich beim Aufwachen von selbst wieder
    Angenommen beide Geräte sind gekoppelt
    Wenn die Verbindung am zweiten Gerät abreißt
    Dann meldet die Kopplungsleiste des zweiten Geräts "Verbindung aktiv"
    Wenn das zweite Gerät den Bogen der DLRG Wardenburg scannt
    Dann zählt die Übersicht 2 Einheiten
    Und meldet die Kopplungsleiste "Verbindung aktiv"

  Szenario: Auch nach mehrmaligem Abreißen kommt die Verbindung ohne neuen Code zurück
    Angenommen beide Geräte sind gekoppelt
    Wenn die Verbindung am zweiten Gerät abreißt
    Und die Verbindung am zweiten Gerät abreißt
    Und die Verbindung am zweiten Gerät abreißt
    Und das zweite Gerät den Bogen der DLRG Wardenburg scannt
    Dann zählt die Übersicht 2 Einheiten

  Szenario: Trennt das zweite Gerät, sagt es die Leiste, und das erste arbeitet weiter
    Angenommen beide Geräte sind gekoppelt
    Wenn das zweite Gerät die Kopplung trennt
    Dann meldet die Kopplungsleiste "Verbindung getrennt"
    Und meldet die Kopplungsleiste "Das andere Gerät hat die Kopplung getrennt"
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
