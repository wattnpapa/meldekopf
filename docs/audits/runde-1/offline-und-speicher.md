# Audit Meldekopf – Rolle: THW Offline Resilience Reviewer

Prüfstand: Produktions-Build http://localhost:5290. Eigener Browser-Kontext **mit** Service Worker (ohne die Sperre des Hilfsmoduls), 390 × 844 mit Touch. Abläufe: auf `navigator.serviceWorker.ready` und den Offline-Vorrat warten, dann `context.setOffline(true)` und neu laden. Skripte `o1.cjs` bis `o6.cjs` und `s38.cjs` liegen unter `(Prüfstand)/`.

Vorbemerkung zur Rolle: Die App hat keinen Server. „Angekommen" heißt hier deshalb „im Speicher dieses Geräts" oder „als Datei weitergegeben". Die Synchronisation zwischen Geräten läuft über Dateien (Sammel-PDF und „Einsatz importieren…").

## Urteil aus Sicht der Rolle

Ohne Netz geht die Arbeit vollständig weiter. Nach dem Neuladen im Funkloch öffnete die App direkt die Einsatzansicht mit allen Daten. Ohne Netz ließen sich nachweislich erledigen:

- eine Einheit manuell erfassen, inklusive OV-Verzeichnis;
- einen QR-Code aus einem Bild einlesen und eine PDF prüfen;
- Lageblatt, Sammel-PDF, Blanko-Vordruck, Excel-Liste „Oldenburg" und CSV erzeugen (alle als Download);
- den Lagemonitor öffnen;
- nach erneutem Neuladen ohne Netz sind alle Eingaben noch da.

Den Offline-Vorrat zeigt die Startseite ehrlich an: erst „⏳ Wird … geladen: 1,8 von 5,1 MB", nach einem Abbruch „⚠ Noch nicht offline bereit … ohne Netz diese Seite nicht neu laden". Fehlgeschlagene Netzanfragen gab es offline keine.

Reibung gibt es an zwei Stellen. Die Offline-Bereitschaft steht nur auf der Startseite, gearbeitet wird aber in der Einsatzansicht. Und das Wort „Weitergegeben" klingt nach Zustellung, bedeutet aber nur „Datei erzeugt".

## Befunde

### O1 – P2 – Der Stand des Offline-Vorrats ist nur auf der Startseite sichtbar

- **Fundstelle / Aufgabe:** Erster Aufruf auf einem neuen Gerät. Danach öffnet die App direkt im zuletzt genutzten Einsatz (`eeb.letzterEinsatz.v1`).
- **Beobachtung:**
  - Die Startseite zeigt den Ladefortschritt und nach einem Abbruch die Warnung „Noch nicht offline bereit". Nachgestellt durch Abbruch einer Vorratsdatei, Lauf `o5.cjs`.
  - Wird danach ohne Netz neu geladen, erscheint die Fehlerseite des Browsers (`ERR_INTERNET_DISCONNECTED`).
  - Die Einsatzansicht zeigt in keinem Lauf einen Offline- oder Vorratsstand. Laut Code wird `offlineText` nur auf der Startseite gezeichnet (`src/app/app.tsx`, Zeile 266).
- **Annahme:** Dass ein Helfer bei unvollständigem Vorrat in der Einsatzansicht ohne Warnung arbeitet, habe ich im Browser nicht stabil nachgestellt; das Abbrechen des Vorrats ließ sich nur einmal von drei Versuchen auslösen. Die Aussage stützt sich auf den Code.
- **Erwartung der Rolle:** Dort, wo ich arbeite, sehe ich: „Noch nicht offline bereit — nicht neu laden".
- **Auswirkung im Einsatz:** Gerät morgens eingerichtet, Einsatz angelegt, Netz bricht im Bereitstellungsraum weg. Ein Neuladen zeigt dann die Fehlerseite. Die Daten bleiben im Gerät, sind aber bis zum nächsten Netz nicht erreichbar.
- **Empfehlung:** Die Warnung zum unvollständigen Vorrat zusätzlich in der Einsatzansicht zeigen, solange er nicht vollständig ist.
- **Verifikation:** Vorratsdatei blockieren, Einsatz öffnen. Die Einsatzansicht zeigt den Warnhinweis mit „Jetzt neu laden", sobald wieder Netz da ist.

### O2 – P2 – „Weitergegeben" bedeutet nur „Datei erzeugt"

- **Fundstelle / Aufgabe:** Einsatzansicht nach „Einsatz weitergeben / sichern" (offline erzeugt).
- **Beobachtung:**
  - Im Kopf steht danach „Weitergegeben 25.10.2026, 21:03 — seitdem hier nichts Neues".
  - Dass das Gerät die Zustellung nicht kennt, steht nur weiter unten im Export-Block: „Gerechnet ab dem Erzeugen der Datei — ob sie beim Stab angekommen ist, weiß das Gerät nicht".
  - Auch der Nachtrag „Nur neue Bögen seit dem letzten Export" rechnet ab dem Erzeugen der Datei. Die Nachtrag-CSV ist dabei vorbildlich beschriftet („NACHTRAG seit … — nicht die ganze Lage").
- **Erwartung der Rolle:** Ich sehe auf einen Blick, ob die Lage beim Stab ist oder nur als Datei auf meinem Gerät liegt.
- **Auswirkung im Einsatz:** Ist der USB-Stick oder die Mail ohne Netz nicht rausgegangen, glaubt der Helfer trotzdem, die Lage sei weitergegeben. Beim nächsten „Nur neue Bögen" fehlen dem Stab dann Einheiten.
- **Empfehlung:**
  - Im Kopf „Datei erzeugt 21:03" statt „Weitergegeben" schreiben.
  - Optional eine Möglichkeit, die Ankunft von Hand zu bestätigen („Stab hat bestätigt").
- **Verifikation:** Nach dem Export unterscheidet die Kopfzeile „Datei erzeugt" von „Empfang bestätigt".

### O3 – P3 – Beim Import einer älteren Weitergabe-Datei verwirren die Meldungen

- **Fundstelle / Aufgabe:** Gerät A erzeugt eine Sammel-PDF und arbeitet weiter: eine Einheit abgerückt, eine neu erfasst. Danach wird die ältere PDF wieder eingelesen, einmal über „Bögen einlesen…" und einmal über Startseite → „Einsatz importieren…".
- **Beobachtung:**
  - Positiv: Die lokalen Änderungen bleiben erhalten (Abrücken und neue Einheit), nichts wird überschrieben. Die Quittung sagt „keine neue Einheit … Stand der Datei: letzte Meldung 20:41".
  - Gleichzeitig steht aber „Stand des anderen Geräts übernommen 25.10.2026, 21:07", obwohl nichts übernommen wurde und es kein anderes Gerät gab.
  - Die alten Karten tragen danach die Marke „neu".
  - Die Zahlen widersprechen sich: „Zuletzt abgelegt: … jetzt 4 Einheiten" gegenüber „5 Einheiten, davon 4 anwesend" bzw. „Einheiten (5 gemeldet · 4 zählend)".
- **Auswirkung:** Unsicherheit, ob der Import etwas verändert hat. Das ist genau die Frage, die bei der Übergabe zwischen Geräten zählt.
- **Empfehlung:** Bei einem Import ohne Änderungen nur „Nichts Neues in der Datei — dieses Gerät ist aktueller" melden und keine „neu"-Marken setzen.
- **Verifikation:** Eine ältere eigene Datei einlesen. Die Meldung sagt eindeutig „keine Änderung", und keine Karte trägt „neu".

### O4 – P3 – Der Hinweis „Speicher nicht dauerhaft" steht nur im Dialog Datensicherung

- **Fundstelle / Aufgabe:** Fußzeile → „Datensicherung".
- **Beobachtung:** Erst dort steht „Der Speicher ist nicht dauerhaft: Der Browser darf ihn … räumen" und „Auf diesem Gerät wurde noch keine Sicherung erstellt". Die Einsatzansicht zeigt dazu nichts.
- **Annahme:** Ob ein Browser im Einsatz tatsächlich räumt, ist nicht prüfbar.
- **Empfehlung:** Ab einer gewissen Datenmenge oder Dauer ohne Sicherung einen dezenten Hinweis in der Einsatzansicht zeigen.
- **Verifikation:** Einsatz mit Meldungen und ohne Sicherung zeigt einen Hinweis zum Sichern.

## Nicht prüfbar / nicht geprüft

- Echter Konflikt auf zwei Geräten an **derselben** Einheit (A rückt ab, B ändert die Stärke, danach Austausch der Dateien): nicht nachgestellt.
- Android- und Electron-Hülle (laut Code liegt dort alles lokal): nicht geprüft.
- Langsames Netz: Die Drosselung per CDP wirkte nicht auf den Service Worker; der Vorrat war lokal in unter 1,5 s geladen.
- Zwei Fenster auf einem Gerät: siehe Error-Recovery-Bericht, F4 (Doppel bei paralleler Erfassung).

## Abschluss

- **Aufgabe geschafft:** ja
- **Fremde Hilfe nötig:** nein
- **Größtes Missverständnis:** „Weitergegeben" heißt nur, dass eine Datei erzeugt wurde, nicht dass der Stab sie hat.
- **Größtes Einsatzrisiko:** Auf einem frisch eingerichteten Gerät mit unvollständigem Offline-Vorrat warnt die Einsatzansicht nicht vor dem Neuladen im Funkloch; die Daten sind dann bis zum nächsten Netz nicht erreichbar.
- **Top-Priorität für die nächste Iteration:** Die Warnung „Noch nicht offline bereit" auch in der Einsatzansicht zeigen (O1).
