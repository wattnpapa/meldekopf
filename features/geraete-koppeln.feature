# language: de
# Neu im Meldekopf (ADR-009, docs/architektur.md): keine Vorlage im Erfassungsbogen.
Funktionalität: Zweites Gerät koppeln
  Am Meldekopf im Fahrzeug scannt das Telefon draußen, der Rechner zeigt die
  Übersicht. Der Rechner ist die Zentrale, sein Stand ist maßgeblich: Jedes
  verbundene Telefon schickt, was es aufnimmt, und bekommt laufend den Stand
  der Zentrale. Die Geräte verbinden sich direkt im
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
    Und zeigt das zweite Gerät den Text "Stand der Zentrale (1 Einheit)"
    Und zeigt das zweite Gerät den Text "THW Oldenburg"

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
    Und zeigt das zweite Gerät den Text "Stand der Zentrale (2 Einheiten)"
    Und zeigt das zweite Gerät den Text "DLRG Wardenburg"
    Und zeigt das zweite Gerät den Text "Auf dem Stand der Zentrale"

  Szenario: Was ohne Verbindung aufgenommen wurde, wird nachgesendet
    Angenommen beide Geräte sind gekoppelt
    Wenn das erste Gerät nicht erreichbar ist
    Und das zweite Gerät den Bogen der DLRG Wardenburg scannt
    Dann zeigt das zweite Gerät den Text "… wartet"
    Und zeigt das zweite Gerät den Text "davon 1 noch nicht übertragen"
    Wenn das erste Gerät wieder erreichbar ist
    Dann zählt die Übersicht 2 Einheiten
    Und zeigt das zweite Gerät den Text "Auf dem Stand der Zentrale"
    Und zeigt das zweite Gerät den Text "Stand der Zentrale (2 Einheiten)"

  Szenario: Was die Zentrale ändert, steht danach auf dem Telefon
    Angenommen beide Geräte sind gekoppelt
    Wenn das zweite Gerät den Bogen der DLRG Wardenburg scannt
    Dann zählt die Übersicht 2 Einheiten
    Wenn ich die Einheit "DLRG Wardenburg" an der Zentrale entferne
    Dann zählt die Übersicht 1 Einheiten
    Und zeigt das zweite Gerät den Text "Stand der Zentrale (1 Einheit)"

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

  Szenario: Lädt das zweite Gerät seine Seite neu, verbindet es sich ohne neuen Scan
    Angenommen beide Geräte sind gekoppelt
    Wenn das zweite Gerät den Bogen der DLRG Wardenburg scannt
    Dann zählt die Übersicht 2 Einheiten
    Wenn das zweite Gerät seine Seite neu lädt
    Dann meldet die Kopplungsleiste des zweiten Geräts "Verbindung aktiv"
    Und zeigt das zweite Gerät die Überschrift "Hochwasser Weser"
    Und zeigt das zweite Gerät den Text "Stand der Zentrale (2 Einheiten)"
    Und zeigt das zweite Gerät den Text "✓ in der Lage"
    Und meldet die Kopplungsleiste "Verbindung aktiv"

  Szenario: Auch nach zweimaligem Neuladen des zweiten Geräts steht die Verbindung wieder
    Angenommen beide Geräte sind gekoppelt
    Wenn das zweite Gerät seine Seite neu lädt
    Und das zweite Gerät seine Seite neu lädt
    Und das zweite Gerät den Bogen der DLRG Wardenburg scannt
    Dann zählt die Übersicht 2 Einheiten

  Szenario: Lädt das erste Gerät seine Seite neu, findet es das zweite ohne neuen Scan wieder
    Angenommen beide Geräte sind gekoppelt
    Wenn das erste Gerät seine Seite neu lädt
    Dann meldet die Kopplungsleiste "Verbindung aktiv"
    Und meldet die Kopplungsleiste des zweiten Geräts "Verbindung aktiv"
    Wenn das zweite Gerät den Bogen der DLRG Wardenburg scannt
    Dann zählt die Übersicht 2 Einheiten

  Szenario: Erst lädt das erste Gerät neu, dann das zweite: Beide finden sich jedes Mal wieder
    Angenommen beide Geräte sind gekoppelt
    Wenn das erste Gerät seine Seite neu lädt
    Dann meldet die Kopplungsleiste "Verbindung aktiv"
    Wenn das zweite Gerät seine Seite neu lädt
    Dann meldet die Kopplungsleiste des zweiten Geräts "Verbindung aktiv"
    Wenn das erste Gerät seine Seite neu lädt
    Dann meldet die Kopplungsleiste "Verbindung aktiv"
    Wenn das zweite Gerät den Bogen der DLRG Wardenburg scannt
    Dann zählt die Übersicht 2 Einheiten

  Szenario: Laden beide Geräte zugleich neu, sagt das erste, dass es das zweite sucht
    Angenommen beide Geräte sind gekoppelt
    Wenn beide Geräte ihre Seite zugleich neu laden
    Dann meldet die Kopplungsleiste "Verbindung unterbrochen"
    Und meldet die Kopplungsleiste des zweiten Geräts "Verbindung unterbrochen"

  Szenario: Nach „Kopplung trennen“ setzt das zweite Gerät nichts fort
    Angenommen beide Geräte sind gekoppelt
    Wenn das zweite Gerät die Kopplung trennt
    Und das zweite Gerät seine Seite neu lädt
    Dann zeigt das zweite Gerät keine Kopplung

  Szenario: Trennt das zweite Gerät, sagt es die Leiste, und das erste arbeitet weiter
    Angenommen beide Geräte sind gekoppelt
    Wenn das zweite Gerät die Kopplung trennt
    Dann meldet die Kopplungsleiste "Verbindung getrennt"
    Und meldet die Kopplungsleiste "hat die Kopplung getrennt"
    Und meldet die Kopplungsleiste "bleibt auf diesem Gerät gespeichert"
    Und sehe ich die Schaltfläche "Neu koppeln…"
    Und zählt die Übersicht 1 Einheiten

  Szenario: Zwei Telefone sammeln für eine Zentrale, jedes sieht über sie, was das andere aufnimmt
    Angenommen beide Geräte sind gekoppelt
    Und ein drittes Gerät hat die App geöffnet
    Wenn ich auf "Weiteres Gerät koppeln…" klicke
    Und das dritte Gerät meinen Kopplungs-Code scannt
    Dann meldet die Kopplungsleiste "2 von 2 Sammlern verbunden"
    Und meldet die Kopplungsleiste des dritten Geräts "Verbindung aktiv"
    Wenn das zweite Gerät den Bogen der DLRG Wardenburg scannt
    Und das dritte Gerät den Bogen der Feuerwehr Aschhausen scannt
    Dann zählt die Übersicht 3 Einheiten
    Und meldet die Kopplungsleiste des zweiten Geräts "Verbindung aktiv"
    Und zeigt das dritte Gerät den Text "Stand der Zentrale (3 Einheiten)"
    Und zeigt das dritte Gerät den Text "DLRG Wardenburg"

  Szenario: Jedes Telefon nennt seinen Namen, und die Leiste sagt, welches fehlt
    Angenommen beide Geräte sind gekoppelt
    Und ein drittes Gerät hat die App geöffnet
    Wenn ich auf "Weiteres Gerät koppeln…" klicke
    Und das dritte Gerät meinen Kopplungs-Code scannt
    Und das dritte Gerät sich "Eingang Nord" nennt
    Dann meldet die Kopplungsleiste "Eingang Nord"
    Wenn die Verbindung am dritten Gerät abreißt und es nicht zurückfindet
    Dann meldet die Kopplungsleiste "1 von 2 Sammlern verbunden"
    Und meldet die Kopplungsleiste "Eingang Nord unterbrochen"
    Wenn das zweite Gerät den Bogen der DLRG Wardenburg scannt
    Dann zählt die Übersicht 2 Einheiten

  Szenario: Trennt ein Telefon, bleibt das andere verbunden
    Angenommen beide Geräte sind gekoppelt
    Und ein drittes Gerät hat die App geöffnet
    Wenn ich auf "Weiteres Gerät koppeln…" klicke
    Und das dritte Gerät meinen Kopplungs-Code scannt
    Dann meldet die Kopplungsleiste "2 von 2 Sammlern verbunden"
    Wenn das dritte Gerät die Kopplung trennt
    Dann meldet die Kopplungsleiste "Verbindung aktiv"
    Und meldet die Kopplungsleiste "1 von 2 Sammlern verbunden"
    Und meldet die Kopplungsleiste "hat die Kopplung getrennt"
    Wenn das zweite Gerät den Bogen der DLRG Wardenburg scannt
    Dann zählt die Übersicht 2 Einheiten

  Szenario: Lädt die Zentrale neu, findet sie beide Telefone ohne neuen Scan wieder
    Angenommen beide Geräte sind gekoppelt
    Und ein drittes Gerät hat die App geöffnet
    Wenn ich auf "Weiteres Gerät koppeln…" klicke
    Und das dritte Gerät meinen Kopplungs-Code scannt
    Dann meldet die Kopplungsleiste "2 von 2 Sammlern verbunden"
    Wenn das erste Gerät seine Seite neu lädt
    Dann meldet die Kopplungsleiste "2 von 2 Sammlern verbunden"
    Wenn das dritte Gerät den Bogen der Feuerwehr Aschhausen scannt
    Und das zweite Gerät den Bogen der DLRG Wardenburg scannt
    Dann zählt die Übersicht 3 Einheiten

  Szenario: Koppelt dasselbe Telefon neu, steht es nicht doppelt in der Liste
    Angenommen beide Geräte sind gekoppelt
    Wenn ich auf "Weiteres Gerät koppeln…" klicke
    Und das zweite Gerät meinen Kopplungs-Code scannt
    Dann meldet die Kopplungsleiste des zweiten Geräts "Verbindung aktiv"
    Und meldet die Kopplungsleiste "Verbindung aktiv"
    Und führt die Kopplungsleiste genau 1 Sammler

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
