# language: de
# Neu im Meldekopf: Der Lagemonitor des Erfassungsbogens hatte keine
# Verhaltenstests. Die Szenarien folgen der Audit-Runde 1 des Meldekopfs
# (docs/audits/runde-1/fuehrungssicht.md, F3 und F4).
Funktionalität: Lagemonitor für den Fernseher
  Als Führungskraft sehe ich am Fernseher, wie stark welche Einheit ist, was
  gebraucht wird und wer wirklich gerade eingetroffen ist, ohne das Tablet.

  Grundlage:
    Angenommen auf dem Gerät liegt die Sammlung "Hochwasser Weser" mit dem alten Bogen
    Dann sehe ich die Überschrift "Einheiten (1 gemeldet"

  # F4: Die Tabelle hatte keine Gesamtstärke, Bedarf fehlte ganz.
  Szenario: Der Lagemonitor zeigt Gesamtstärke und Bedarf
    Wenn ich auf "Einheit manuell erfassen…" klicke
    Und ich das Feld "Ort der Einheit (Pflicht)" mit "Brake" fülle
    Und ich auf "Mannschaft: erhöhen" klicke
    Und ich auf "Mannschaft: erhöhen" klicke
    Und ich auf "In Einsatz übernehmen" klicke
    Dann sehe ich die Überschrift "Einheiten (2 gemeldet"
    Wenn ich den Lagemonitor öffne
    Dann zeigt der Lagemonitor "Ges."
    Und zeigt der Lagemonitor "Brake"
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
  # Zeichen an festem Platz bei ihrer Organisation; nichts rückt nach oben, weil es
  # zuletzt gemeldet hat.
  Szenario: Die Tafel stellt jede Einheit mit Zeichen an ihren Platz
    Wenn ich auf "Einheit manuell erfassen…" klicke
    Und ich das Feld "Ort der Einheit (Pflicht)" mit "Brake" fülle
    Und ich auf "Mannschaft: erhöhen" klicke
    Und ich auf "Mannschaft: erhöhen" klicke
    Und ich auf "In Einsatz übernehmen" klicke
    Dann sehe ich die Überschrift "Einheiten (2 gemeldet"
    Wenn ich für den Fernseher die Darstellung "Tafel" wähle
    Und ich den Lagemonitor öffne
    Dann zeigt der Lagemonitor die Tafel
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
    Wenn ich für den Fernseher die Darstellung "Tafel" wähle
    Dann zeigt der Lagemonitor die Tafel
    Wenn ich im Lagemonitor auf "Zeilen zeigen" klicke
    Dann zeigt der Lagemonitor die Zeilen
    Und ist für den Fernseher die Darstellung "Zeilen" gewählt

  # Die volle Tafel: viele Einheiten, Sofortbedarf an den meisten Karten. Vorgefallen (Durchsicht
  # nach dem ersten Stand): Bedarfsmarken liefen über Typ und Zeichen, „(Fortsetzung)" im Gruppenkopf war nie zu sehen.
  Szenario: Auf der vollen Tafel überdeckt nichts, und geteilte Gruppen sind als Fortsetzung zu erkennen
    Angenommen auf dem Gerät liegt eine Lage mit 30 Einheiten aus 2 Organisationen, viele mit Sofortbedarf
    Dann sehe ich die Überschrift "Einheiten (30 gemeldet"
    Wenn ich für den Fernseher die Darstellung "Tafel" wähle
    Und ich den Lagemonitor öffne
    Dann zeigt der Lagemonitor die Tafel
    Und zeigt der Lagemonitor "(Fortsetzung)"
    Und zeigt der Lagemonitor "Ruhezeit"
    Und trägt jede Einheit der Tafel ihr taktisches Zeichen
    Und stehen alle Einheiten der Tafel ganz im Bild
    Und überdeckt auf der Tafel keine Angabe eine andere

  # Namen bleiben erkennbar. Vorgefallen (Foto vom Fernseher bei einer Übung): Es
  # standen „T… (Fortsetzung)“, dreimal „DRK-Kreisverband B…“, „Freiwilli… Lenglern“,
  # „Bundeswehr Panz…“ und „THW Gieboldehau…“ da. Passt der volle Name nicht, steht
  # die übliche Kurzform da; fehlt nur wenig, läuft der Name etwas kleiner.
  Szenario: Auf der Tafel sind alle Namen erkennbar
    Angenommen auf dem Gerät liegt die Übung vom Fernseher mit ihren langen Namen
    Wenn ich für den Fernseher die Darstellung "Tafel" wähle
    Und ich den Lagemonitor öffne
    Und ich den Fernseher auf 2000 x 1127 stelle
    Dann zeigt der Lagemonitor die Tafel
    Und steht auf der Tafel der Name "FF Lenglern"
    Und steht auf der Tafel der Name "DRK-KV Buchenrode"
    Und steht auf der Tafel der Name "Bw Panzerpionierzug"
    Und steht auf der Tafel der Name "THW Gieboldehausen"
    Und stehen alle Einheiten der Tafel ganz im Bild
    Und überdeckt auf der Tafel keine Angabe eine andere
    Wenn ich den Fernseher auf 1280 x 720 stelle
    Dann stehen alle Einheiten der Tafel ganz im Bild
    Und überdeckt auf der Tafel keine Angabe eine andere

  # Eine kleine Lage steht in der breiten Karte; ein langer Funkrufname ist bei der Vorgabebreite
  # der Namensspalte gekürzt, und die Tafel misst nach. Vorgefallen (Gegenprüfung): Sie maß die
  # Hülle des Funkrufnamens, die Spalte sank je Bild um einen Pixel, und nach 50 Durchgängen
  # brach die Tafel ab und der Fernseher zeigte die Zeilen.
  Szenario: Ein gekürzter Funkrufname bringt die breite Tafel nicht zum Absturz
    Angenommen auf dem Gerät liegt eine kleine Lage mit einem langen Funkrufnamen
    Wenn ich für den Fernseher die Darstellung "Tafel" wähle
    Und ich den Lagemonitor öffne
    Dann zeigt der Lagemonitor die Tafel
    Und steht die Tafel in der Fassung "breit" und bleibt stehen
    Und zeigt der Lagemonitor "14/43/1"
    Wenn ich den Fernseher auf 3840 x 2160 stelle
    Dann steht die Tafel in der Fassung "breit" und bleibt stehen
    Wenn ich den Fernseher auf 1280 x 720 stelle
    Dann steht die Tafel in der Fassung "breit" und bleibt stehen
    Und überdeckt auf der Tafel keine Angabe eine andere

  # Die volle Randspalte: Bedarf, abgerückte Einheiten und frische Bewegungen
  # zugleich, die Tafel blättert. Vorgefallen (Gegenprüfung): Von „Zuletzt" blieb
  # ein Textrest über dem Fuß. „Zuletzt" weicht ganz oder behält seine
  # Überschrift; Datenstand und Knöpfe bleiben im Bild, auch auf dem kleinsten
  # Fernseher.
  Szenario: Auf der vollen Tafel bleibt die Randspalte geordnet
    Angenommen auf dem Gerät liegt eine Lage mit 64 Einheiten aus 4 Organisationen, viele mit Sofortbedarf, 4 davon abgerückt
    Dann sehe ich die Überschrift "Einheiten (64 gemeldet"
    Wenn ich für den Fernseher die Darstellung "Tafel" wähle
    Und ich den Lagemonitor öffne
    Dann zeigt der Lagemonitor die Tafel
    Und zeigt der Lagemonitor "Seite 1 von"
    Und steht die Randspalte der Tafel geordnet im Bild
    Wenn ich den Fernseher auf 1280 x 720 stelle
    Dann steht die Randspalte der Tafel geordnet im Bild
    Und stehen alle Einheiten der Tafel ganz im Bild
