# language: de
# Herkunft: neu in der Meldekopf-App.
Funktionalität: Fahrzeuge am Tor des Bereitstellungsraums
  Im Bereitstellungsraum fahren Fahrzeuge über den Tag weg und kommen wieder,
  ohne dass die Einheit abrückt. Der Helfer am Tor vermerkt je Fahrzeug, ob es
  rausfährt oder zurückkommt: über das Kennzeichen. Die Kamera liest es im
  Scanner mit, der auch die Bögen liest; ohne Kamera wird es getippt. Die Stärke der Einheit bleibt davon unberührt. Der Prüfstand hat
  keine Kamera; geprüft wird der Weg über das Tippen, der immer gehen muss.

  Grundlage:
    Angenommen auf dem Gerät liegt die Sammlung "Hochwasser Hunte" mit einer Einheit und den Fahrzeugen "THW-81234, THW-81284"

  Szenario: Der Scanner führt ohne Kamera zum Tippen
    Wenn ich auf "Bogen scannen…" klicke
    Und ich im Dialog auf "Kennzeichen tippen…" klicke
    Dann sehe ich den Dialog "Fahrzeuge am Tor"
    Und sehe ich den Hinweis "0 von 2 Fahrzeugen unterwegs"

  Szenario: Ein Fahrzeug fährt raus und kommt zurück
    Wenn ich auf "Fahrzeuge am Tor…" klicke
    Und ich im Dialog "Kennzeichen, Einheit oder Funkrufname" mit "284" fülle
    Und ich am Tor das Fahrzeug "THW-81284" wähle
    Dann sehe ich den Hinweis "Jetzt: im Bereitstellungsraum"
    Wenn ich im Dialog auf "Fährt raus" klicke
    Dann sehe ich den Hinweis "1 von 2 Fahrzeugen unterwegs"
    Und sehe ich den Hinweis "THW-81284"
    Wenn ich im Dialog auf "Schließen" klicke
    Dann ist kein Dialog offen
    Und sehe ich den Hinweis "2 Fahrzeuge, davon 1 unterwegs"
    Und sehe ich den Hinweis "1 von 2 Fahrzeugen unterwegs:"
    Wenn ich auf "Fahrzeuge am Tor…" klicke
    Und ich am Tor das Fahrzeug "THW-81284" wähle
    Dann sehe ich den Hinweis "Jetzt: unterwegs seit"
    Wenn ich im Dialog auf "Kommt zurück" klicke
    Dann sehe ich den Hinweis "0 von 2 Fahrzeugen unterwegs"

  Szenario: Eine falsch vermerkte Bewegung lässt sich zurücknehmen
    Wenn ich auf "Fahrzeuge am Tor…" klicke
    Und ich am Tor das Fahrzeug "THW-81234" wähle
    Und ich im Dialog auf "Fährt raus" klicke
    Dann sehe ich den Hinweis "1 von 2 Fahrzeugen unterwegs"
    Wenn ich im Dialog auf "Rückgängig" klicke
    Dann sehe ich den Hinweis "0 von 2 Fahrzeugen unterwegs"
