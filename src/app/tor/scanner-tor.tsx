/**
 * Herkunft: neu in der Meldekopf-App.
 *
 * Kennzeichen im Scanner: Dieselbe Kamera, die die QR-Codes der Bögen liest (eingang/qr-scanner-web.tsx), liest auch
 * die Kennzeichen der Fahrzeuge dieser Sammlung. Ein Knopf, eine Ansicht: Hält der Helfer einen Bogen davor, wird er
 * aufgenommen; hält er ein Kennzeichen davor, erscheint das Fahrzeug mit „Fährt raus" und „Kommt zurück".
 *
 * Der Scanner gibt Videobild und Suchrahmen herein (`zusatz`), dieses Modul liest daraus in eigenem Takt
 * (kennzeichen-leser.ts) und gleicht nur gegen die Kennzeichen der Sammlung ab (kennzeichen-abgleich.ts). Gebucht wird
 * nie von selbst. Hat die Sammlung kein Fahrzeug mit Kennzeichen, lädt die Texterkennung gar nicht erst.
 */
import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { suchAusschnitt } from "../eingang/kamera";
import { einsaetzeLaden } from "../einsaetze-lesen";
import { torFahrzeuge } from "./fahrzeug-stand";
import { erkennungAuswerten, kennzeichenAehnlich } from "./kennzeichen-abgleich";
import type { KennzeichenLeser } from "./kennzeichen-leser";
import { kontrastSpreizen, schildKandidaten } from "./schild-sucher";
import { TorQuittung, TorTreffer, standText, useTorBuchung } from "./tor-treffer";
import "./tor.css";

/** Längste Kante, wenn der ganze Ausschnitt an die Texterkennung geht (der Schild-Sucher fand nichts). */
const LESE_KANTE = 1000;
/** Pause zwischen zwei Lesungen: Die Erkennung soll das Telefon nicht dauerhaft auslasten und dem QR-Decoder Luft lassen. */
const LESE_PAUSE_MS = 150;
/** So lange wird ein eben gebuchtes Kennzeichen, das noch im Bild steht, nicht wieder vorgeschlagen. */
const GEBUCHT_RUHE_MS = 8_000;

/** Breite des kleinen Graubilds, in dem der Schild-Sucher sucht. */
const SUCH_BREITE = 320;
/**
 * Auf diese Höhen wird ein gefundener Ausschnitt für die Texterkennung gebracht. Zwei Größen, weil dieselbe Zeile je nach
 * Vergrößerung verschieden gelesen wird (am Foto aus dem Feldversuch stimmten die Ziffern mal in der einen, mal in der
 * anderen); der Abgleich nimmt, was passt.
 */
const SCHILD_HOEHEN = [56, 104];

/**
 * Den Rahmen-Ausschnitt `a` des Videobilds lesen: erst die Stellen, die wie ein Schild aussehen (schild-sucher.ts), je
 * vergrößert und im Kontrast gespreizt; findet der Sucher nichts, den ganzen Ausschnitt. Rückgabe: alles Gelesene,
 * zeilenweise. Hört auf, sobald ein Kennzeichen der Sammlung wörtlich dasteht.
 */
async function schilderLesen(
  v: HTMLVideoElement,
  a: { x: number; y: number; breite: number; hoehe: number },
  leinwand: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  leser: KennzeichenLeser,
  schluessel: readonly string[],
): Promise<string> {
  // 1. Klein und grau für den Sucher.
  const sb = Math.min(SUCH_BREITE, Math.max(1, Math.round(a.breite)));
  const sh = Math.max(1, Math.round((a.hoehe * sb) / a.breite));
  leinwand.width = sb;
  leinwand.height = sh;
  ctx.drawImage(v, a.x, a.y, a.breite, a.hoehe, 0, 0, sb, sh);
  const klein = ctx.getImageData(0, 0, sb, sh).data;
  const grau = new Uint8Array(sb * sh);
  for (let i = 0; i < grau.length; i++) grau[i] = (klein[i * 4]! * 77 + klein[i * 4 + 1]! * 150 + klein[i * 4 + 2]! * 29) >> 8;
  const kaesten = schildKandidaten(grau, sb, sh);

  // 2. Jeden Kasten aus dem Videobild in voller Auflösung holen, vergrößern, Kontrast spreizen, lesen.
  const m = a.breite / sb;
  const zeilen: string[] = [];
  for (const k of kaesten) {
    const x0 = Math.max(a.x, a.x + (k.x - 0.06 * k.breite) * m);
    const y0 = Math.max(a.y, a.y + (k.y - 0.2 * k.hoehe) * m);
    const x1 = Math.min(a.x + a.breite, a.x + (k.x + 1.06 * k.breite) * m);
    const y1 = Math.min(a.y + a.hoehe, a.y + (k.y + 1.2 * k.hoehe) * m);
    if (x1 - x0 < 8 || y1 - y0 < 4) continue;
    for (const hoehe of SCHILD_HOEHEN) {
      const breite = Math.min(1200, Math.max(1, Math.round(((x1 - x0) * hoehe) / (y1 - y0))));
      leinwand.width = breite;
      leinwand.height = hoehe;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(v, x0, y0, x1 - x0, y1 - y0, 0, 0, breite, hoehe);
      const bild = ctx.getImageData(0, 0, breite, hoehe);
      kontrastSpreizen(bild.data);
      ctx.putImageData(bild, 0, 0);
      zeilen.push(await leser.lesen(leinwand));
      const e = erkennungAuswerten(zeilen.join("\n"), schluessel);
      if (e.treffer.length === 1 && e.abstand === 0) return zeilen.join("\n");
    }
  }
  if (kaesten.length > 0) return zeilen.join("\n");

  // 3. Nichts gefunden (das Schild füllt den Rahmen, oder gar kein Schild): der ganze Ausschnitt.
  const faktor = Math.min(1, LESE_KANTE / Math.max(a.breite, a.hoehe));
  leinwand.width = Math.max(1, Math.round(a.breite * faktor));
  leinwand.height = Math.max(1, Math.round(a.hoehe * faktor));
  ctx.drawImage(v, a.x, a.y, a.breite, a.hoehe, 0, 0, leinwand.width, leinwand.height);
  return leser.lesen(leinwand);
}

export default function ScannerTor({
  einsatzId,
  video,
  rahmen,
  kameraLaeuft,
  onGeaendert,
}: {
  einsatzId: string;
  video: RefObject<HTMLVideoElement | null>;
  rahmen: RefObject<HTMLDivElement | null>;
  kameraLaeuft: boolean;
  onGeaendert: () => void;
}) {
  const [stand, setStand] = useState(0);
  const fahrzeuge = useMemo(() => torFahrzeuge(einsaetzeLaden().find((s) => s.id === einsatzId) ?? { eintraege: [] }), [einsatzId, stand]);
  const fahrzeugeRef = useRef(fahrzeuge);
  fahrzeugeRef.current = fahrzeuge;
  const mitKennzeichen = fahrzeuge.some((f) => !f.schluessel.startsWith("#"));

  const [wahl, setWahl] = useState<{ einheitSchluessel: string; schluessel: string } | null>(null);
  const [mehrere, setMehrere] = useState<string[] | null>(null);
  /** Was die Kamera zuletzt las und ob es zu einem Fahrzeug der Sammlung passt. */
  const [gelesen, setGelesen] = useState<{ text: string; passt: boolean } | null>(null);
  const wahlRef = useRef(wahl);
  wahlRef.current = wahl;
  const gebucht = useRef<{ schluessel: string; bis: number } | null>(null);
  const buchung = useTorBuchung(einsatzId, (f) => {
    gebucht.current = f ? { schluessel: f.schluessel, bis: Date.now() + GEBUCHT_RUHE_MS } : null;
    setWahl(null);
    setMehrere(null);
    setStand((n) => n + 1);
    onGeaendert();
  });

  useEffect(() => {
    if (!kameraLaeuft || !mitKennzeichen) return;
    let aktiv = true;
    let leser: KennzeichenLeser | null = null;
    let uhr: ReturnType<typeof setTimeout> | undefined;
    /** Der vorige unsichere Treffer: Erst die zweite gleiche Lesung gilt. */
    let vorige = "";
    let leinwand: HTMLCanvasElement | null = null;
    let ctx: CanvasRenderingContext2D | null = null;

    function treffer(schluessel: string[]) {
      if (schluessel.length === 1 && gebucht.current && gebucht.current.schluessel === schluessel[0] && gebucht.current.bis > Date.now()) return;
      const passend = fahrzeugeRef.current.filter((f) => schluessel.includes(f.schluessel));
      if (passend.length === 0) return;
      if (passend.length === 1) {
        const f = passend[0]!;
        const schon = wahlRef.current;
        if (schon && schon.schluessel === f.schluessel && schon.einheitSchluessel === f.einheitSchluessel) return;
        setMehrere(null);
        setWahl({ einheitSchluessel: f.einheitSchluessel, schluessel: f.schluessel });
      } else {
        // Dasselbe Kennzeichen an zwei Einheiten oder zwei ähnliche Kennzeichen: Der Helfer wählt.
        if (wahlRef.current) return;
        setMehrere(schluessel);
      }
      buchung.setFehler("");
      try {
        navigator.vibrate?.(60);
      } catch {
        /* Vibration ist Zugabe */
      }
    }

    async function lesen() {
      if (!aktiv) return;
      const v = video.current;
      if (v && leser && v.readyState >= v.HAVE_ENOUGH_DATA && v.videoWidth && document.visibilityState === "visible") {
        leinwand ??= document.createElement("canvas");
        ctx ??= leinwand.getContext("2d", { willReadFrequently: true });
        if (ctx) {
          // Derselbe Ausschnitt wie für den QR-Code: der Suchrahmen mit etwas Zugabe.
          const a = suchAusschnitt({ breite: v.videoWidth, hoehe: v.videoHeight }, v.getBoundingClientRect(), rahmen.current?.getBoundingClientRect(), 1.15);
          try {
            const text = await schilderLesen(v, a, leinwand, ctx, leser, fahrzeugeRef.current.map((f) => f.schluessel));
            if (!aktiv) return;
            const e = erkennungAuswerten(text, fahrzeugeRef.current.map((f) => f.schluessel));
            const kennung = e.treffer.join("|");
            // Was die Kamera las, steht nur da, wenn es nach einem Kennzeichen aussieht: Der Rahmen zeigt meist einen QR-Code.
            // Auch ohne Treffer: Sonst bleibt offen, ob die Kamera nichts las oder das Fahrzeug nicht in der Sammlung steht.
            const aehnlich = kennzeichenAehnlich(text);
            setGelesen(aehnlich ? { text: aehnlich, passt: e.treffer.length > 0 } : null);
            // Wörtlich gelesen gilt sofort; eine unscharfe oder mehrdeutige Lesung erst, wenn die nächste dasselbe sagt.
            if (e.treffer.length > 0 && ((e.treffer.length === 1 && e.abstand === 0) || kennung === vorige)) treffer(e.treffer);
            vorige = kennung;
          } catch {
            /* ein misslungenes Bild ist kein Fehler, das nächste kommt */
          }
        }
      }
      if (aktiv) uhr = setTimeout(() => void lesen(), LESE_PAUSE_MS);
    }

    void (async () => {
      try {
        // Erst jetzt geladen: rund 7 MB, die nur braucht, wer Kennzeichen liest.
        const { kennzeichenLeserLaden } = await import("./kennzeichen-leser");
        const l = await kennzeichenLeserLaden();
        if (!aktiv) {
          l.beenden();
          return;
        }
        leser = l;
        void lesen();
      } catch {
        /* Dieses Gerät führt die Texterkennung nicht aus: Der Scanner liest weiter QR-Codes, Kennzeichen lassen sich tippen. */
      }
    })();

    return () => {
      aktiv = false;
      clearTimeout(uhr);
      leser?.beenden();
      setGelesen(null);
    };
    // `buchung` wechselt mit jedem Zeichnen; der Effekt braucht nur seine stabile Fehler-Rücksetzung.
  }, [kameraLaeuft, mitKennzeichen, video, rahmen]);

  const gewaehlt = wahl ? (fahrzeuge.find((f) => f.einheitSchluessel === wahl.einheitSchluessel && f.schluessel === wahl.schluessel) ?? null) : null;
  const zurWahl = mehrere && !gewaehlt ? fahrzeuge.filter((f) => mehrere.includes(f.schluessel)) : [];
  if (!gewaehlt && zurWahl.length === 0 && !buchung.quittung && !buchung.fehler && !gelesen) return null;

  return (
    <div className="scanner-tor">
      {gelesen && !gewaehlt && zurWahl.length === 0 && (
        <p className="scanner-tor-gelesen" role="status">
          Kennzeichen gelesen: {gelesen.text}
          {!gelesen.passt && " – kein Fahrzeug dieser Sammlung. Ruhig halten oder „Kennzeichen tippen…“."}
        </p>
      )}
      {buchung.quittung && !gewaehlt && <TorQuittung text={buchung.quittung.text} onRueckgaengig={buchung.zuruecknehmen} />}
      {buchung.fehler && <p className="fehler" role="alert">{buchung.fehler}</p>}
      {gewaehlt && <TorTreffer fahrzeug={gewaehlt} onBuchen={(raus) => buchung.buchen(gewaehlt, raus)} onWeg={() => setWahl(null)} wegText="Nicht dieses Fahrzeug" />}
      {zurWahl.length > 0 && (
        <section className="tor-treffer" aria-label="Fahrzeug wählen">
          <p className="tor-mehrere">Die Kamera ist nicht sicher. Welches Fahrzeug ist es?</p>
          <ul className="tor-liste">
            {zurWahl.map((f) => (
              <li key={`${f.einheitSchluessel}|${f.schluessel}`}>
                <button type="button" onClick={() => { setWahl({ einheitSchluessel: f.einheitSchluessel, schluessel: f.schluessel }); setMehrere(null); }}>
                  <span className="tor-liste-kennzeichen">{f.kennzeichen}</span>
                  <span className="tor-liste-stand" data-unterwegs={f.unterwegsSeit != null ? "ja" : "nein"}>{standText(f)}</span>
                  <span className="tor-liste-wer">{[f.typ, f.einheit].filter(Boolean).join(" · ")}</span>
                </button>
              </li>
            ))}
          </ul>
          <button type="button" className="link" onClick={() => setMehrere(null)}>Keines davon</button>
        </section>
      )}
    </div>
  );
}
