# language: de
# Herkunft: neu in der Meldekopf-App.
Funktionalität: Fahrzeuge am Tor des Bereitstellungsraums
  Im Bereitstellungsraum fahren Fahrzeuge über den Tag weg und kommen wieder,
  ohne dass die Einheit abrückt. Der Helfer am Tor vermerkt je Fahrzeug, ob es
  rausfährt oder zurückkommt: über das Kennzeichen, mit der Kamera gelesen oder
  getippt. Die Stärke der Einheit bleibt davon unberührt. Der Prüfstand hat
  keine Kamera; geprüft wird der Weg über das Tippen, der immer gehen muss.

  Grundlage:
    Angenommen auf dem Gerät liegt die Sammlung "Hochwasser Hunte" mit einer Einheit und den Fahrzeugen "THW-81234, THW-81284"
    Wenn ich auf "Tor: Fahrzeuge raus und rein…" klicke
    Dann sehe ich den Dialog "Tor: Fahrzeuge raus und rein"
    Und sehe ich den Hinweis "0 von 2 Fahrzeugen unterwegs"

  Szenario: Ohne Kamera bleibt das Tippen
    Dann sehe ich den Hinweis "Kennzeichen unten eintippen."

  Szenario: Ein Fahrzeug fährt raus und kommt zurück
    Wenn ich im Dialog "Kennzeichen, Einheit oder Funkrufname" mit "284" fülle
    Und ich am Tor das Fahrzeug "THW-81284" wähle
    Dann sehe ich den Hinweis "Jetzt: im Bereitstellungsraum"
    Wenn ich im Dialog auf "Fährt raus" klicke
    Dann sehe ich den Hinweis "1 von 2 Fahrzeugen unterwegs"
    Und sehe ich den Hinweis "THW-81284"
    Wenn ich im Dialog auf "Schließen" klicke
    Dann ist kein Dialog offen
    Und sehe ich den Hinweis "2 Fahrzeuge, davon 1 unterwegs"
    Und sehe ich den Hinweis "1 von 2 Fahrzeugen unterwegs:"
    Wenn ich auf "Tor: Fahrzeuge raus und rein…" klicke
    Und ich am Tor das Fahrzeug "THW-81284" wähle
    Dann sehe ich den Hinweis "Jetzt: unterwegs seit"
    Wenn ich im Dialog auf "Kommt zurück" klicke
    Dann sehe ich den Hinweis "0 von 2 Fahrzeugen unterwegs"

  Szenario: Eine falsch vermerkte Bewegung lässt sich zurücknehmen
    Wenn ich am Tor das Fahrzeug "THW-81234" wähle
    Und ich im Dialog auf "Fährt raus" klicke
    Dann sehe ich den Hinweis "1 von 2 Fahrzeugen unterwegs"
    Wenn ich im Dialog auf "Rückgängig" klicke
    Dann sehe ich den Hinweis "0 von 2 Fahrzeugen unterwegs"
