# Rollenaudit Runde 2: Übersicht im Bereitstellungsraum

Stand 24.11.2026, Produktionsbuild (`vite preview`, Port 4173), Code-Stand
`93ef69d`. Reiner Prüfbericht, keine Codeänderung.

## Rolle und Vorgehen

Zugtrupp-Helfer, der im Bereitstellungsraum die Übersicht führt: Einheiten
kommen an, stehen Stunden, werden auf Abruf in Einsatzabschnitte entsandt,
kommen zurück, werden abgelöst oder entlassen. Gerät: Tablet quer
(1024×768), Telefon (390×844), Fernseher (1920×1080) für den Lagemonitor.

Durchgespielt mit Playwright (Chromium) gegen die laufende App, nicht aus dem
Code gelesen:

- Einsatz „BR Hunte“ angelegt; 15 vollständige Bögen per Link aufgenommen
  (THW ZTr, B, FGr R (A)/(B), WP, N, E; Feuerwehr; DRK, JUH, MHD, DLRG), dazu
  5 Schnellerfassungen (THW, Feuerwehr, Bundeswehr, ASB). Die Bögen sind für
  die Prüfung gebaut (Personal, Fahrzeuge, Sofortbedarf, Ernährung), die
  Sollwerte der Summen daraus von Hand gerechnet.
- Suchen, Filtern, Sortieren, Tabelle; Auftrag setzen, Abrücken, „Wieder
  anwesend“, Zeiten korrigieren, Stärke ändern, Folgemeldung, Aufteilen,
  Entfernen und Zurückholen, Einsatz löschen.
- Lagemonitor (Zeilen und Tafel), Lageblatt, Sammel-PDF, beide CSV.
- Übergabe an ein zweites Gerät (eigener Browser-Kontext), beide Geräte
  arbeiten weiter, Abgleich in beide Richtungen.
- Offline (`setOffline(true)`, Neuladen, Exporte, Lagemonitor), Geräteuhr
  neun Stunden vorgestellt, Nachtmodus, Papier-Rückfall (Seiten der
  Sammel-PDF als Bilder eingelesen, „Lage vom Papier abgleichen…“).

Skripte und Bilder lagen außerhalb des Repos (Prüfstand).

Kennzeichnung: **neu** = in Runde 1 nicht berichtet; **Runde 1 offen** =
dort schon genannt und weiter vorhanden; **Lücke** = laut `PRODUCT.md`
bewusst nicht Teil der App, für diese Rolle aber spürbar.

## Zusammenfassung

| Priorität | Anzahl |
| --- | --- |
| P0 | 0 |
| P1 | 2 |
| P2 | 7 |
| P3 | 8 |

Kein P0: Alle Summen stimmten in jedem geprüften Zustand rechnerisch (siehe
„Was gut funktioniert“), es ging nichts verloren, auch nicht offline und
nicht beim Abgleich zweier Geräte.

## Befunde

### P1-1 Suche findet kein Fahrzeug und kein Gerät (neu)

**Beobachtung.** Die Suche greift auf Einheit, Organisation, Ort,
Kennzeichen, Funkrufname und Auftrag, nicht auf den Fahrzeugtyp. Im Bestand
standen drei Einheiten mit Radlader oder Bagger, zwei mit Netzersatzanlage,
eine mit Schmutzwasserpumpe:

| Suchwort | Treffer |
| --- | --- |
| Radlader, Bagger, Kipper, NEA, SwPu | 0 („Keine Einheit passt zu ‚Radlader‘“) |
| THW-81217 (Kennzeichen des Radladers), 24/72 | 1 |
| Räumen | 3 |

Die zugeklappte Karte zeigt weder Fahrzeuge noch Funkrufname noch
Führungskraft, die Tabelle nur die Zahl „Kfz“. Der Qualifikationsfilter
kennt „Bed. Bagger/Radlader“ (die Bediener), aber nicht das Gerät. Einen
Filter nach Organisation, Einheitstyp oder Fahrzeug gibt es nicht
(Organisation nur als Sortierung). Die Typen stehen in den Daten: Die
CSV-Übersicht führt „LKW Kipper / Radlader / Anh Tieflader“.

**Nachstellen.** Einsatz mit einer FGr R (B) samt Radlader öffnen, in
„Suche“ „Radlader“ tippen.

**Auswirkung.** Die Frage der Führung „Welche Fachgruppe mit Radlader steht
noch bei dir?“ beantwortet die App nur, wenn ich weiß, dass ein Radlader zur
FGr R (B) gehört, und dann jede Karte einzeln aufklappe. Bei Feuerwehr und
Hilfsorganisationen (Freitext-Typen wie „SW 2000“, „Betreuungs-LKW“) hilft
auch das Fachwissen nicht.

**Vorschlag.** Fahrzeugtyp (Kurzform und Name) und Sondergerät in den
Suchindex nehmen; auf der zugeklappten Karte eine Zeile mit den Kurzformen
der Fahrzeuge („LKW Kipper · Radlader · Anh Tieflader“).

### P1-2 Nur ein Status „abgerückt“: entsandt und entlassen sind nicht zu trennen (Lücke)

**Beobachtung.** Eine Einheit ist anwesend oder abgerückt. Ob sie im
Einsatzabschnitt arbeitet und zurückkommt oder nach Hause entlassen ist,
steht nur im Freitext „Auftrag/Notiz“. Im Test: Westerstede „EA 2 Deich
Nord“, Ammerland „EA 1 Wasserförderung“, Malteser „entlassen, Heimfahrt“;
alle drei stehen gleich unter „Abgerückt (n)“, auf der Tafel unter
„Abgerückt 4 Einheiten“ mit Uhrzeit, aber ohne Ziel. Der Filter „Auftrag“
kennt nur „alle“ und „ohne Auftrag“, nicht die einzelnen Aufträge.

**Nachstellen.** Zwei Einheiten mit verschiedenen Aufträgen abrücken lassen,
Filter „Auftrag“ und Tafel ansehen.

**Auswirkung.** „Was ist im EA 2, was ist ganz weg?“ muss ich aus den
Notizen zusammenlesen. Wer den Freitext uneinheitlich schreibt („EA2“,
„Abschnitt 2“), findet nichts wieder. `PRODUCT.md` kennt für die Rolle
„bereitstehen“ und „abgerückt“ und verweist die Auftragsverfolgung nach
S1-Control; deshalb Lücke, kein Fehler. Für den Bereitstellungsraum mit
Rückkehrern ist sie die größte.

**Vorschlag.** Kleinster Schritt ohne neuen Status: Der Filter „Auftrag“
bietet die vorhandenen Auftragstexte zur Auswahl, und die Tafel zeigt bei
Abgerückten den Auftrag. Ob ein eigener Zustand „entlassen“ hierher gehört,
ist eine Produktentscheidung.

### P2-1 Suche verknüpft Wörter einzeln: „EA 2“ trifft auch den EA 1 (neu)

**Beobachtung.** „EA 2“ lieferte drei Einheiten: zwei mit Auftrag „…EA 2…“
und die Kreisfeuerwehrbereitschaft mit Auftrag „EA 1 Wasserförderung
Hunte“, weil „EA“ im Auftrag und „2“ im Kennzeichen „WST-KF 2“ steht.

**Auswirkung.** Wer die Trefferliste am Funk vorliest, meldet eine Einheit
im falschen Abschnitt. Verschärft P1-2, weil die Suche der einzige Weg zum
Abschnitt ist.

**Vorschlag.** Wörter eines Suchbegriffs müssen im selben Feld stehen, oder
Anführungszeichen erzwingen die Wortfolge.

### P2-2 Keine Stärke der Abgerückten und keine Gesamtzahl aller Erfassten (neu)

**Beobachtung.** Kopf, Bedarf, Tafel und Lageblatt rechnen nur die
Anwesenden. Für die Abgerückten gibt es die Zahl der Einheiten („21 gemeldet
· 16 anwesend“, Tabellenfuß „17 zählend · 2 abgerückt“), aber keine Stärke
und keine Fahrzeugzahl. Der Statusfilter „nur Abgerückte“ ändert die Summen
nicht.

**Auswirkung.** „Wie viele Kräfte sind über den Bereitstellungsraum
gelaufen, wie viele sind draußen?“ rechne ich von Hand aus den Karten.

**Vorschlag.** Unter der Summenzeile eine zweite, kleine Zeile „abgerückt: n
Einheiten, Stärke x/y/z//g, n Fahrzeuge“; im Tabellenfuß eine zweite
Summenzeile.

### P2-3 Verpflegungszahl heißt je Ansicht etwas anderes (neu)

**Beobachtung.** Bei 105 Anwesenden, von denen Einheiten mit zusammen 49
Portionen Verpflegung angefordert hatten:

| Ort | Anzeige |
| --- | --- |
| Hauptfenster, Bedarf | „angefordert 49, Stärke 105 (7 vegetarisch / 1 vegan)“ |
| Lagemonitor, Zeilen und Tafel | „Verpflegung 105“ |
| Tabelle, Spalte „Verpfl.“, Summe | 105 (je Einheit die Stärke, auch ohne Anforderung) |
| Lageblatt | „Verpflegung: 49 angefordert (105 Personen vor Ort)“, ohne vegetarisch/vegan |
| Übergabe-Übersicht der Sammel-PDF | „angefordert 49 Portionen, Stärke 105 (97 Fleisch / 7 vegetarisch / 1 vegan)“ |

**Auswirkung.** Der Verpflegungstrupp bekommt je nach Blatt 49 oder 105
gemeldet. Das Lageblatt, das ich am ehesten aushänge oder weitergebe, nennt
die Vegetarier nicht.

**Vorschlag.** Überall dieselbe Formel wie im Hauptfenster; vegetarisch und
vegan in die Bedarfszeile des Lageblatts.

### P2-4 Sofortbedarf einer Einheit ohne Bogen lässt sich nicht erfassen (neu)

**Beobachtung.** Die Schnellerfassung fragt Stärke, vegetarisch/vegan,
Führungskraft und Fahrzeuge, aber weder Verpflegung, Unterbringung, Ruhezeit
noch Kraftstoff. An der Karte gibt es unter „Mehr…“ kein „Bedarf ändern“
(nur Aufteilen, Stärke ändern, Übung, Ort ändern, Verschieben, Entfernen).
Die App sagt das ehrlich („Der Bedarf ist bei 3 Einheiten nicht erfasst —
‚keine‘ … heißt dort nicht ‚nichts nötig‘“).

**Auswirkung.** Meldet mir der Gruppenführer nach drei Stunden „wir brauchen
Unterbringung und 80 l Diesel“, bleibt nur die Notiz; in Bedarf, Tafel und
Lageblatt fehlt es. Der Weg über den Erfassungsbogen ist für einen Zuruf zu
lang.

**Vorschlag.** „Bedarf ändern…“ an der Karte nach dem Muster von „Stärke
ändern…“ (neue Fassung, Historie, Rückgängig).

### P2-5 Nach einer Stunde trägt jede Einheit dauerhaft eine Warnung (neu)

**Beobachtung.** Mit vorgestellter Uhr (neun Stunden): jede Karte „⚠ Stand
vor 10 Std 1 Min“, Kopf „⚠ älteste Meldung vor 10 Std 1 Min, 16 von 16 älter
als 1 Std“, Filter „nur ⚠ ältere als 1 Std (15)“. Einen Weg „Stand
bestätigt, Angaben stimmen noch“ habe ich nicht gefunden.

**Auswirkung.** Im Bereitstellungsraum stehen Einheiten planmäßig
stundenlang. Wenn alles warnt, warnt nichts mehr; der Filter verliert seinen
Sinn.

**Vorschlag.** „Stand bestätigen“ an der Karte (Vermerk mit Uhrzeit, setzt
das Alter zurück), oder die Schwelle je Einsatz einstellbar.

### P2-6 Zu wenig Einheiten auf einem Bildschirm (neu für das Tablet)

**Beobachtung.** Tablet quer: Die Einheitenliste beginnt erst nach
Summenzeile, Aufnahmeknöpfen, „Neu seit dem letzten Mal“ und Bedarf; eine
Karte ist rund 240 px hoch, drei passen ins Bild, 19 Einheiten brauchen
über sechs Bildschirme. Die Tabelle zeigt sieben Zeilen, weil „Alter“
(„Stand vor 47 Min“) vierzeilig und der Name ausgeschrieben umbricht
(„Fachgruppe Notversorgung und Notinstandsetzung“ statt „FGr N“). Am
Telefon liegt die Liste bei y = 973 px, die Seite ist 6265 px hoch.

**Auswirkung.** „Wer steht gerade hier?“ auf einen Blick beantwortet nur die
Tafel des Lagemonitors, nicht das Arbeitsfenster.

**Vorschlag.** In der Tabelle Kurzformen des Vokabulars und einzeilige
Zellen; eine dichte Kartenfassung (eine Zeile je Einheit mit Stärke,
Auftrag, Abrücken).

### P2-7 Einen Zug entsenden heißt: jede Teileinheit einzeln, und der zweite Tipp geht verloren (neu)

**Beobachtung.** Es gibt keine Mehrfachauswahl und seit dem 11.11.2026
keine Zug-Zuordnung mehr. Nach einem Statuswechsel sperrt der Tipp-Schutz
kurz: Ein Tipp auf „Abrücken“ der nächsten Einheit 300 ms und 700 ms danach
blieb ohne Wirkung, ab 1200 ms wirkte er. Derselbe Schutz verschluckte im
Test einen Tipp auf „Einheit manuell erfassen…“ (Knopf zeigt „Einen Moment
…“).

**Nachstellen.** Bei zwei Einheiten nacheinander zügig „Abrücken“ tippen.

**Auswirkung.** Rückt ein Zug mit vier Teileinheiten ab, bleibt bei zügigem
Tippen eine als anwesend stehen, und die Stärke ist zu hoch, bis es jemand
merkt. Der Schutz ist gewollt (Liste rutscht unter dem Finger); der
verlorene Tipp fällt nur auf, wenn man hinsieht.

**Vorschlag.** Mehrfachauswahl „Markierte abrücken…“ mit gemeinsamem
Auftrag; beim verschluckten Tipp eine deutliche Meldung an der Quittung.

### P3-1 Aufteilen mit „ist abgerückt“ setzt keine Abrückzeit (neu)

Der abgeteilte Trupp steht als „abgerückt (Abrückzeit nicht bestätigt)“,
obwohl er in diesem Moment abrückt; die Zeit muss über „ändern“ nachgetragen
werden. Die Personenliste im Aufteilen zeigt nur „Kf B“, nicht Führer oder
Unterführer. Vorschlag: Zeit mit „jetzt“ vorbelegen, Rolle anzeigen.

### P3-2 Marke „neu · kürzlich eingetroffen“ bleibt bis zur Kenntnisnahme (neu)

Nach neun Stunden stand an Einheiten weiter „neu · kürzlich eingetroffen“;
sie verschwand erst mit „Zur Kenntnis genommen“. „Kürzlich“ stimmt dann
nicht. Vorschlag: Wortlaut „neu seit der letzten Durchsicht“ oder Zeitgrenze.

### P3-3 Zusatzqualifikationen fehlen in den Details; AGT steht zweimal im Filter (neu)

Der Filter fand „2× Bed. Bagger/Radlader: Sven Krause, Maria Lehmann“, die
Personaltabelle unter „Details“ zeigte bei beiden nur „Kf CE“ und „Kf B“
(`funktionsText` gibt Funktionen und Fahrerlaubnis aus, nicht
`zusatzqualifikationen`). Im Filter stehen „AGT – Atemschutzgeräteträger/in
(2)“ (THW-Vokabular) und „Atemschutzgeräteträger (2)“ (Freitext Feuerwehr)
getrennt. Einschränkung: Die Prüfbögen sind gebaut; wie der Erfassungsbogen
die Zusatzfunktion ablegt, habe ich nicht geprüft.

### P3-4 Art „Bereitstellungsraum“ fehlt; Startseite nennt die entfallene Excel-Liste (neu)

`PRODUCT.md` nennt die Arten „Einsatz, Übung, Bereitstellungsraum“, der
Dialog bietet „Einsatz, Übung, Veranstaltung“. Die Startseite verspricht
unter „Weitergabe“ die „Excel-Liste im Format ‚Oldenburg‘“, die laut
`docs/funktionsumfang.md` seit dem 09.11.2026 entfällt; einen Knopf dafür
gibt es nicht.

### P3-5 Lageblatt ohne DTG und Absender (Runde 1 offen)

Kopf: „Lageblatt: BR Hunte · Erstellt 24.11.2026, 20:59“. Der im
Lagemonitor eingetragene Funkrufname der Führungsstelle und die DTG stehen
nicht darauf. Eine kurze Stärkemeldung als Text zum Vorlesen oder Kopieren
(„BR Hunte, DTG, 2/19/84//105, 24 Fahrzeuge“) gibt es nicht; die Tafel
zeigt sie, das Papier nicht.

### P3-6 Lagemonitor „Zeilen“ zeigt bei 15 Einheiten drei (neu)

Vorgabe ist „Zeilen“; bei 1920×1080 standen drei Einheiten und „+ 12
weitere Einheiten“ da. Die Tafel zeigte alle 15. In der Bedarfszeile der
Zeilen-Ansicht steht das Warnzeichen hinter dem vorigen Wert („Verpflegung
105⚠ · Ruhezeit 1×⚠ · Unterbringung …“) und liest sich, als gehöre es zur
Verpflegung. Vorschlag: ab etwa sechs Einheiten die Tafel vorschlagen.

### P3-7 „Bedarf nicht erfasst“ uneinheitlich (neu)

Von vier Schnellerfassungen ohne Bedarfsangabe trugen drei die Marke, die
THW-Einheit mit StAN-Fahrzeugen nicht („bei 3 Einheiten nicht erfasst“).
Ursache nicht untersucht.

### P3-8 Bogen-Link während offener Schnellerfassung (neu)

Kommt ein Link an, während „Einheit erfassen“ offen ist, nimmt „In ‚BR
Hunte‘ aufnehmen“ den Bogen auf, die Ansicht bleibt aber in der leeren
Erfassung; die Summe und die Quittung sieht man erst nach dem Rückweg. Beim
nächsten Start öffnete die App wieder die leere Erfassung statt des
Einsatzes.

## Aus Runde 1 nachgeprüft

- Telefon bedienbar (P0 Runde 1): behoben; Knöpfe über der Liste, Ansichts-
  und Nachtwahl wirken bei 390 px.
- Lagemonitor mit Bedarf, Gesamt je Einheit, Nachträgen („nachgetragen, da
  seit 18:40“): vorhanden.
- Stand von Lageblatt und Übergabe unter der Summe („Lageblatt … – nicht
  mehr aktuell · übergeben … – seitdem Neues“): vorhanden und richtig.
- Zeitprüfung: Abrückzeit vor dem Eintreffen und in der Zukunft fragen nach.
- Browser-Zurück aus der Erfassung führt in den Einsatz.
- Offen geblieben: DTG und Absender im Lageblatt (P3-5).

## Was gut funktioniert

- **Die Summen stimmen.** Gegen die von Hand gerechneten Sollwerte geprüft:
  Aufbau 19 Einheiten 3/26/117//146, 34 Fahrzeuge, Verpflegung angefordert
  78, 12 vegetarisch / 2 vegan, Diesel 530 l, Unterbringung 43 Personen; nach
  jedem Abrücken, „Wieder anwesend“, Folgemeldung (9 → 7), Stärke ändern
  (9 → 6), Aufteilen, Entfernen und Zurückholen jeweils richtig, gleich in
  Kopf, Tabellenfuß, Tafel, Lageblatt und CSV.
- **Abrücken** ist ein Tipp, mit Uhrzeit, Vermerk in der Historie und
  „Rückgängig“; Abgerückte stehen durchgestrichen in eigenem Block. Die
  Historie nennt am Folgetag das Datum („24.11., 21:06 Abgerückt“).
- **Abgleich zweier Geräte**: Beide Geräte änderten unabhängig (Abrücken,
  Rückkehr, neue Einheit, Aufteilen, Auftrag); nach dem Import in beide
  Richtungen standen beide bei 16 Einheiten 2/21/80//103. Der Widerspruch
  beim Auftrag wurde benannt und blieb bis „Erledigt“ stehen; die geänderte
  Nummer (Nr. 20/21) wurde mit Warnung gemeldet.
- **Offline**: Neuladen ohne Netz, Abrücken, Lageblatt, Sammel-PDF, CSV,
  Blanko-Vordruck, Schnellerfassung und Lagemonitor liefen.
- **Tafel** des Lagemonitors: alle Einheiten mit taktischem Zeichen, Stärke
  und Uhr groß, DTG, Abgerückte mit Uhrzeit; aktualisiert sich beim Abrücken
  im Hauptfenster sofort.
- **Entfernen und Löschen** fragen nach, nennen die Folgen und lassen sich
  zurückholen (7 bzw. 30 Tage).
- **Papier-Rückfall**: Seiten der Sammel-PDF als Bilder eingelesen, zwei
  Bögen erkannt, zwei Übersichtsseiten richtig als „ohne Code“ gemeldet,
  „Lage vom Papier abgleichen…“ bietet Nummer, Eintreffzeit, Status, Auftrag.
- **Nachtmodus** auf Tablet und Telefon lesbar, Abgerückte bleiben erkennbar.

## Nicht geprüft

- Kamera-Scan und USB-Handscanner (kein Gerät; der Scanner meldet richtig
  „keine nutzbare Kamera“ und bietet Foto und Handscanner an).
- Echter Dauerbetrieb über Stunden, Akku, Bildschirmsperre; nur die Uhr
  wurde vorgestellt.
- Drucken auf Papier, Electron- und Android-Hülle, AirDrop/Quick Share.
- Datensicherung einspielen, Signaturprüfung, Datenschutzfrist.
- Ein verlorener Tipp auf „Abrücken“ direkt nach dem Speichern eines
  Auftrags an einer anderen Karte trat einmal auf und ließ sich danach nicht
  wiederholen; vermutlich derselbe Tipp-Schutz wie in P2-7.
- Annahmen über THW-Abläufe (Zug rückt geschlossen ab, Verpflegung wird nach
  Köpfen gemeldet, Rückkehrer aus dem Abschnitt) sind meine, nicht belegt.
