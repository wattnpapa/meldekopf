# language: de
# Herkunft: Erfassungsbogen features/daten-und-anzeige.feature (Commit f2b77f1).
# Übernommen sind die Szenarien zu Anzeigemodus, Offline-Start und
# Pflichtangaben; Datensicherung und „Alle Daten löschen" kommen mit der
# Sammlung (Phase 2), die Android-Anmutung mit der Capacitor-Hülle (Phase 5).
Funktionalität: Darstellung, Offline-Start und Auskunft
  Die App läuft im Einsatz auch draußen und nachts, startet ohne Netz und
  nennt auf jeder Seite, wer sie anbietet.

  Szenario: Anzeigemodus umschalten und über den Neustart behalten
    Angenommen ich öffne die App
    Dann ist der Anzeigemodus "Standard" aktiv
    Wenn ich den Anzeigemodus "Feld" wähle
    Dann ist der Anzeigemodus "Feld" aktiv
    Wenn ich die Seite neu lade
    Dann ist der Anzeigemodus "Feld" aktiv
    Wenn ich den Anzeigemodus "Nacht" wähle
    Dann ist der Anzeigemodus "Nacht" aktiv

  # Rückmeldung aus Cuxhaven (August 2026, Erfassungsbogen): auf einem Android-
  # Gerät mit dunklem Systemdesign war der Hintergrund dunkel, die Schrift aber
  # schwarz. Seit dem Audit „Nacht und Sicht" startet die App bei dunklem
  # Systemdesign im eigenen, vollständig abgestimmten Modus „Dunkel" — geerbt
  # wird die Wahl, nicht einzelne Farben. Eine ausdrückliche Wahl hat Vorrang.
  Szenario: Dunkles Systemdesign lässt die App lesbar
    Angenommen mein Gerät auf dunkles Design eingestellt ist
    Und ich öffne die App
    Dann ist der Anzeigemodus "Dunkel" aktiv
    Und hebt sich jeder Text von seiner Fläche ab
    Und liegt die App auf dunklem Grund
    Wenn ich den Anzeigemodus "Standard" wähle
    Dann hebt sich jeder Text von seiner Fläche ab
    Wenn ich die Seite neu lade
    Dann ist der Anzeigemodus "Standard" aktiv
    Und hebt sich jeder Text von seiner Fläche ab

  Szenario: Feld und Nacht bleiben lesbar
    Angenommen ich öffne die App
    Wenn ich den Anzeigemodus "Feld" wähle
    Dann hebt sich jeder Text von seiner Fläche ab
    Wenn ich den Anzeigemodus "Nacht" wähle
    Dann hebt sich jeder Text von seiner Fläche ab
    Und liegt die App auf dunklem Grund

  Szenario: Ohne Netz startet die App weiter
    Angenommen ich öffne die App
    Wenn ich die App vom Netz trenne
    Und ich die Seite neu lade
    Dann sehe ich die Überschrift "Meldekopf"
    Und sehe ich die Überschrift "Im Aufbau"
    Und sehe ich den Hinweis "Funktioniert komplett offline"

  Szenario: Pflichtangaben sind aus der Fußzeile erreichbar
    Angenommen ich öffne die App
    Wenn ich auf "Impressum" klicke
    Dann sehe ich den Dialog "Impressum"
    Wenn ich im Dialog auf "Schließen" klicke
    Und ich auf "Datenschutz" klicke
    Dann sehe ich den Dialog "Datenschutz"
    Und sehe ich die Überschrift "1. Verantwortlicher"
    Wenn ich den Dialog mit Esc schließe
    Dann ist kein Dialog offen
