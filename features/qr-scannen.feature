# language: de
Funktionalität: Bogen per QR-Code einlesen
  Als Meldekopf nehme ich fremde Bögen vom Display des anderen Geräts auf. Der
  Link-Weg (einsatz-sammlung.feature) prüft dieselbe Kodierung, nicht aber das
  Bild: Dekodierung und der Weg über die Datei-Auswahl laufen nur hier durch.

  Herkunft: Erfassungsbogen features/qr-scannen.feature (441811c). Den
  QR-Code zeigt hier kein eigener Bogen an; der Prüfstand erzeugt ihn.

  # Der genaue Fehlertext hängt am Grund (gesperrt, belegt, gar keine Kamera)
  # und damit an der Umgebung. Geprüft wird deshalb, was der Nutzer in JEDEM
  # dieser Fälle vorfindet: den USB-Handscanner samt Lebenszeichen, den Weg
  # über ein Bild und einen zweiten Versuch.
  Szenario: Ohne Kamera stehen Handscanner und Bild-Weg bereit
    Angenommen ich öffne die App
    Wenn ich auf "Bogen scannen…" klicke
    Dann sehe ich den Dialog "QR-Code scannen"
    Und sehe ich den Hinweis "Ohne Kamera: mit dem USB-Handscanner scannen"
    Und sehe ich den Hinweis "Bereit — warte auf den Handscanner"
    Und sehe ich den Datei-Knopf "QR aus Bild einlesen…"
    Und sehe ich die Schaltfläche "Kamera erneut versuchen"
    # Ohne angefangenen Mehrteiler heißt der Ausgang „Fertig“ (app.tsx).
    Wenn ich im Dialog "QR-Code scannen" auf "Fertig" klicke
    Dann sehe ich den Hinweis "Ohne Kamera: mit dem USB-Handscanner scannen" nicht
    Und sehe ich die Schaltfläche "Bogen scannen…"

  Szenario: Ein QR-Code aus einem Bild landet in einer neuen Sammlung
    Angenommen ich öffne die App
    Wenn ich auf "Bogen scannen…" klicke
    Und ich den QR-Code des alten Bogens über "QR aus Bild einlesen…" einlese
    Dann sehe ich den Dialog "Meldung von"
    Wenn ich im Dialog auf "Neue Einsatz-Sammlung anlegen und aufnehmen" klicke
    Und ich im Dialog "Name" mit "Bereitstellungsraum Ost" fülle
    Und ich im Dialog auf "Einsatz anlegen" klicke
    Dann sehe ich die Überschrift "Bereitstellungsraum Ost"
    Und sehe ich die Überschrift "Einheiten (1 gemeldet"
