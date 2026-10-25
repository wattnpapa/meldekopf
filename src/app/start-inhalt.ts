/**
 * Der erklärende Text der Startseite — die EINE Quelle für beide Pfade.
 *
 * Herkunft: Erfassungsbogen `src/app/start-inhalt.ts` (Commit f2b77f1). Die
 * Bauart (Text als Daten, daraus React-Ansicht und statisches Gerüst, Test
 * gegen index.html) ist übernommen; der Text ist der des Meldekopfs. Die
 * FAQ-Auszeichnung des Erfassungsbogens entfällt, solange es hier keine
 * Fragen-Blöcke gibt.
 *
 * Die Startseite existiert doppelt: als statisches Gerüst in `index.html`
 * (erscheint sofort mit dem HTML, trägt das Largest Contentful Paint) und als
 * React-Ansicht, die das Gerüst beim Mount ersetzt. Ein Text, der nur im
 * Gerüst stünde, wäre nach dem Mount weg; Text, der nur in React stünde,
 * fehlte im ausgelieferten HTML. Er muss also in beiden Pfaden stehen und
 * übereinstimmen. Statt ihn zweimal zu pflegen, steht er hier einmal als
 * Daten. Daraus entstehen:
 *   - die React-Ansicht (`StartInhalt` in app.tsx),
 *   - der statische Block in index.html, erzeugt von `startInhaltHtml()`
 *     über `npm run start-inhalt`.
 * `src/test/start-inhalt.test.ts` vergleicht beides und schlägt fehl, sobald
 * der Block in index.html nicht mehr zum Text hier passt.
 *
 * Inhaltliche Regel: Hier steht nur, was die App ist und wofür sie gebaut
 * wird (PRODUCT.md, docs/funktionsumfang.md). Keine Zahlen, Nutzer oder
 * Erfolge, die nicht belegt sind. Solange Funktionen noch nicht übernommen
 * sind, sagt der Abschnitt „Stand" das ausdrücklich.
 */

import { ERFASSUNGSBOGEN_URL, REPO_URL } from "./adressen";

/** Ein Stück Fließtext: entweder Text oder ein Verweis auf eine andere Seite. */
export type Teil = string | { text: string; ziel: string };

/** Ein Block innerhalb eines Abschnitts. */
export type Block =
  | { art: "absatz"; teile: Teil[] }
  | { art: "liste"; punkte: Teil[][] };

/** Ein Abschnitt mit eigener H2. */
export type Abschnitt = { titel: string; bloecke: Block[] };

/** Das Schwesterprodukt für den Stab. */
const S1_CONTROL_URL = "https://github.com/wattnpapa/S1-Control";

export const START_ABSCHNITTE: Abschnitt[] = [
  {
    titel: "Wofür der Meldekopf da ist",
    bloecke: [
      {
        art: "absatz",
        teile: [
          "Am Meldekopf, am Eingang des Bereitstellungsraums und in der kleinen Führungsstelle im ELW laufen die Bögen vieler Einheiten zusammen. Diese App nimmt eintreffende Einheiten auf, zählt Stärke (Führer / Unterführer / Mannschaft // Gesamt) und Sofortbedarf über alle anwesenden Einheiten laufend zusammen und gibt die Lage geschlossen an die nächste Führungsstelle weiter.",
        ],
      },
      {
        art: "absatz",
        teile: [
          "Sie ist für ein Gerät gebaut: ein Tablet oder Laptop am Eingang, im Fahrzeug oder auf der Motorhaube. Kein Server, keine Anmeldung, keine Kopplung der Geräte. Was mehrere Geräte oder einen Verlauf über Tage braucht, gehört in den Stab und damit nach S1-Control.",
        ],
      },
    ],
  },
  {
    titel: "Eingänge: So kommen die Bögen herein",
    bloecke: [
      {
        art: "liste",
        punkte: [
          ["QR-Code: vom Bildschirm der Einheit oder vom Ausdruck, mit der Kamera oder einem USB-Handscanner."],
          ["Fotos und Bildschirmfotos aus Messenger und Mail, einzeln oder als ganzer Stapel."],
          ["Datei, PDF oder Link, etwa per AirDrop, Quick Share oder USB-Stick."],
          ["Einheit ohne Bogen: nur Stärke, Führungskraft und Fahrzeuge erfassen; für den vollständigen Bogen öffnet sich der Erfassungsbogen per Link, und der Bogen kommt per Link zurück."],
        ],
      },
      {
        art: "absatz",
        teile: [
          "Jede Meldung landet in der Historie ihrer Einheit; eine Folgemeldung zeigt, was sich seit der letzten geändert hat. Abrücken, Zug zuordnen, Aufteilen und Zusammenführen gehören dazu, ebenso der Abgleich vom Papier, wenn ein Gerät ausgefallen ist.",
        ],
      },
    ],
  },
  {
    titel: "Weitergabe: So geht die Lage weiter",
    bloecke: [
      {
        art: "liste",
        punkte: [
          ["Sammel-PDF mit Lageblatt im Papier-Layout: eine Zeile je Einheit, Summen, Stand am Meldekopf."],
          ["CSV-Übersicht für die Lagekarte und CSV mit allen Daten."],
          ["Excel-Liste im Format „Oldenburg“ für die Einheitenliste der Führungsstelle."],
          ["Einsatz-Datei für S1-Control und für ein zweites Meldekopf-Gerät bei der Ablösung."],
        ],
      },
      {
        art: "absatz",
        teile: [
          "Jede Weitergabe merkt sich, was der Empfänger schon hat, und gibt auf Wunsch nur das heraus, was seitdem dazugekommen ist. Ein zweites Fenster zeigt die Lage auf dem Fernseher im Raum: Einsatzname, Zeit, Stärke und die Einheiten, ohne Personennamen.",
        ],
      },
    ],
  },
  {
    titel: "Die Produktfamilie",
    bloecke: [
      {
        art: "absatz",
        teile: [
          "Der ",
          { text: "Erfassungsbogen", ziel: ERFASSUNGSBOGEN_URL },
          " ist die App der einzelnen Einheit: Sie füllt ihren Bogen aus, druckt ihn und gibt ihn per QR-Code, Link oder Datei weiter. Der Meldekopf sammelt diese Bögen. ",
          { text: "S1-Control", ziel: S1_CONTROL_URL },
          " ist die Führungsstelle mit vollem Stab: Sie liest die Einsatz-Datei des Meldekopfs ein und führt die Lage über Tage, Geräte und Sachgebiete weiter. Alle drei sprechen dasselbe Format.",
        ],
      },
    ],
  },
  {
    titel: "Offline statt Cloud",
    bloecke: [
      {
        art: "absatz",
        teile: [
          "Alle Daten bleiben auf dem Gerät. Es gibt keinen Server, an den eine Meldung geschickt würde, keine Anmeldung und kein Konto. Nach dem ersten Aufruf läuft die Seite ohne Netz und lässt sich auf dem Startbildschirm ablegen. Wie gezählt wird, wer die Seite aufruft, steht im ",
          { text: "Datenschutzhinweis", ziel: "./datenschutz.html" },
          ".",
        ],
      },
      {
        art: "absatz",
        teile: [
          "Die App ist kostenlos und quelloffen unter der EUPL-1.2; der Quellcode liegt auf ",
          { text: "GitHub", ziel: REPO_URL },
          ".",
        ],
      },
    ],
  },
  {
    titel: "Stand",
    bloecke: [
      {
        art: "absatz",
        teile: [
          "Die App ist im Aufbau. Die Einsatz-Sammlung wird Schritt für Schritt aus dem Erfassungsbogen hierher übernommen, wo sie seit 2026 in acht Prüfrunden auf Feldtauglichkeit geprüft wurde. Bis die Übernahme abgeschlossen ist, steht die Sammlung im ",
          { text: "Erfassungsbogen", ziel: ERFASSUNGSBOGEN_URL },
          " weiter zur Verfügung.",
        ],
      },
    ],
  },
];

/** Nur das, was in Textinhalten überhaupt gefährlich werden kann. */
function html(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function teileHtml(teile: Teil[]): string {
  return teile
    .map((t) => (typeof t === "string" ? html(t) : `<a href="${t.ziel}">${html(t.text)}</a>`))
    .join("");
}

/**
 * Derselbe Text als statisches HTML — Zeichen für Zeichen das, was in
 * index.html zwischen den Marken stehen muss.
 *
 * `einzug` ist die Einrückung der äußeren `<section>` in index.html; die
 * Kinder rücken jeweils zwei Stellen weiter ein. Ohne das wäre der Vergleich
 * im Test von der Formatierung der Datei abhängig.
 */
export function startInhaltHtml(einzug = "      "): string {
  const e1 = einzug;
  const e2 = `${einzug}  `;
  const e3 = `${einzug}    `;
  const zeilen: string[] = [`${e1}<section class="start-seo" aria-label="Über die Meldekopf-App">`];
  for (const abschnitt of START_ABSCHNITTE) {
    zeilen.push(`${e2}<h2>${html(abschnitt.titel)}</h2>`);
    for (const block of abschnitt.bloecke) {
      if (block.art === "absatz") {
        zeilen.push(`${e2}<p>${teileHtml(block.teile)}</p>`);
      } else {
        zeilen.push(`${e2}<ul>`);
        for (const punkt of block.punkte) zeilen.push(`${e3}<li>${teileHtml(punkt)}</li>`);
        zeilen.push(`${e2}</ul>`);
      }
    }
  }
  zeilen.push(`${e1}</section>`);
  return zeilen.join("\n");
}

/** Marken, zwischen denen der erzeugte Block in index.html steht. */
export const MARKE_ANFANG = "<!-- start-inhalt:anfang (erzeugt aus src/app/start-inhalt.ts — nicht von Hand ändern) -->";
export const MARKE_ENDE = "<!-- start-inhalt:ende -->";
