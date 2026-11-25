# Rollenaudit Runde 2: Zugtrupp-Helfer am Meldekopf

Stand: 24.11.2026, gegen den Produktionsbuild (`vite preview`, Port 4173),
Code-Stand `main` (`93ef69d`). Reiner Prüfbericht, keine Codeänderung.

## Rolle

Zugtrupp-Helfer im THW, betreibt bei einem größeren Einsatz den Meldekopf an
der Zufahrt: Einheiten fahren kolonnenweise vor, werden erfasst (QR-Code des
Erfassungsbogens, sonst Schnellerfassung von Hand oder vom Papierbogen),
Stärke x/y/z//g und Fahrzeuge werden gezählt, die Einheit wird weitergewiesen
(z. B. in den Bereitstellungsraum), die Summen gehen an die Führungsstelle.
Gerät: Telefon oder Tablet in der Hand, draußen, Dunkelheit, Handschuhe, Lärm,
ständige Unterbrechungen, mehrere Fahrzeuge warten. Praktisch-technisch fit,
kein IT-Mensch.

## Vorgehen

Durchgespielt mit Playwright (Chromium, Touch) in eigenem Browser-Profil,
Telefon 390×844 als Hauptgerät, einmal Tablet hoch 820×1180, ein zweites und
drittes Profil als „anderes Gerät“. Skripte, Bilder und heruntergeladene
Ausgaben lagen außerhalb des Repos (Prüfstand). Lage: Einsatz „Hochwasser
Hunte“, Ort „BR Weser-Ems-Halle“, am Ende 24 vergebene Nummern.

Gespielte Abläufe: Einsatz anlegen; erste Einheit per Bogen-Link und per
QR-Bild im Scan-Fenster (frische Bögen mit heutigem Stand, mit dem Codec des
Kerns erzeugt, dazu der alte v2-Bogen aus `features/fixtures.ts`); zehn
Einheiten in Folge per Schnellerfassung; Einheit ohne Stärke, ohne Ort,
Einzelperson per Link und von Hand; dieselbe Einheit doppelt (derselbe QR-Code,
Folgemeldung, von Hand); Stärke nachträglich korrigieren; Auftrag vergeben,
Abrücken, zurückholen, Entfernen; Lageblatt, Übergabe-PDF, beide CSV; Übergabe
auf ein zweites Gerät, Weiterarbeit auf beiden, zweite Übergabe; Reload,
Browser schließen und Zurück-Taste mitten in der Eingabe; alles noch einmal
ohne Netz (`setOffline(true)`); Ansichten Feld und Nacht; Nachtrag vom Zettel
mit Eintreffzeit.

Die Summen habe ich nach jedem Schritt gegen eine Handrechnung gehalten und am
Ende Bildschirm, Lageblatt, CSV und importierten Stand verglichen.

Was eine Annahme über THW-Abläufe ist und keine beobachtete Tatsache, steht
bei den Befunden unter „Annahme“.

## Urteil

Kein P0. Stärke-Summen stimmten in allen Schritten (bis 6/18/112//136 bei 21
anwesenden Einheiten), auch nach Abrücken, Zurückholen, Entfernen,
Folgemeldung, Übergabe und Zusammenführen zweier Geräte. Doppelte Aufnahme
wird in allen drei Formen abgefangen. Reload, Schließen und Zurück-Taste
verlieren keine Eingabe. Ohne Netz geht alles.

Hinderlich für meine Rolle ist vor allem, was nach dem ersten Erfassen kommt:
Eine von Hand erfasste Einheit lässt sich außer in Stärke, Ort und Zeiten
nicht mehr berichtigen, und die Fahrzeugzahl, die ich mitmelden soll, steht am
Telefon nicht bei den Summen.

| Priorität | Anzahl |
| --- | --- |
| P0 | 0 |
| P1 | 1 |
| P2 | 9 |
| P3 | 9 |

## Stand der Befunde aus Runde 1 (nachgeprüft)

| Befund Runde 1 | Stand |
| --- | --- |
| Telefon nicht bedienbar (P0) | behoben: alle Knöpfe der Einsatzansicht nehmen am Telefon den ersten Tipp an |
| Schnellerfassung zu lang (P1) | behoben: Stärke bei 390 px auf y ≈ 710, Kontaktstellen zugeklappt |
| Unterbrochene Erfassung öffnet sich wortlos (P1) | behoben: Rückfrage „Angefangene Erfassung“ mit Fortsetzen / Verwerfen |
| Browser-Zurück verlässt die App (P2) | behoben: Zurück führt Erfassung → Einsatz, Entwurf bleibt |
| „Stärke ändern“ nur per Tastatur (P2) | behoben: Zähler im Fenster |
| Tabelle am Telefon ohne Gesamt (P2) | behoben: Gesamt neben dem Namen |
| Weitergabe unter der ganzen Liste (P2) | behoben: Statuszeile unter der Summe mit Sprung |
| Angefangene Erfassung in der Einsatzansicht nicht erkennbar (P3, Feld; P2, Fehler F5) | **offen**, siehe P2-3 |
| „kürzlich eingetroffen“ auch bei Nachträgen (P3, Führung F7) | **offen**, siehe P3-4 |
| Lageblatt-Kopf ohne DTG und Absender (P3) | offen, wie in Runde 1 vermerkt; nicht erneut bewertet |

## Befunde

### P1-1 – Eine von Hand erfasste Einheit lässt sich nicht berichtigen, die Neuerfassung zählt doppelt (neu)

- **Beobachtung:** An der Karte gibt es unter „Mehr…“ „Stärke ändern…“, „Ort
  der Einheit ändern…“, dazu „ändern“ an den Zeiten und „Auftrag/Notiz“.
  Einheitstyp, Organisation, Fahrzeuge, Führungskraft, Rufnummer und
  Funkrufname lassen sich nach „In Einsatz übernehmen“ nicht mehr ändern.
  „Details“ zeigt sie nur an. Wer die Einheit deshalb noch einmal erfasst,
  bekommt nur dann die Rückfrage „Einheit ist bereits gemeldet“, wenn
  Organisation, Ort und Einheitstyp gleich sind. Liegt der Fehler im Typ,
  entsteht ohne Rückfrage eine zweite Einheit.
- **Nachstellen:** Einsatz mit „Nr. 3 THW Oldenburg Fachgruppe Notversorgung
  und Notinstandsetzung“ 0/1/8//9. Die Einheit war in Wahrheit die FGr E.
  „Einheit manuell erfassen…“ → THW, Oldenburg, „FGr E“, 0/1/8 → „In Einsatz
  übernehmen“. Ergebnis im Test: neue Nr. 24, Summe 136 → 145, 21 → 22
  Einheiten, keine Rückfrage.
- **Auswirkung im Einsatz:** Vertipper beim Einheitstyp und vergessene oder
  falsche Fahrzeuge sind unter Zeitdruck die häufigsten Fehler. Der einzige
  Weg ist Entfernen und neu erfassen (neue Nummer, der Zettel der Einheit
  stimmt nicht mehr) oder Neuerfassung mit gleichem Namen und „Als neue
  Fassung anhängen“. Wer das Entfernen vergisst, meldet neun Helfer zu viel.
- **Vorschlag:** „Angaben berichtigen…“ an der Karte, das die Schnellerfassung
  mit den Werten der Einheit öffnet und beim Übernehmen als neue Fassung
  derselben Nummer ablegt. Mindestens: Fahrzeuge und Einheitstyp wie die
  Stärke einzeln änderbar.

### P2-1 – Fahrzeugzahl am Telefon nicht bei den Summen und nicht an der Karte (neu)

- **Beobachtung:** Die Summenzeile zeigt Einheiten, Führer, Unterführer,
  Mannschaft, Gesamt. Die Fahrzeugsumme steht am Telefon nur in der
  zugeklappten Zeile „Bedarf:“, deren Kopf allein die Verpflegung nennt. Die
  Karte zeigt zu- wie aufgeklappt keine Fahrzeugzahl, erst „Details“. Die
  Telefon-Tabelle hat die Spalte erst nach „Alle Spalten zeigen“. Am Tablet
  steht „Fahrzeuge 5“ offen im Kasten „Bedarf (anwesende Einheiten)“.
- **Nachstellen:** Einsatz mit Fahrzeugen bei 390 px öffnen, Fahrzeugzahl
  suchen.
- **Auswirkung:** Die Führungsstelle fragt Stärke und Fahrzeuge in einem Zug
  ab (Annahme: Marschkolonnen und Stellflächen im Bereitstellungsraum werden
  nach Fahrzeugen geplant). Ich muss scrollen und eine Zeile aufklappen, die
  nach Verpflegung aussieht.
- **Vorschlag:** „Fzg“ als weitere Kachel in der Summenzeile und als Zahl auf
  der zugeklappten Karte neben der Stärke.

### P2-2 – „Einheit manuell erfassen…“ liegt ab der zweiten Einheit hinter „Weitere Wege“ (neu)

- **Beobachtung:** Im leeren Einsatz steht der Knopf offen neben „Bögen
  einlesen…“. Sobald eine Einheit da ist, liegt er in der zugeklappten Zeile
  „Weitere Wege: von Hand, schnell, Datei“. Die Zeile klappt nach jeder
  Aufnahme und nach jedem Neuladen wieder zu.
- **Nachstellen:** Zwei Einheiten nacheinander von Hand erfassen; vor der
  zweiten ist der Knopf nicht sichtbar.
- **Auswirkung:** Zehn Einheiten ohne Bogen kosten zehn zusätzliche Tipps, und
  wer die App nicht kennt, sucht den Weg, während die Kolonne wartet
  (Annahme: Ein großer Teil der Einheiten kommt vorerst ohne QR-Code).
- **Vorschlag:** Den zuletzt benutzten Weg offen lassen oder „von Hand“ fest
  als zweiten Knopf neben „Bogen scannen…“ führen.

### P2-3 – Angefangene Erfassung ist in der Einsatzansicht unsichtbar (offen aus Runde 1)

- **Beobachtung:** Wer die Schnellerfassung mit Zurück oder „‹ Einsatz“
  verlässt, sieht in der Einsatzansicht keinen Hinweis auf den Entwurf. Der
  Entwurf bleibt erhalten und meldet sich erst beim nächsten „Einheit manuell
  erfassen…“.
- **Nachstellen:** THW Cloppenburg FGr N 0/1/7 eintippen, Zurück-Taste. Die
  Einsatzansicht zeigt 17 Einheiten, Gesamt 100, kein Wort zum Entwurf.
- **Auswirkung:** Kommen danach nur noch Einheiten mit QR-Code, fehlt die
  halb erfasste Einheit in der Stärke, ohne dass es jemand merkt.
- **Vorschlag:** Zeile unter der Summe: „1 Erfassung angefangen: THW
  Cloppenburg … fortsetzen“.

### P2-4 – Organisation bleibt von der letzten Einheit stehen; der Wechsel löscht den schon getippten Ort (neu)

- **Beobachtung:** Nach einer Feuerwehr-Einheit steht die nächste Erfassung
  auf „Feuerwehr“. Tippe ich erst den Ort und stelle dann auf THW um, fragt
  die App „Organisation auf ‚THW‘ wechseln?“ und leert nach der Bestätigung
  das Feld „Ort der Einheit“.
- **Nachstellen:** Feuerwehr Rastede erfassen, dann „Einheit manuell
  erfassen…“, Ort „Nordenham“ tippen, Organisation auf THW stellen,
  „Organisation wechseln“. Ort ist leer.
- **Auswirkung:** Ein Dialog und eine doppelte Eingabe mitten in der Kolonne;
  wer die Vorgabe übersieht, erfasst ein THW-Fahrzeug als Feuerwehr.
- **Vorschlag:** Den Ort beim Wechsel der Organisation behalten (nur die
  Zugehörigkeit darüber verwerfen). Die Vorgabe der Organisation sichtbar
  kennzeichnen („wie letzte Einheit“).

### P2-5 – Weiterleiten kennt nur „Abrücken“ oder Freitext (neu, mit Annahme)

- **Beobachtung:** Für eine Einheit gibt es die Zustände anwesend und
  abgerückt. „Abrücken“ nimmt sie aus der Summe. Das Weiterweisen in einen
  Bereitstellungsraum oder Einsatzabschnitt geht nur als Freitext unter
  „Auftrag/Notiz“. Der Filter „Auftrag“ kennt nur „alle“ und „ohne Auftrag“.
  Über die Suche nach dem Auftragstext und die Tabellensicht bekomme ich eine
  Teilsumme („Summe (2 zählend) 19“ für „Halle 2“), die Suche „BR Nord“
  findet aber auch „Nordenham“.
- **Nachstellen:** Nr. 4 und 5 den Auftrag „BR Nord, Halle 2“ geben, dann nach
  den Kräften im BR Nord fragen.
- **Auswirkung:** Die Frage „Was steht im BR Nord, was ist schon im
  Abschnitt?“ beantworte ich über Tippen und Tabellenwechsel, und jeder
  Schreibfehler im Freitext fällt aus der Teilsumme.
- **Annahme:** Der Meldekopf an der Zufahrt eines Einsatzraums weist in
  mehrere Räume weiter und wird nach Teilsummen gefragt. Für den Meldekopf
  genau eines Bereitstellungsraums reicht anwesend/abgerückt.
- **Vorschlag:** Bereits vergebene Aufträge als Auswahl im Auftragsfeld und im
  Filter anbieten, Zwischensumme je Auftrag.

### P2-6 – Keine Kurzmeldung zum Durchgeben (neu)

- **Beobachtung:** Weitergeben heißt Lageblatt-PDF, Übergabe-PDF oder CSV. Es
  gibt keinen Text zum Kopieren oder Vorlesen. Die Quittung nach jeder
  Aufnahme nennt „jetzt 22 Einheiten, Gesamt 145“, aber nicht x/y/z//g und
  keine Fahrzeuge.
- **Auswirkung:** Die Stärkemeldung über Funk oder Messenger setze ich aus
  fünf Kacheln und der Bedarfszeile selbst zusammen (Annahme: Am Meldekopf
  steht kein Drucker, die Summe geht mündlich oder als Textnachricht).
- **Vorschlag:** Knopf „Stärkemeldung“ bei der Summe: eine Zeile mit DTG,
  Einheiten, Stärke x/y/z//g, Fahrzeugen, zum Kopieren und in großer Schrift
  zum Ablesen.

### P2-7 – Die Schnellerfassung legt Angaben an, die niemand gemacht hat (neu)

- **Beobachtung:** Jede von Hand erfasste Einheit trägt den Einsatzzeitraum
  „24.11.2026, 08:00 – 24.11.2026, 18:00“, auch wenn sie um 20:52 erfasst
  wurde. Eine Führungskraft, von der ich nur den Nachnamen eingetragen habe,
  steht in den Details als „Geschlecht: 1 männl.“ und in „Alle Daten als CSV“
  mit Geschlecht „m“, Ernährung „Fleisch“ und „Unterbringung M 1“. Dieselbe
  Einheit hat in der CSV-Übersicht „Verpflegung gesamt 5“, in „Alle Daten“
  „Verpflegung gesamt 1“. In der CSV-Übersicht stehen für nicht erfassten
  Bedarf Nullen, auf dem Bildschirm steht „nicht erfasst“.
- **Nachstellen:** THW Oldenburg ZTr 1/1/2, Name „Meyer“, Telefon, Funkrufname
  erfassen; Details öffnen; beide CSV erzeugen.
- **Auswirkung:** Die Stärke-Summen sind nicht betroffen, das Lageblatt auch
  nicht (dort „88 ohne Angabe zum Geschlecht“). Der Stab bekommt in der
  Voll-CSV aber erfundene Personenmerkmale und einen Zeitraum, den keiner
  genannt hat.
- **Vorschlag:** Zeitraum bei Schnellerfassung leer lassen, Geschlecht und
  Ernährung der Führungskraft als „ohne Angabe“ führen, nicht erfassten Bedarf
  in der CSV leer statt 0.

### P2-8 – Suche findet die Einheit nicht über den Funkrufnamen oder Namen der Führungskraft (neu)

- **Beobachtung:** Das Suchfeld nennt „Einheit, Organisation, Ort,
  Kennzeichen, Auftrag…“. „Heros“ findet die Einheit mit dem Funkrufnamen am
  Fahrzeug (Nr. 12), nicht Nr. 2 mit „Heros Oldenburg 18/10“ bei der
  Führungskraft. „Meyer“ findet nichts.
- **Auswirkung:** Meldet sich jemand am Funk mit seinem Funkrufnamen oder
  fragt die Führungsstelle nach „dem Zugtrupp von Meyer“, finde ich die Karte
  nicht über die Suche.
- **Vorschlag:** Funkrufname und Name der Führungskraft in die Suche
  aufnehmen.

### P2-9 – Einzelperson von Hand nur als „Einheit“, Ort ist Pflicht (neu)

- **Beobachtung:** Per Bogen-Link kommt eine Einzelperson als solche an
  (0/0/1//1, „THW Siegburg Baufachberater/in“). Die Schnellerfassung hat keine
  Wahl „Einzelperson“; ein Fachberater wird eine Einheit 1/0/0//1 und zählt
  als Einheit mit. „Ort der Einheit“ ist Pflicht, die Rückfrage hat nur den
  Knopf „Zum Feld ‚Ort der Einheit‘“.
- **Auswirkung:** Fachberater, Verbindungspersonen, Presse oder Firmen ohne
  Standort brauchen einen erfundenen Ort; die Zahl der Einheiten in der
  Meldung steigt um Einzelpersonen.
- **Vorschlag:** Haken „Einzelperson“ in der Schnellerfassung, der die Stärke
  auf eine Person setzt; Freitext statt Ort zulassen („ohne Standort“).

### P3-1 – „übergeben 21:05“ unter der Summe, obwohl nur die PDF erzeugt wurde

Unter der Summe steht nach „Einsatz übergeben (PDF mit Daten)“ sofort
„übergeben 24.11.2026, 21:05“. Der Kopf darüber sagt „Empfang nicht
bestätigt“, der Abschnitt unten „Übergabe noch nicht vermerkt“. Drei Aussagen
zum selben Vorgang. Vorschlag: unter der Summe „Übergabe-PDF erzeugt“ schreiben,
„übergeben“ erst nach „Übergabe vermerken…“.

### P3-2 – Leeres Fahrzeug zählt mit

„+ Fahrzeug hinzufügen“ ohne jede Angabe wird ohne Rückfrage übernommen und
zählt als ein Fahrzeug (Details: „— — — —“, CSV „Fahrzeuge (Anzahl) 1“ bei
leerer Liste). Das ist vertretbar („ein Fahrzeug, Typ unbekannt“), sollte in
der Liste aber so heißen statt aus Strichen zu bestehen.

### P3-3 – Schiefe Texte in der Schnellerfassung und in den Details

- Nach „StAN-Vorbelegung laden“: „Vorbelegt nach StAN: 2 Fahrzeuge
  (Kennzeichen offen). Sie zählen in die Stärke, bis sie ausgefüllt oder
  entfernt sind“. Fahrzeuge zählen nicht in die Stärke.
- Details einer frisch erfassten Einheit: „Stärke von Hand auf 4 geändert;
  die 1 Namen stammen aus der Meldung davor.“ Es gab keine Änderung und keine
  Meldung davor.

### P3-4 – „neu · kürzlich eingetroffen“ bei einem Nachtrag (offen aus Runde 1)

Eine um 21:05 nachgetragene Einheit mit „Eingetroffen um 19:40“ trägt die
Marke „kürzlich eingetroffen“. Ein Wort wie „nachgetragen“ fehlt an der Karte.

### P3-5 – Stärkefeld schluckt Fehleingaben still

„1o“ (Buchstabe statt Null) wird beim Verlassen des Felds zu 0, „7,5“ zu 8,
„-5“ zu 0, ohne Hinweis. Die Zifferntastatur des Telefons macht das
unwahrscheinlich; mit Hülle und Bluetooth-Tastatur am Tablet kommt es vor.
Hohe Werte fängt die Rückfrage „Stimmt die Stärke?“ ab (80 Mannschaft, 300
Mannschaft); ihr erster Knopf ist allerdings „Ja, so übernehmen“.

### P3-6 – Kopf der Einsatzansicht nimmt am Telefon fast die halbe Höhe

Titel mit Trennung („Hochwas-ser Hunte“), „Einsatz bearbeiten…“, Zeile mit
letzter Meldung, Weitergabe-Hinweis: Die Summe beginnt bei y ≈ 250, die erste
Einheitenkarte bei y ≈ 1010 von 844. In der Ansicht „Feld“ passen Summe,
„Bogen scannen…“ und zwei Klappzeilen auf den ersten Bildschirm, keine
Einheit.

### P3-7 – Kleinigkeiten im Bild

- „▶ ► Suchen, sortieren, filtern“ mit doppeltem Dreieck.
- Marke „neu“ und Aufklapp-Pfeil „▾“ überlagern sich bei langen Namen
  („Nr. 5 THW Delmenhorst Bergungsgruppe“, „… Elek-troversorgung“).
- In der Schnellerfassung liegt die feste Leiste „In Einsatz übernehmen“ über
  den Zahlenfeldern der Stärke; „+“ ist erst nach Scrollen zu treffen.
- Tablet-Tabelle: Spalte „Einheit“ bricht auf fünf Zeilen um, während
  „Auftrag“ breit und leer ist.

### P3-8 – Vorschläge beim Einheitstyp: „ZTr“ führt zuerst zum Fachzug FK

„ZTr“ und „Zug“ bieten in dieser Reihenfolge „ZTr FZ FK“, „ZTr FZ Log“,
„ZTr TZ“. Der Zugtrupp des Technischen Zugs ist der häufigste Fall (Annahme)
und steht an dritter Stelle; wer den ersten Vorschlag nimmt, hat einen
„Zugtrupp Fachzug Führung/Kommunikation“ in der Lage. Zusammen mit P1-1 nicht
mehr zu berichtigen.

### P3-9 – „Rückgängig“ nach „Abrücken“ ist nach wenigen Sekunden weg

Die Leiste war im Test nach 12 Sekunden verschwunden. Der Weg danach
(„Wieder anwesend“ mit Rückfrage) ist sauber; ein Fehltipp fällt aber nur
auf, wenn ich die sinkende Summe bemerke. Vorschlag: abgerückte Einheit bis
zum nächsten Tipp in der Quittung „Zuletzt …“ unter den Knöpfen nennen, wie
es bei der Aufnahme schon geschieht.

## Was gut funktioniert

- **Summen stimmen.** Jede Aufnahme, Folgemeldung, Stärkeänderung, jedes
  Abrücken, Zurückholen und Entfernen ergab die von Hand gerechnete Summe.
  Bildschirm, Lageblatt („5 / 13 / 76 // 94 · 5 Fahrzeuge“), CSV-Summenzeile
  und der auf dem zweiten Gerät importierte Stand waren gleich.
- **Doppelte Aufnahme wird abgefangen.** Derselbe QR-Code: „Schon da, nichts
  geändert … (übersprungen)“. Geänderter Bogen derselben Einheit: Rückfrage
  mit Gegenüberstellung („Stärke 3 → 2 · Personal: 1 weg“) und „Als neue
  Fassung anhängen“ als erstem Knopf. Von Hand mit gleichem Namen: dieselbe
  Rückfrage mit „Nur die Stärke ändern“.
- **Nichts geht verloren.** Reload mitten im Tippen, Browser hart schließen,
  Zurück-Taste: Alle Felder standen danach wieder da, die App öffnet nach dem
  Neustart wieder die Erfassung bzw. den Einsatz.
- **Ohne Netz** lädt die App neu, nimmt auf, erzeugt Lageblatt und
  Übergabe-PDF und öffnet Bogen-Links; keine fehlgeschlagene Anfrage.
- **Übergabe an ein zweites Gerät.** Übergabe-PDF über „Einsatz importieren…“:
  „übernommen: 17 Einheiten, davon 16 anwesend“. Nach Weiterarbeit auf beiden
  Geräten führt die zweite PDF beide Stände zusammen (110 = 94 + 6 + 10) und
  warnt deutlich vor der geänderten Nummer 18. Eine ältere PDF ändert nichts.
- **Rückfragen an den richtigen Stellen:** Stärke 0, unplausibel hohe Stärke,
  Eintreffzeit in der Zukunft mit „Gestern 23.11.2026, 23:50“ für den Nachtrag
  über Mitternacht, Entfernen mit Papierkorb für sieben Tage und freier
  Nummer.
- **Nachtrag vom Zettel:** „Eingetroffen um“, „Abgerückt um“ und „Nr. laut
  Zettel“ stehen zuerst, die Karte zeigt die Zeit vom Zettel.
- **Doppeltipp mit Handschuh** auf „Abrücken“ (zweiter Tipp nach 0,8 s) nahm
  das Abrücken nicht zurück.
- **Scan-Fenster** nimmt Bögen in Folge an und zählt mit („1 Bogen in diesem
  Durchgang“); ohne Kamera bietet es Bild und Handscanner an.
- **Nacht und Feld:** Summe, Knöpfe und Marken blieben in beiden Ansichten
  lesbar, Warnungen tragen nachts ein Zeichen und nicht nur Farbe.

## Nicht geprüft

- Echte Kamera und USB-Handscanner (der Prüfstand hat keine Kamera; QR-Codes
  kamen als Link und als Bilddatei).
- Echte Finger, Handschuhe, Regen, Sonnenlicht; Trefferflächen nur gemessen
  (Knöpfe 44 bis 76 px hoch, Zähler 52 px).
- Installierte App (PWA auf dem Startbildschirm, Android-Hülle, Electron),
  Teilen-Menü des Telefons, Drucken.
- „Lage vom Papier abgleichen…“ nach dem Einlesen eines Ausdrucks; der Knopf
  erscheint nur bei vom Papier eingelesenen Bögen. Geprüft ist der Nachtrag
  über die Schnellerfassung und der Blanko-Vordruck als Datei.
- Lagemonitor, Excel-Liste „Oldenburg“, „Aufteilen…“, „Verschieben…“,
  Datensicherung des Geräts, „Alle Daten löschen“.
- Unterbrechung von mehr als fünf Minuten in der Erfassung und Betrieb über
  Mitternacht mit gestellter Uhr: Mit angehaltener Uhr nimmt der Tipp-Schutz
  keine Tipps an, der Versuch war damit nicht aussagekräftig.
- Große Lagen (über 25 Einheiten), Speichergrenze, mehrere Einsätze
  nebeneinander.
- Ob die übergeordnete Ebene, die die App zu einem Ortsverband vorschlägt
  (z. B. Regionalstelle), fachlich stimmt.
