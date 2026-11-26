/**
 * Herkunft: neu in der Meldekopf-App.
 *
 * Schild-Sucher: Wo im Kamerabild könnte ein Kennzeichen stehen?
 *
 * Die Texterkennung über den ganzen Suchrahmen ist Glückssache, sobald ein Fahrzeug im Bild ist: Aufschrift, Kühlergrill
 * und Bäume werden mitgelesen, und das Schild selbst nimmt nur einen Bruchteil der Breite ein (Feldversuch 2026-11-26:
 * ein Fünftel, das Kennzeichen wurde nicht erkannt). Dieser Sucher grenzt vorher ein: Er liefert wenige Kästen, in
 * denen dicht an dicht senkrechte Kanten stehen, wie sie eine Zeile Schrift macht, in der Form eines Schilds. Nur diese
 * Ausschnitte gehen, vergrößert, an die Texterkennung (scanner-tor.tsx).
 *
 * Das klassische Verfahren, ohne Modell: waagerechte Helligkeitssprünge, Schwelle über Mittel und Streuung, Dichte in
 * einem flachen Fenster, zusammenhängende Flächen, nebeneinanderliegende Flächen einer Zeile verbunden (zwischen
 * Ortskürzel und Ziffern sitzen die Plaketten), dann die Form geprüft. Es findet auch anderes, das wie eine Schriftzeile
 * aussieht (die Aufschrift „THW"); das schadet nicht, denn gelesen wird gegen die Kennzeichen der Sammlung.
 *
 * Reine Rechnung auf einem kleinen Graubild (rund 320 Pixel breit); der Aufrufer rechnet die Kästen in sein Bild um.
 */

export interface SchildKasten {
  x: number;
  y: number;
  breite: number;
  hoehe: number;
  /** Je höher, desto eher ein Schild: Kantendichte, hell hinterlegt. */
  punkte: number;
}

/** Schwelle der Kanten: Mittel plus so viele Streuungen. */
const KANTEN_STREUUNG = 1.0;
/** Ab diesem Anteil Kanten im Fenster gilt eine Stelle als Schrift. */
const DICHTE = 0.25;
/** Schilder sind breiter als hoch: einzeilig rund 4,7 zu 1, schräg gesehen und mit Rand weniger, zweizeilig rund 1,7 zu 1. */
const FORM_MIN = 1.6;
const FORM_MAX = 9;

/**
 * Die besten `anzahl` Kästen im Graubild (`grau`: ein Byte je Pixel, zeilenweise), beste zuerst. Leer, wenn nichts wie
 * eine Schriftzeile aussieht.
 */
export function schildKandidaten(grau: Uint8Array | Uint8ClampedArray, breite: number, hoehe: number, anzahl = 3): SchildKasten[] {
  const n = breite * hoehe;
  if (breite < 16 || hoehe < 8 || grau.length < n) return [];

  // 1. Waagerechte Helligkeitssprünge (senkrechte Kanten).
  const sprung = new Float32Array(n);
  let summe = 0;
  let quadrate = 0;
  for (let y = 0; y < hoehe; y++) {
    for (let x = 1; x < breite - 1; x++) {
      const i = y * breite + x;
      const d = Math.abs(grau[i + 1]! - grau[i - 1]!);
      sprung[i] = d;
      summe += d;
      quadrate += d * d;
    }
  }
  const mittel = summe / n;
  const schwelle = mittel + KANTEN_STREUUNG * Math.sqrt(Math.max(0, quadrate / n - mittel * mittel));

  // 2. Kanten als Summenbild, damit die Dichte in einem Fenster vier Zugriffe kostet.
  const b1 = breite + 1;
  const integral = new Float64Array(b1 * (hoehe + 1));
  for (let y = 0; y < hoehe; y++) {
    let zeile = 0;
    for (let x = 0; x < breite; x++) {
      if (sprung[y * breite + x]! > schwelle) zeile++;
      integral[(y + 1) * b1 + x + 1] = integral[y * b1 + x + 1]! + zeile;
    }
  }
  const kanten = (x0: number, y0: number, x1: number, y1: number) => integral[y1 * b1 + x1]! - integral[y0 * b1 + x1]! - integral[y1 * b1 + x0]! + integral[y0 * b1 + x0]!;

  // 3. Dichte in einem flachen Fenster: Schrift ist waagerecht dicht, eine einzelne Kante (Fensterholm) nicht.
  const fx = Math.max(2, Math.round(breite / 32));
  const fy = 1;
  const maske = new Uint8Array(n);
  for (let y = 0; y < hoehe; y++) {
    const y0 = Math.max(0, y - fy);
    const y1 = Math.min(hoehe, y + fy + 1);
    for (let x = 0; x < breite; x++) {
      const x0 = Math.max(0, x - fx);
      const x1 = Math.min(breite, x + fx + 1);
      if (kanten(x0, y0, x1, y1) > DICHTE * (x1 - x0) * (y1 - y0)) maske[y * breite + x] = 1;
    }
  }

  // 4. Zusammenhängende Flächen.
  interface Flaeche { x0: number; y0: number; x1: number; y1: number }
  const flaechen: Flaeche[] = [];
  const stapel = new Int32Array(n);
  for (let start = 0; start < n; start++) {
    if (maske[start] !== 1) continue;
    let oben = 0;
    stapel[oben++] = start;
    maske[start] = 2;
    const f: Flaeche = { x0: breite, y0: hoehe, x1: 0, y1: 0 };
    while (oben > 0) {
      const i = stapel[--oben]!;
      const x = i % breite;
      const y = (i - x) / breite;
      if (x < f.x0) f.x0 = x;
      if (x + 1 > f.x1) f.x1 = x + 1;
      if (y < f.y0) f.y0 = y;
      if (y + 1 > f.y1) f.y1 = y + 1;
      if (x > 0 && maske[i - 1] === 1) { maske[i - 1] = 2; stapel[oben++] = i - 1; }
      if (x < breite - 1 && maske[i + 1] === 1) { maske[i + 1] = 2; stapel[oben++] = i + 1; }
      if (y > 0 && maske[i - breite] === 1) { maske[i - breite] = 2; stapel[oben++] = i - breite; }
      if (y < hoehe - 1 && maske[i + breite] === 1) { maske[i + breite] = 2; stapel[oben++] = i + breite; }
    }
    if (f.y1 - f.y0 >= 4 && f.x1 - f.x0 >= 4) flaechen.push(f);
  }

  // 5. Flächen derselben Zeile verbinden: Zwischen Ortskürzel und Ziffern liegt die Lücke der Plaketten.
  flaechen.sort((a, b) => a.x0 - b.x0);
  let verbunden = true;
  while (verbunden) {
    verbunden = false;
    for (let i = 0; i < flaechen.length && !verbunden; i++) {
      for (let j = i + 1; j < flaechen.length; j++) {
        const a = flaechen[i]!;
        const b = flaechen[j]!;
        const ha = a.y1 - a.y0;
        const hb = b.y1 - b.y0;
        const deckung = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
        const luecke = Math.max(a.x0, b.x0) - Math.min(a.x1, b.x1);
        if (deckung >= 0.5 * Math.min(ha, hb) && Math.max(ha, hb) <= 2 * Math.min(ha, hb) && luecke <= 1.2 * Math.max(ha, hb)) {
          flaechen[i] = { x0: Math.min(a.x0, b.x0), y0: Math.min(a.y0, b.y0), x1: Math.max(a.x1, b.x1), y1: Math.max(a.y1, b.y1) };
          flaechen.splice(j, 1);
          verbunden = true;
          break;
        }
      }
    }
  }

  // 6. Form prüfen und bewerten.
  const kaesten: SchildKasten[] = [];
  for (const f of flaechen) {
    const b = f.x1 - f.x0;
    const h = f.y1 - f.y0;
    if (b < 0.1 * breite || h < 5 || b / h < FORM_MIN || b / h > FORM_MAX) continue;
    const dichte = kanten(f.x0, f.y0, f.x1, f.y1) / (b * h);
    // Hell hinterlegt? Mittel der helleren Hälfte der Pixel, grob über jeden zweiten.
    let hell = 0;
    let zahl = 0;
    let alle = 0;
    for (let y = f.y0; y < f.y1; y += 2) for (let x = f.x0; x < f.x1; x += 2) alle += grau[y * breite + x]!;
    const schnitt = alle / (Math.ceil(h / 2) * Math.ceil(b / 2));
    for (let y = f.y0; y < f.y1; y += 2) {
      for (let x = f.x0; x < f.x1; x += 2) {
        const g = grau[y * breite + x]!;
        if (g >= schnitt) {
          hell += g;
          zahl++;
        }
      }
    }
    kaesten.push({ x: f.x0, y: f.y0, breite: b, hoehe: h, punkte: dichte * (0.4 + (zahl ? hell / zahl : 0) / 255) });
  }
  return kaesten.sort((a, b) => b.punkte - a.punkte).slice(0, anzahl);
}

/**
 * Helligkeit eines RGBA-Bilds spreizen und als Grau zurückschreiben: Die dunkelsten und hellsten zwei Prozent werden
 * Schwarz und Weiß. Ein Schild im Schatten oder auf einem abgefilmten Bildschirm hat sonst zu wenig Kontrast für die
 * Texterkennung. Ändert `daten` an Ort und Stelle.
 */
export function kontrastSpreizen(daten: Uint8ClampedArray): void {
  const hist = new Uint32Array(256);
  const pixel = daten.length >> 2;
  for (let i = 0; i < daten.length; i += 4) {
    const g = (daten[i]! * 77 + daten[i + 1]! * 150 + daten[i + 2]! * 29) >> 8;
    daten[i] = g;
    hist[g]!++;
  }
  const rand = pixel * 0.02;
  let unten = 0;
  let oben = 255;
  for (let s = 0; unten < 255 && s + hist[unten]! <= rand; unten++) s += hist[unten]!;
  for (let s = 0; oben > 0 && s + hist[oben]! <= rand; oben--) s += hist[oben]!;
  const spanne = Math.max(1, oben - unten);
  for (let i = 0; i < daten.length; i += 4) {
    const g = Math.max(0, Math.min(255, Math.round(((daten[i]! - unten) * 255) / spanne)));
    daten[i] = daten[i + 1] = daten[i + 2] = g;
  }
}
