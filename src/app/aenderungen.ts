/**
 * Änderungsverlauf für Nutzerinnen und Nutzer („Was ist neu"), aufrufbar über
 * die Versionsnummer in der Fußzeile. Wer die App bei einer Übung benutzt hat,
 * soll nachlesen können, was seither anders ist, ohne die Commit-Liste auf
 * GitHub zu lesen.
 *
 * Herkunft: Erfassungsbogen `src/app/aenderungen.ts` (Aufbau, Monatssätze,
 * Regeln). Die Einträge sind die der Meldekopf-App seit ihrer ersten Fassung
 * am 2026-10-25; was davor in der Einsatz-Sammlung des Erfassungsbogens
 * geschah, steht in dessen Verlauf.
 *
 * Gepflegt von Hand, neueste Einträge oben. Nur, was man in der App, auf dem
 * Papier oder in Exporten bemerkt; Technik (Abhängigkeiten, Tests,
 * Prüfberichte) bleibt draußen. Ein Eintrag je Tag, Datum als ISO-Datum.
 */

export interface Aenderung {
  /** Tag der Änderung, ISO (JJJJ-MM-TT). */
  datum: string;
  punkte: readonly string[];
}

/**
 * Ein Satz je Monat über den Einträgen: Wer nach Wochen zurückkommt, liest zuerst
 * das Wichtigste und blättert nur bei Bedarf in die Tage. Schlüssel JJJJ-MM; jeder
 * Monat mit Einträgen braucht einen Satz (Test in fusszeile.test.tsx).
 */
export const MONATE: Readonly<Record<string, string>> = {
  "2026-11":
    "Die Einsatz-Sammlung ist ganz aus dem Erfassungsbogen herübergekommen und liest auch dessen neue Bögen. Dazu die Tafel für den Fernseher im Führungsfahrzeug, Sammlungen nachträglich als Übung führen, Einzelpersonen wie Fachberater, orange und graue Zeichen für Gerät von Partnern, die Kopplung von bis zu fünf Telefonen an einen Rechner im lokalen Netz ohne Internet, eine Einsatzansicht für breite Bildschirme und ein Scanner, der neben den Bögen die Kennzeichen liest, um Fahrzeuge als rausgefahren oder zurück zu vermerken. Die Zuordnung zu Zügen entfällt.",
  "2026-10":
    "Erste Fassung als eigene App: Einsätze anlegen, Bögen per QR-Code, Handscanner, Foto, PDF oder Datei aufnehmen, Einheiten ohne Bogen schnell erfassen, Lagemonitor, Datensicherung, Offline-Betrieb und eine App für Android. Nach der ersten Prüfrunde bedienbarer am Telefon und in der Nacht.",
};

export const AENDERUNGEN: readonly Aenderung[] = [
  {
    datum: "2026-11-26",
    punkte: [
      "Kennzeichen im Scanner: Die Kamera sucht jetzt zuerst das Schild im Bild und liest nur diesen Ausschnitt, vergrößert. Vorher wurde der ganze Rahmen gelesen, und ein Kennzeichen an einem Fahrzeug mit Aufschrift und Umgebung im Bild blieb unerkannt. Bei THW-Kennzeichen genügen die Ziffern.",
      "Kennzeichen im Scanner: Liest die Kamera ein Kennzeichen, das zu keinem Fahrzeug der Sammlung gehört, steht das jetzt da („Kennzeichen gelesen: … – kein Fahrzeug dieser Sammlung“), statt dass nichts geschieht.",
    ],
  },
  {
    datum: "2026-11-25",
    punkte: [
      "Neu: „Was ist neu“. Ein Tipp auf die Versionsnummer in der Fußzeile zeigt diesen Verlauf, monatsweise zum Blättern.",
      "Neu: Kennzeichen im Scanner. „Bogen scannen…“ liest mit derselben Kamera auch die Kennzeichen der Fahrzeuge der Sammlung. Steht ein Kennzeichen im Rahmen, erscheint das Fahrzeug mit „Fährt raus“ und „Kommt zurück“: So wird vermerkt, wer den Bereitstellungsraum verlässt und wer zurückkommt, ohne dass die Einheit abrückt. Ohne Kamera geht dasselbe über „Kennzeichen tippen…“ im Scanner oder „Fahrzeuge am Tor…“ unter den Summen; dort genügen die letzten Zeichen. Die Karte der Einheit zeigt, welche Fahrzeuge seit wann unterwegs sind, jede Bewegung steht mit Uhrzeit im Verlauf. Die Stärke der Einheit bleibt unverändert. Das Kamerabild wird nur auf dem Gerät ausgewertet und nicht gespeichert. Auf gekoppelten Telefonen (Sammler) gibt es das noch nicht.",
      "Kopplung: Ein Scan am Telefon genügt. Der Rechner im Fahrzeug braucht dafür weder Kamera noch Handscanner; der Antwort-Code bleibt als Ausweichweg, falls ein Browser nicht mitspielt.",
      "Kopplung: Lädt das Telefon oder der Rechner die Seite neu, finden sich beide ohne neuen Scan wieder. Gemerkt wird die Kopplung bis zu 30 Tage; „Kopplung trennen“ und „Alle Daten löschen“ entfernen sie.",
      "Kopplung: Ein Rechner führt jetzt bis zu fünf Telefone. Jedes bekommt einen Namen, etwa „Eingang Nord“, und am Rechner steht für jedes, ob es verbunden ist und wann zuletzt etwas kam.",
      "Kopplung: Der Stand des Rechners gilt. Jedes verbundene Telefon zeigt alle Einheiten, die der Rechner führt, auch die der anderen Telefone. Was ein Telefon ohne Verbindung aufnimmt, steht dort als „… wartet“ und geht mit der nächsten Verbindung nach.",
      "Kopplung: Der Dialog zeigt die Netzadressen beider Geräte und ob sie einander erreichen, und warnt, wenn sie in verschiedenen Netzen hängen. Firefox kann jetzt auch das erste Gerät sein, und mit einem iPhone geht das Anklopfen schneller.",
      "Kopplung: Der Code am Rechner lässt sich auch mit der Kamera des Telefons scannen. Sie öffnet die App im Browser, und die Geräte verbinden sich; „Bogen scannen…“ in der App geht weiter.",
      "Einsatzansicht am Rechner: Links steht die Liste als Tabelle mit taktischem Zeichen, Name, Organisation, Auftrag, dringendem Bedarf, Eintreffzeit und Stärke, rechts die ganze Karte der gewählten Einheit mit der Stärke als vier Kacheln. Die Liste lässt sich nach Organisation gruppieren, die übrigen Filter liegen hinter „Filter…“.",
      "Neu: Sofortbedarf abhaken. An der Karte ist jede Marke wie „Ruhezeit“, „Unterbringung angefordert“ oder „Diesel 400 l“ ein Schalter: Ein Tipp vermerkt den Bedarf als geklärt, mit Haken und Uhrzeit, der nächste nimmt den Haken zurück. Geklärtes tritt in der Liste zurück und fällt aus dem Filter „nur dringender Bedarf“. Meldet die Einheit später einen anderen Bedarf, ist er wieder offen. Die Summen rechnen unverändert mit dem gemeldeten Bedarf.",
      "Neben „Ruhezeit: 5 Einheiten“ und der angeforderten Unterbringung steht jetzt, was davon noch offen ist („davon 2 offen“ oder „alle geklärt“). Das Lageblatt nennt abgehakten Bedarf als „Ruhezeit (geklärt)“ und nicht mehr fett. Auf der Tafel für den Fernseher steht abgehakter Bedarf ruhig mit Haken neben der Einheit („✓ Ruhezeit“), das Warnzeichen trägt nur noch, was zu entscheiden ist.",
      "Neu: „Hinweise gesehen“ an der Karte. Zur Kenntnis genommene Prüfhinweise zählen in der Liste nicht mehr mit; kommt ein neuer Hinweis dazu, erscheint er wieder. „Wieder zeigen“ kehrt das um.",
      "Karte der Einheit: Die Zeile „Absender“ mit Name, E-Mail und Telefon aus der Signatur steht nicht mehr über der Führung. Wer den Bogen geschickt hat, steht weiter in den Details und im PDF.",
    ],
  },
  {
    datum: "2026-11-24",
    punkte: [
      "Neu: zweites Gerät koppeln. Das Telefon scannt draußen, der Rechner im Fahrzeug zeigt die Lage. Beide verbinden sich direkt im selben Netz, ohne Internet und ohne Server. Das Telefon ist dabei reiner Sammler: Es schickt, was es aufnimmt, und zeigt „✓ übertragen“, sobald die Meldung beim Rechner angekommen ist.",
      "Kopplung: Eine Lampe oben im Bild sagt auf beiden Geräten, ob die Verbindung steht, unterbrochen oder getrennt ist. Geht der Bildschirm des Telefons aus, verbindet es sich danach von selbst wieder.",
      "CSV „Alle Daten“: Bei einer Schnellerfassung stand unter Verpflegung 1 statt der Stärke. Verpflegung und Unterbringung rechnen jetzt wie Übersicht und Lageblatt.",
      "Karte und Tabelle zeigen Führung mit Rückrufnummer, Funkrufname und Fahrzeuge. Die Suche findet Fahrzeugtyp, Sondergerät und den Funkrufnamen der Führungskraft, der Filter „Auftrag“ bietet die vergebenen Aufträge, und die Tafel nennt bei Abgerückten den Auftrag als Ziel.",
      "„Angaben berichtigen…“ an von Hand erfassten Einheiten: Die neue Fassung steht unter derselben Nummer, statt die Einheit doppelt zu erfassen.",
      "Schnellerfassung: Einsatzzeitraum, Rolle, Geschlecht und Ernährung bleiben leer, wenn niemand sie angegeben hat. Fehlt der Bedarf, steht „Bedarf nicht erfasst“, und „Bedarf ändern…“ an der Karte trägt ihn nach.",
      "Unter den Summen stehen Fahrzeuge, Stärke je Organisation, Abgerückte und „Stärkemeldung…“ als eine Zeile mit DTG. „Stand bestätigen“ an Karten mit Angaben älter als eine Stunde, mit Rückgängig.",
      "Tastatur: „/“ springt in die Suche, Strg+Eingabetaste übernimmt.",
    ],
  },
  {
    datum: "2026-11-17",
    punkte: [
      "Der Hinweis auf eine neue Fassung steht oben im Bild, hat größere Knöpfe und sagt, dass „Neu laden“ alle Fenster der App neu startet. Der Lagemonitor holt das Vollbild nach dem Neuladen mit dem ersten Klick oder Tipp zurück.",
    ],
  },
  {
    datum: "2026-11-15",
    punkte: [
      "Gerät von Partnern, etwa ein Anhänger der Gemeinde, bekommt in der Schnellerfassung über „Farbe des Zeichens“ ein oranges (kommunal) oder graues taktisches Zeichen. Die Farbe steht auch in der Fahrzeugtabelle, im PDF und in der CSV. Bögen mit dieser Angabe aus dem Erfassungsbogen werden gelesen.",
      "Einzelpersonen mit eigenem Bogen, etwa Fachberater oder Baufachberaterin, stehen auf der Tafel als Raute mit dem Kürzel der Funktion. Zwei Personen gleicher Funktion aus derselben Dienststelle bleiben zwei Meldungen, und beim Aufteilen lässt sich eine einzelne Person als Einzelperson abteilen.",
    ],
  },
  {
    datum: "2026-11-13",
    punkte: [
      "Eine offene App sucht stündlich, nach einer Pause und wenn das Netz wiederkommt selbst nach einer neuen Fassung. Ist sie aktiviert, lädt jedes Fenster der App neu, auch der Lagemonitor am Fernseher.",
      "Bögen ohne eingetragenen Einsatzzeitraum zeigen ein leeres Feld statt „01.01.2020 – 01.01.2020“, und die Prüfung meldet „Zeitraum fehlt“.",
      "Die Prüfung meldet auch zu wenig angeforderte Verpflegung, etwa für 5 Personen bei einer Stärke von 8. Null bleibt ohne Hinweis, das sind Selbstversorger.",
      "Die FGr Öl (B) trägt den Funkrufnamen 56/45.",
    ],
  },
  {
    datum: "2026-11-12",
    punkte: [
      "Tafel: In der breiten Fassung konnte ein gekürzter Funkrufname oder ein langer Bedarf die Tafel zum Absturz bringen, der Fernseher zeigte dann die Zeilen. Das ist behoben. Kurzformen wie „FGr“ werden nie gekürzt.",
      "Wird die Art einer Sammlung umgestellt, gilt das Lageblatt als nicht mehr aktuell, und „Einsatz bearbeiten…“ fragt beim Wechsel der Art nach.",
    ],
  },
  {
    datum: "2026-11-11",
    punkte: [
      "Die Zuordnung zu Zügen entfällt: kein Zug an der Karte, keine Zwischensummen und Spalten nach Zug mehr. Die Tafel gliedert nach Organisation. Ein Zug in alten Sammlungen bleibt erhalten und reist unverändert mit.",
      "Eine Sammlung lässt sich nachträglich als Übung führen: über „Als Übung führen…“ am Hinweis „Nichts gezählt“, über „Einsatz bearbeiten…“ oder beim ersten Übungsbogen. Danach gibt es „Rückgängig“. Zwei gekoppelte Geräte gleichen die Art miteinander ab.",
      "Tafel: Übungsbögen in einer echten Lage stehen als eigene, ungezählte Gruppe „Übung“ da. Wer abgerückt ist, steht immer mit Uhrzeit in der Randspalte.",
      "Tafel: Lange Namen bekommen die übliche Kurzform (FF, DRK-KV, JUH RV, Bw, OV), statt mitten im Wort abgeschnitten zu werden. Eine geänderte Stärke steht mit Vorzeichen da („Stärke −2“), und der Knopf heißt „Tafel zeigen“ oder „Zeilen zeigen“.",
    ],
  },
  {
    datum: "2026-11-10",
    punkte: [
      "Neu im Lagemonitor: die Tafel für den Fernseher im Führungsfahrzeug. Alle Einheiten stehen mit taktischem Zeichen an festem Platz, oben die Stärkemeldung und die Uhr, am Rand Bedarf, letzte Bewegungen und Datenstand. Wahlweise bleiben die Zeilen.",
      "Die Startseite führt neben „Bögen sammeln“ zum Erfassungsbogen. Wer von hier einen Bogen im Erfassungsbogen öffnet, bekommt dort „An Meldekopf-App geben“ als Rückweg. Der Hinweis „Im Aufbau“ ist entfernt.",
    ],
  },
  {
    datum: "2026-11-09",
    punkte: [
      "Bögen aus dem aktuellen Erfassungsbogen, mit Einsatzzeitraum samt Uhrzeit, Dienststelle und Funkrufname je Person, werden gelesen. Bisher lehnte die App sie ab.",
      "Die Einsatzansicht ist auf dem Stand des Erfassungsbogens und öffnet auch ohne Netz. Die Excel-Liste „Oldenburg“ entfällt.",
    ],
  },
  {
    datum: "2026-10-28",
    punkte: [
      "Die Fußzeile verlinkt einsatzauftrag.app.",
    ],
  },
  {
    datum: "2026-10-26",
    punkte: [
      "Lagemonitor mit Gesamtstärke, Bedarf und Nachträgen. Der Papier-Abgleich prüft die Zeiten.",
      "Die Zurück-Taste des Browsers bleibt in der App: Sie schließt zuerst ein offenes Fenster, dann geht es einen Schritt zurück.",
      "„Stärke ändern“ hat dieselben Zähler wie die Schnellerfassung. Am Telefon steht in der Tabelle die Gesamtstärke neben dem Namen.",
      "Neben der Summe steht, wann zuletzt ausgegeben wurde; der Knopf heißt „Einsatz übergeben (PDF mit Daten)“.",
      "Im Nachtmodus unterscheiden sich Warnung, Hinweis und Aktion auch in der Form, und Dialoge dunkeln die Seite ab.",
    ],
  },
  {
    datum: "2026-10-25",
    punkte: [
      "Erste Fassung der Meldekopf-App: Einsätze anlegen, Bögen sammeln, Stärke und Bedarf zusammenzählen, Liste und Tabelle, Lagemonitor, Lageblatt, CSV und Sammel-PDF. Sammlungen aus dem Erfassungsbogen kommen per Datensicherung oder Einsatz-Datei herüber.",
      "Bögen kommen per QR-Code, USB-Handscanner, Foto, PDF, Datei oder Bogen-Link in den Einsatz.",
      "Schnellerfassung: eine Einheit ohne Bogen in den Einsatz aufnehmen.",
      "Die App läuft nach dem ersten Aufruf ohne Netz und zeigt beim ersten Laden den Fortschritt. Dazu gibt es eine App für Android.",
      "Sind zwei Fenster offen, gleichen sie Sammlungen und Schnellerfassung miteinander ab. Am Telefon ist die Einsatzansicht bedienbar, und Aufteilen behält die Eintreffzeit.",
    ],
  },
];
