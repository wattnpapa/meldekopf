# Rollenaudit Runde 2: Zugtrupp-Helfer in der UEAL / Zugbefehlsstelle

Stand: 24.11.2026, gegen den Produktionsbuild (`vite preview`, Port 4173),
Code-Stand `main` (`93ef69d`). Reiner Prüfbericht, keine Codeänderung.

## Rolle

Zugtrupp-Helfer im THW in einer kleinen Führungsstelle: Untereinsatzabschnitts-
leitung bzw. Zugbefehlsstelle im MTW/FüKW. Führt für den Zugführer die
Kräfteübersicht des Abschnitts (wer ist unterstellt, Stärke x/y/z//g,
Fahrzeuge, Funkrufname, Ansprechpartner, Auftrag), nimmt Einheiten auf, die
Meldekopf oder Bereitstellungsraum zuweisen, gibt Stärkemeldungen nach oben und
beantwortet Rückfragen sofort. Daneben Funk, Einsatztagebuch, Lagekarte.
Laptop oder Tablet, viele Unterbrechungen, kein IT-Mensch.

## Vorgehen

Durchgespielt mit Playwright (Chromium) in eigenem Browser-Kontext, Laptop
1366×768, Tablet quer 1024×768, einmal Telefon 390×844; Skripte und Bilder
lagen außerhalb des Repos (Prüfstand). Lage: Einsatz „Hochwasser Hunte UEA 2
Nord", zuletzt 13 Meldungen:

- sieben Einheiten per Schnellerfassung (THW ZTr, B, FGr N, FGr WP, Feuerwehr,
  DRK, DLRG), teils mit Fahrzeugen, vegetarischer Verpflegung, Führungskraft,
  Telefon und Funkrufname;
- der alte v2-Bogen aus `features/fixtures.ts` per Link;
- zwei frisch erzeugte vollständige Bögen per Link (THW Wildeshausen B mit neun
  Personen, drei AGT, GKW mit Funkrufname, Sofortbedarf; JUH SEG Sanität),
  dazu eine Folgemeldung der Bergungsgruppe nach Ablösung (9 → 6);
- Stärke ändern, Abrücken, Auftrag/Notiz, Entfernen und Rückgängig,
  Verschieben;
- Lageblatt, Sammel-PDF, beide CSV, Blanko geladen und ausgewertet
  (`pdftotext`, CSV spaltenweise nachgerechnet);
- Lagemonitor in Zeilen und Tafel bei 1920×1080 und 1280×720;
- Übergabe an ein zweites, leeres Gerät per Sammel-PDF, beide Geräte getrennt
  weitergeführt, zurück zusammengeführt;
- zweite Sammlung der Art „Übung" daneben, Link-Eingang mit „Wohin damit?";
- Unterbrechung mitten in der Schnellerfassung (Neuladen ohne Verlassen des
  Felds), Offline (`context.setOffline(true)`, Neuladen, Erfassen, Lageblatt,
  Lagemonitor);
- Papier-Rückfall: fünf Seiten der Sammel-PDF als Bilder gerastert und über
  „Bögen einlesen…" eingelesen, Papier-Abgleich geöffnet;
- Einsatzende: Übergabe vermerken, beenden, Datensicherung, Einsatz löschen,
  Papierkorb, „Alle Daten löschen" bis zum Haken.

Jede Summe wurde von Hand gegengerechnet. Die Marken „ANONYMISIERT" und
„Stand vor 559 Tagen" stammen vom alten Prüfbogen und sind kein Befund; die
Marke „Stand vor 1 Std" an den zwei frisch erzeugten Bögen kommt aus der
Zeitzone des Prüfstands (Bogen in UTC erzeugt), ebenfalls kein Befund.

## Urteil

Die Zahlen auf dem Bildschirm, im Lageblatt, in der Übersicht-CSV und im
Lagemonitor stimmten in jedem Schritt (zehn Zwischenstände nachgerechnet,
siehe unten). Aufnahme, Folgemeldung, Abrücken, Übergabe an ein zweites Gerät
und das Zusammenführen sind für diese Rolle tragfähig, offline ohne Abstrich.
Ein Export rechnet falsch (U1). Am Laptop steht seit dem Abschluss-Block das
Unwichtigste oben (U2), und die häufigste Rückfrage der Rolle („Wer führt die
Einheit, wie erreiche ich sie?") beantwortet nur die Detailansicht (U3).

| Priorität | Anzahl |
| --- | --- |
| P0 | 1 |
| P1 | 2 |
| P2 | 10 |
| P3 | 7 |

Kennzeichnung: **neu** = in Runde 1 nicht berichtet; **bekannt, offen** = in
Runde 1 berichtet und dort als offen geführt; **Lücke der Rolle** = die App
hat die Funktion laut `PRODUCT.md` bewusst nicht.

## Befunde

### U1 – P0 – CSV „Alle Daten" meldet Verpflegung 1 statt der Stärke (neu)

- **Fundstelle:** „Alle Daten als CSV", Satzart „Einheit", Spalten
  „Verpflegung gesamt", „Verpflegung Fleisch", „Unterbringung M".
- **Beobachtung:** Bei jeder schnellerfassten Einheit, bei der vegetarisch und
  vegan auf 0 blieben, steht „Verpflegung gesamt" = 1 statt der Stärke: Nr. 1
  (Stärke 4) → 1, Nr. 3 (9) → 1, Nr. 5 (9) → 1, Nr. 7 (3) → 1. Einheiten mit
  einer vegetarischen Angabe stimmen (Nr. 2: 9, Nr. 4: 8, Nr. 6: 6). Summe der
  Spalte über die neun anwesenden Einheiten: **39 statt 58**. Bildschirm,
  Lageblatt und Übersicht-CSV sagen übereinstimmend 58. Offenbar zählt die
  Spalte dort nur die eine Person der Führungskraft. Zusätzlich steht bei allen
  sieben schnellerfassten Einheiten „Unterbringung M" = 1, obwohl keine
  Unterbringung angefordert und kein Geschlecht angegeben ist (siehe U5).
- **Nachstellen:** Einheit manuell erfassen, Stärke 0/2/7, Führungskraft mit
  Name, vegetarisch/vegan nicht anfassen, übernehmen. „Alle Daten als CSV"
  laden, Zeile der Einheit lesen.
- **Auswirkung im Einsatz:** Die Datei ist die Weitergabe mit allen Daten an
  den Stab. Wer dort die Spalte summiert, bestellt für 39 statt 58. Der Fehler
  trifft genau die Einheiten, die am Meldekopf am schnellsten aufgenommen
  werden.
- **Vorschlag:** In der Zeile „Einheit" bei „nur Stärke" die Verpflegung aus
  der Stärke rechnen wie Übersicht-CSV und Lageblatt; Unterbringung M/W/D leer
  lassen, wenn kein Geschlecht erfasst ist. Test: Summe der Spalte gleich der
  Summe der Übersicht-CSV.

### U2 – P1 – Am Laptop steht „Übergabe und Abschluss" über der Lage, Summe und Aufnahme rutschen unter den Bildschirmrand (neu)

- **Fundstelle:** Einsatzansicht ab etwa 1180 px Breite (geprüft 1180, 1280,
  1366, 1600, 1920; bei 1024 und 390 tritt es nicht auf).
- **Beobachtung:** Im zweispaltigen Raster (`main.einsatz-detail`,
  `display: grid`) tragen alle Blöcke eine feste Zeile (Seitenspalte und Liste
  Zeile 2, Ausgabe 3, Lagemonitor 4, Verwalten 5), nur
  `.karte.einsatz-abschluss` hat `grid-row: auto` und landet deshalb in
  Zeile 1, also ganz oben. Gemessen bei 1366×768: Abschluss-Block y = 206 bis
  540, Überschrift „Einheiten" y = 573, „Bogen scannen…" y = 803, erste Karte
  y = 891. Sobald eine Übergabe-PDF erzeugt wurde, wächst der Kopf um den
  gelben Hinweis; die Unterkante von „GESAMT" liegt dann bei y = 814. Auf dem
  ersten Bildschirm stehen fünf Zeilen „noch nicht" und „Einsatz als beendet
  markieren", aber weder Gesamtstärke noch ein Aufnahme-Knopf noch eine
  Einheit. Die Gesamtzahl bricht zudem in eine zweite Zeile um. Am Tablet
  (1024) und am Telefon ist die Reihenfolge richtig: Summe, Knöpfe, Bedarf.
- **Nachstellen:** Einsatz mit einer Einheit bei 1366×768 öffnen.
- **Auswirkung im Einsatz:** Die Frage „Wie viele hast du vorne?" kostet am
  Laptop jedes Mal Scrollen; der Knopf zum Beenden steht dort, wo die Hand
  zuerst hinkommt. Der Laptop ist das Hauptgerät dieser Rolle.
- **Vorschlag:** Dem Abschluss-Block im breiten Raster die Zeile nach dem
  Lagemonitor geben; die fünf Summenkacheln in einer Zeile halten. Szenario
  bei 1366×768: „GESAMT" und „Einheit manuell erfassen…" liegen im ersten
  Bildschirm. Das ist dieselbe Fehlerklasse wie der P0 der Runde 1 (eine
  Stilregel fehlt für eine Breite).

### U3 – P1 – Einheitsführer, Erreichbarkeit und Funkrufname nur in der Detailansicht (neu)

- **Fundstelle:** Kartensicht, Tabellensicht, Suche, Lagemonitor.
- **Beobachtung:** Die zugeklappte Karte zeigt Stärke, Zeiten und Auftrag,
  aber weder Führungskraft noch Telefon noch Funkrufname. Die Tabelle hat 25
  Spalten (darunter WC männlich/weiblich/divers, Gemisch), keine für
  Ansprechpartner oder Funkrufname. Die Suche findet einen Funkrufname nur,
  wenn er am Fahrzeug hängt („22/51" findet die per Link gekommene B
  Wildeshausen); der Funkrufname aus dem Feld „Funkrufname (optional)" der
  Schnellerfassung landet als Kontakt der Führungskraft und wird nicht
  gefunden („Heros", „22/51" → 0 Treffer bei Nr. 2, die genau so heißt). Auf
  dem Lagemonitor steht er aus demselben Grund nicht (Spalte „Funkrufname":
  „–"). Das Lageblatt dagegen hat die Spalte „Funkrufname / Rückruf" mit
  beidem. Dass die Suche keine Personennamen durchsucht, ist dokumentiert und
  hier nicht gemeint.
- **Nachstellen:** Schnellerfassung mit Führungskraft, Telefon, Funkrufname
  „Heros Oldenburg 22/51". Danach in der Liste nach „22/51" suchen; Karte und
  Tabelle ansehen.
- **Auswirkung im Einsatz:** „Wer führt die FGr N, wie erreiche ich ihn?" und
  „Wer ist Heros 22/51?" sind die Rückfragen, die in der Zugbefehlsstelle am
  Funk kommen. Jede kostet Suchen der Karte, „Details", Lesen einer
  Personaltabelle. Bei zehn Einheiten ist das ausgedruckte Lageblatt schneller
  als die App.
- **Vorschlag:** Eine Zeile „Führer: Name · Telefon · Funkrufname" auf der
  Karte (am eigenen Gerät, nicht am Lagemonitor) und eine Spalte in der
  Tabelle; den Funkrufname der Schnellerfassung als Funkrufname der Einheit
  führen, damit Suche, Lagemonitor und Tafel ihn zeigen.

### U4 – P2 – „Bedarf nicht erfasst" hängt am Fahrzeug, die Schnellerfassung fragt den Bedarf nie ab (neu)

- **Beobachtung:** Die Schnellerfassung hat keine Felder für Betriebsstoff,
  Unterbringung, Ruhezeit. Trotzdem gilt der Bedarf einer schnellerfassten
  Einheit als erfasst, sobald sie ein Fahrzeug hat (`bedarfNichtErfasst` in
  `auswertung.ts` verlangt `fahrzeuge.length === 0`). Im Prüfstand trugen
  Nr. 1, 4, 7 (ohne Fahrzeug) die Marke, Nr. 2, 3, 5, 6 (mit Fahrzeug) nicht.
  Das Lageblatt sagt „kein Betriebsstoff (bei 2 Einheiten nicht erfasst)";
  nicht gefragt wurde bei sechs. Die Detailansicht von Nr. 2 sagt selbst
  „Verpflegung / Betriebsstoff / Unterbringung: nicht erfasst", Karte und
  Summe sagen es nicht.
- **Auswirkung:** Die Meldung nach oben nennt „keine Unterbringung, kein
  Betriebsstoff" für Einheiten, die niemand gefragt hat.
- **Vorschlag:** Die Marke allein an „nur Stärke ohne Sofortbedarf" hängen.
  Für die Rolle besser: drei Felder Sofortbedarf (Kraftstoff, Unterbringung,
  Ruhezeit) zugeklappt in der Schnellerfassung und in „Mehr…" an der Karte.
  Bis dahin bleibt nur „Auftrag/Notiz".

### U5 – P2 – Die Führungskraft der Schnellerfassung wird als „Führer", „männlich", „Fleisch" geführt (neu)

- **Beobachtung:** Einheit 0/2/7 mit Führungskraft „Schulze, Petra": Details
  zeigen die Person mit Rolle „Fü" und darunter „Geschlecht: 1 männl. / 0
  weibl. / 0 div."; die CSV führt „Führer; m; Fleisch", der gedruckte Bogen
  „F" neben Stärke 0/2/7//9. Angegeben war nichts davon. Der Bedarfskasten der
  Einsatzansicht zählt richtig „0 männl. … ohne Angabe". Dazu der Satz „Stärke
  von Hand auf 9 geändert; die 1 Namen stammen aus der Meldung davor" bei
  einer Erstmeldung.
- **Auswirkung:** Papier und Export behaupten Angaben, die niemand gemacht
  hat; ein Gruppenführer steht als Führer auf dem Bogen, die Stärke daneben
  sagt 0 Führer.
- **Vorschlag:** Rolle und Geschlecht der Ansprechperson offen lassen („k. A.")
  und in keiner Zählung führen; den Satz für Erstmeldungen streichen.

### U6 – P2 – Nur „anwesend" und „abgerückt": kein Platz für eingesetzt, Bereitstellung, Ruhe, abgelöst (Lücke der Rolle)

- **Beobachtung:** Status kennt zwei Werte. Wo eine Einheit eingesetzt ist,
  trägt allein der Freitext „Auftrag/Notiz"; gefiltert werden kann nach „ohne
  Auftrag", nicht nach Einsatzstelle oder Ruhe. Eine Ablösung (alte Mannschaft
  ab, neue an) ist entweder „Stärke ändern" oder Abrücken plus neue Einheit;
  ein Bezug zwischen beiden entsteht nicht.
- **Einordnung:** Auftragsverfolgung gehört laut `PRODUCT.md` nach S1-Control.
  Für die UEAL ist „wer ist wo, wer ruht" aber der Kern der Kräfteübersicht.
  Annahme über den Ablauf: Eine UEAL arbeitet meist ohne S1-Control.
- **Vorschlag:** Kein Auftragswesen, aber ein dritter Zustand („in Ruhe /
  Bereitstellung") mit Zeit wie beim Abrücken und ein Filter über den
  Auftragstext würden die Rolle tragen.

### U7 – P2 – Kein Verlauf über den ganzen Einsatz als Hilfe fürs Einsatztagebuch (Lücke der Rolle)

- **Beobachtung:** Jede Karte hat ihre Historie und „Vermerke der
  Führungsstelle" mit Uhrzeit (20:55 Abgerückt; 20:55 Auftrag/Notiz …), das
  ist gut und vollständig. Eine Liste aller Bewegungen des Einsatzes in
  Zeitfolge gibt es nicht; der Lagemonitor zeigt die letzten zwei bis drei
  („+ 7 weitere Bewegungen" ohne Weg dorthin), das Lageblatt nur den
  Unterschied zur letzten Meldung je Einheit.
- **Auswirkung:** Fürs Einsatztagebuch muss ich zehn Karten einzeln
  aufklappen und die Zeiten von Hand ordnen.
- **Einordnung:** Einsatztagebuch ist ausdrücklich S1-Control. Gemeint ist
  nur die Ausgabe dessen, was die App ohnehin mit Uhrzeit festhält.
- **Vorschlag:** Eine Seite oder ein CSV „Bewegungen" (Zeit, Einheit,
  Ereignis: eingetroffen, Stärke, Auftrag, abgerückt, entfernt), Zeit als DTG.

### U8 – P2 – Meldungen des Geräteabgleichs nennen nur den Ort, nicht die Einheit (neu)

- **Beobachtung:** Nach dem Zusammenführen zweier Geräte: „1 Meldung
  aktualisiert: Oldenburg (NI) abgerückt 21:00. 1 Widerspruch zwischen den
  Geräten: Oldenburg (NI) Auftrag/Notiz — hier Auftrag ‚Pumpen Siel Tungeln‘,
  in der Datei Auftrag ‚Deichwache km 14‘". In der Lage standen drei Einheiten
  aus Oldenburg (NI): Zugtrupp, Bergungsgruppe, FGr N. Welche abgerückt ist
  und bei welcher der Auftrag strittig ist, sagt der Text nicht. Die Meldung
  zur Nummernänderung im selben Bericht nennt die Einheiten mit Typ und Nr.
- **Auswirkung:** Ein Zug kommt fast immer aus einem Ortsverband; genau dann
  ist der Hinweis nicht zuzuordnen, und der Widerspruch wird mit „Erledigt"
  weggetippt.
- **Vorschlag:** Überall „Nr. und Anzeigename der Einheit" wie auf der Karte.

### U9 – P2 – Tastatur: Fokus landet im Nichts, Eingabetaste übernimmt nicht, keine Kürzel (neu)

- **Beobachtung:**
  - Einsatzansicht: 11 Tabulatorschritte bis „Einheit manuell erfassen…", 26
    bis zum Suchfeld; kein Kürzel für Aufnahme, Suche oder Tabelle.
  - Schnellerfassung öffnet mit Fokus auf `body`; bis „Ort der Einheit"
    sind es neun Tabulatorschritte durch Kopf und Ansichtsknöpfe.
  - Nach der Wahl eines Ortsvorschlags mit Eingabetaste und nach dem Verlassen
    von „Einheitstyp" steht der Fokus wieder auf `body`.
  - Eingabetaste und Strg+Eingabetaste in einem Feld übernehmen nicht; „In
    Einsatz übernehmen" ist nur über die ganze Tabulatorfolge oder die Maus
    erreichbar. Die Dialoge machen es richtig (Einsatz anlegen, Auftrag,
    Stärke ändern: Eingabetaste übernimmt, Esc bricht ab, Fokus sitzt).
- **Auswirkung:** Mit Hörer in der einen Hand geht die Aufnahme nicht ohne
  Maus oder Touchpad.
- **Vorschlag:** Fokus beim Öffnen auf „Ort der Einheit", nach dem Vorschlag
  ins nächste Feld; Strg+Eingabetaste übernimmt; in der Einsatzansicht „/"
  für die Suche und ein Kürzel für die Aufnahme, in der Knopfbeschriftung
  genannt.

### U10 – P2 – Nur eine angefangene Erfassung auf dem ganzen Gerät (neu für diese Rolle)

- **Beobachtung:** Die halbe Erfassung übersteht Neuladen ohne Verlassen des
  Felds vollständig (Ort, Stärke, Name), das ist gut. Kommt währenddessen eine
  zweite Einheit, heißt die Wahl „Diese Erfassung fortsetzen" oder „Verwerfen
  und neue Einheit erfassen"; aus einer anderen Sammlung heraus „Ersetzen und
  neu erfassen" oder „Abbrechen". Beiseitelegen geht nicht.
- **Auswirkung:** Der Gruppenführer der ersten Einheit holt gerade die
  Kennzeichen, die zweite steht am Fenster: Ich verwerfe oder lasse warten.
- **Vorschlag:** „Mit dem, was da ist, übernehmen" in dieselbe Rückfrage
  (Stärke und Ort reichen ohnehin), der Rest wird an der Karte nachgetragen.

### U11 – P2 – Beim Blättern in der Liste sind Summe und Einsatzname weg (neu)

- **Beobachtung:** Bei zwölf Karten ist die Liste am Laptop rund 2700 px hoch.
  Bei der letzten Karte liegen Summe und Kopf mit dem Einsatznamen weit
  außerhalb des Bildes (gemessen: „GESAMT" bei y = −1986, Titel bei −2641).
  Nichts davon bleibt stehen. Einsatz und Übung unterscheiden sich im Kopf nur
  durch ein kleines Wort („Übung ·"), Farbe und Aufbau sind gleich.
- **Auswirkung:** Die Zahl für die Rückfrage ist nicht da, wenn ich gerade an
  einer Karte arbeite; bei zwei offenen Sammlungen sehe ich mitten in der
  Liste nicht, in welcher ich bin.
- **Vorschlag:** Schmale feste Zeile beim Scrollen: Einsatzname, Art,
  F / U / M // G, Einheiten, Fahrzeuge. Übung deutlich absetzen.

### U12 – P2 – Stärke nach Organisation nur auf der Tafel, nach Fachgruppe oder Zug gar nicht (teils Lücke der Rolle)

- **Beobachtung:** Die Tafel des Lagemonitors zeigt je Organisation die
  Stärke (THW 6 Einheiten 2/9/28//39, nachgerechnet richtig). In der
  Einsatzansicht, im Lageblatt und in der CSV gibt es das nicht. Behelf:
  Tabelle und Suche „THW", die Summenzeile rechnet dann die Auswahl („Summe (4
  zählend) 1/7/22//30", richtig); in der Kartensicht bleibt die Summe oben die
  Gesamtsumme. Einen Filter „Organisation" gibt es nicht, nur die Sortierung.
  Die Zuordnung zu Zügen ist seit 11.11.2026 bewusst entfallen
  (`funktionsumfang.md`).
- **Auswirkung:** „Wie viele THW-Kräfte, wie viele Feuerwehr?" beantwortet der
  Fernseher, nicht das Gerät vor mir und nicht die Meldung nach oben. Eine
  Zugbefehlsstelle mit zwei Zügen kann ihre Züge nicht getrennt ablesen.
- **Vorschlag:** Die Zeile je Organisation der Tafel auch unter die Summe der
  Einsatzansicht und ins Lageblatt; Filter „Organisation". Ob der Zug für die
  dritte Nutzergruppe aus `PRODUCT.md` (Zug- oder Verbandsführer) zurückkommen
  soll, ist eine Produktentscheidung.

### U13 – P2 – Lagemonitor in der Vorgabe „Zeilen" zeigt eine von neun Einheiten (neu)

- **Beobachtung:** 1920×1080, neun Einheiten, Darstellung „Zeilen" (Vorgabe):
  Uhr, Stärke, Warnung, Bedarf und Bewegungen füllen das Bild, die Tabelle
  zeigt eine Einheit und „+ 8 weitere Einheiten". Die Tafel zeigt im selben
  Bild alle neun mit taktischem Zeichen, Stärke, Auftrag, Marken, dazu Summe
  je Organisation, DTG, Bedarf und Abgerückte.
- **Auswirkung:** Wer „Lagemonitor öffnen" tippt und die Auswahl darüber nicht
  liest, hat im Fahrzeug einen Bildschirm ohne Kräfteübersicht.
- **Vorschlag:** Tafel als Vorgabe, sobald mehr als etwa drei Einheiten da
  sind, oder in den Zeilen die Bewegungen zugunsten der Tabelle kürzen.

### U14 – P3 – Schnellerfassung setzt einen „vorgesehenen Einsatzzeitraum" 08:00–18:00 (neu)

- Um 20:52 erfasst, steht im Bogen, im Bogen-PDF und in der CSV „24.11.2026,
  08:00 – 24.11.2026, 18:00". Niemand hat das angegeben. Ob daraus am Folgetag
  der Hinweis „Zeitraum vorbei" wird, ist nicht geprüft. Vorschlag: Zeitraum
  leer lassen oder ab Erfassungszeit ohne Ende.

### U15 – P3 – Zeiten als „24.11.2026, 20:52" statt DTG; Lageblatt ohne DTG und Absender (bekannt, offen: Runde 1 F8)

- DTG steht auf der Tafel (242058nov26) und im QR-Kasten des Bogens; die
  Dateinamen tragen jetzt „2026-11-24_2057" (in Runde 1 noch die DTG). Karten, Tabelle, Lageblatt, CSV
  schreiben Datum und Uhrzeit aus; am selben Tag wiederholt jede Zeile das
  Datum. Der Kopf des Lageblatts nennt weder DTG noch die meldende Stelle,
  obwohl der Funkrufname der Führungsstelle für den Lagemonitor eingetragen
  war („Heros Oldenburg 21/10"). Für die Stärkemeldung nach oben fehlt damit
  der Absender auf dem Blatt.

### U16 – P3 – „neu · kürzlich eingetroffen" an einer nachgetragenen Einheit (bekannt, offen: Runde 1 F7)

- Um 21:04 mit „Eingetroffen um 20:15" nachgetragen: Die Karte zeigt die
  Eintreffzeit richtig, trägt aber die Marke „neu · kürzlich eingetroffen".
  Die Rückfrage bei 23:30 („liegt in der Zukunft — heute, gestern,
  korrigieren?") ist dagegen genau richtig.

### U17 – P3 – „übergeben" steht neben der Summe, sobald die PDF erzeugt ist

- Nach dem bloßen Erzeugen der Sammel-PDF: „übergeben 24.11.2026, 20:57". Die
  Quittung sagt richtig „übergeben ist sie erst, wenn sie angekommen ist", und
  der Abschluss-Block führt „Übergabe vermerkt" getrennt. Zwei Bedeutungen
  eines Worts; neben der Summe besser „Übergabe-PDF erzeugt 20:57".

### U18 – P3 – Startseite: Liste ohne Art und Stärke, Text nennt die entfallene Excel-Liste

- Die Einsatzliste zeigt je Sammlung Name und letzte Meldung, nicht „Übung"
  oder „Einsatz" und keine Stärke (`funktionsumfang.md`: „mit Summen"). Im
  Erklärtext steht weiter „Excel-Liste im Format ‚Oldenburg‘", die seit
  09.11.2026 entfallen ist.

### U19 – P3 – Suche: „FGr N" findet auch die FGr WP, Fahrzeugtyp wird nicht durchsucht

- „FGr N" liefert Notversorgung und Wasserschaden/Pumpen (Teilwörter „FGr"
  und „N"). „RTW" liefert nichts, obwohl die JUH einen RTW gemeldet hat;
  Kennzeichen („OL-RK") und Auftrag („Sandsack") werden gefunden. Der
  Qualifikationsfilter (AGT, Kraftfahrer nach Klasse) ist dafür sehr gut.

### U20 – P3 – Kleinere Texte und Anzeigen

- Ein von Hand hinzugefügtes leeres Fahrzeug wird als „Vorbelegt nach StAN:
  1 Fahrzeug (Kennzeichen offen). Sie zählen in die Stärke …" beschrieben.
- Import-Quittung: „12 neue Meldung(en)" bei 10 Einheiten (Fassungen
  mitgezählt).
- Bedarfskasten: „Fahrzeuge: 9 · Ruhezeit: 1 Einheit" in einer Zeile.
- Tafel kürzt den Einsatznamen auf „Hochwass…", der Ort/Auftrag daneben
  bekommt den Platz.
- „Einsatz als beendet markieren" wirkt ohne Rückfrage (mit „Rückgängig" und
  „Wieder öffnen", daher nur Feinschliff; mit U2 liegt der Knopf aber oben).

## Rechenprobe

| Schritt | erwartet | App |
| --- | --- | --- |
| sieben Einheiten per Schnellerfassung | 1/11/40//52, 5 Fahrzeuge, 4 vegetarisch | gleich |
| FGr WP 0/3/9 → 0/2/6 | 1/10/37//48 | gleich |
| DLRG abgerückt | 1/9/35//45 | gleich |
| alter Bogen per Link (1/0/2//3) | 2/9/37//48 | gleich |
| B Wildeshausen und JUH per Link | 2/12/47//61, 9 Fahrzeuge, Verpflegung angefordert 33 | gleich |
| Folgemeldung B Wildeshausen 9 → 6 | 2/12/44//58, angefordert 30, 9 vegetarisch, 0 vegan | gleich, auch Lageblatt, Übersicht-CSV, Lagemonitor |
| Tafel THW | 2/9/28//39 | gleich |
| Tabelle mit Suche „THW" (vor den Links) | 1/7/22//30 | gleich |
| Gerät B: FGr N ab, FGr E neu, Feuerwehr −2 | 53 | gleich |
| Gerät A: DRK ab, ASB neu; danach Abgleich mit B | 56, dann 51, 6 Fahrzeuge | gleich |
| offline FGr R dazu | 60 | gleich |
| CSV „Alle Daten", Spalte „Verpflegung gesamt" | 58 | **39** (U1) |

## Was gut funktioniert

- **Aufnahme:** Schnellerfassung auf einer Seite, Ort und Stärke reichen;
  OV-Verzeichnis und Einheitstypen mit Vorschlag, Nummer für den
  Zettel in der Quittung, überall „Rückgängig".
- **Folgemeldung:** „Einheit ist bereits gemeldet" mit Gegenüberstellung
  (Stärke 9 → 6, Personal: 3 weg, Diesel 120 → 0); auf der Karte und im
  Lageblatt steht, was sich geändert hat; Historie mit beiden Fassungen.
- **Zweites Gerät:** Sammel-PDF auf leerem Gerät eingelesen, alles da
  (Zeiten, Auftrag, Abgerückte). Zurück zusammengeführt: neue Einheit, neue
  Stärke und das Abrücken übernommen, der widersprüchliche Auftrag als offener
  Widerspruch gehalten, die Nummernänderung laut gemeldet. Summe richtig.
- **Zwei Sammlungen:** „Wohin damit?" nennt beide, sagt „Schon dort, würde
  übersprungen"; Verschieben sagt „die Lage verliert 4 Helfer" und „als Übung
  zählt die Einheit in keiner Lage mehr".
- **Offline:** Neuladen, Erfassen, Lageblatt und Lagemonitor ohne Netz; einzige
  fehlgeschlagene Anfrage `offline-zusatz.json`, ohne sichtbare Folge.
- **Lagemonitor:** aktualisiert sich nach Abrücken und Rückgängig von selbst;
  die Tafel ist für das Führungsfahrzeug das Beste an der App.
- **Fehlerbremsen:** Zahlendreher 7 → 70 („mehr als das Dreifache"),
  Eintreffzeit in der Zukunft, Entfernen mit Papierkorb für 7 Tage und frei
  bleibender Nummer, Einsatz löschen mit 30 Tagen Papierkorb, „Alle Daten
  löschen" nur mit Haken und Hinweis auf fehlende Sicherung.
- **Papier:** Lageblatt mit Nachtragszeilen und Rückrufspalte; gerasterte
  Bogenseiten werden als Bilder gelesen (5 von 5), der Papier-Abgleich fragt
  Nr., Eintreffzeit, Status, Auftrag in einer Liste.
- **Qualifikationsfilter:** „3× AGT: Lena Behrens, Max Coordes, Ole Dirks" an
  der Karte, mit dem ehrlichen Zusatz „7 Meldungen führen keine Personen".
- **Abschluss:** Die Liste „Übergabe und Abschluss" (was ist erzeugt, was
  veraltet, was fehlt) ist inhaltlich genau richtig, nur am falschen Platz.
- **Telefon:** Der P0 der Runde 1 ist behoben; Summe in einer Zeile, Knöpfe
  erreichbar, kein waagerechtes Scrollen.
- **Runde 1 nachgeprüft:** Lagemonitor mit Gesamt, Bedarf und Nachtrag (F3,
  F4), Stand von Lageblatt und Übergabe neben der Summe (F6), Verpflegung
  „angefordert / Stärke" getrennt mit Hinweis auf Abweichung (F5) sind da.

## Nicht geprüft

- Kamera-Scan, USB-Handscanner, echter Ausdruck und Scan vom Papier (der
  Papierweg lief über gerasterte PDF-Seiten).
- Laptop zuklappen und Ruhezustand: nur als Neuladen und Offline nachgestellt.
- Electron- und Android-Hülle, Teilen-Menü, zweiter Bildschirm per Kabel
  (Lagemonitor nur als zweites Browserfenster).
- Rückweg über den Erfassungsbogen („vollständig erfassen", „An Meldekopf
  geben"), signierte Bögen, Word-Bogen.
- Feld-, Dunkel- und Nachtmodus, Schriftstufen.
- Lagen mit mehr als 13 Einheiten, Dauer über Tage, Fristen (90 Tage,
  Papierkorb), voller Speicher.
- Aufteilen, Zusammenführen, „Als Übung kennzeichnen", „Ort der Einheit
  ändern" (nur das Menü gesehen).
- Drucken aus dem Browser; die PDFs wurden nur als Datei ausgewertet.
- Zwei Hauptfenster gleichzeitig auf demselben Gerät (nur Hauptfenster und
  Lagemonitor).

## Abschluss

- **Aufgabe geschafft:** ja, am Tablet glatt, am Laptop mit Scrollen (U2) und
  mit dem ausgedruckten Lageblatt für Rückfragen zum Ansprechpartner (U3).
- **Größtes Einsatzrisiko:** die CSV „Alle Daten" als Grundlage für
  Verpflegung (U1).
- **Größte Lücke für die Rolle:** kein Zustand zwischen anwesend und
  abgerückt, keine Teilsumme je Zug oder Organisation am eigenen Gerät (U6,
  U12).
- **Zuerst beheben:** U1, dann die fehlende Rasterzeile aus U2.
