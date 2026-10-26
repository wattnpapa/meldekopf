/**
 * Browser-Zurück innerhalb der App (Audit Meldekopf Runde 1, Fehler F6):
 * Startseite, Einsatzansicht und Schnellerfassung als Einträge im Verlauf.
 *
 * Neu im Meldekopf. Vorher legte die App keine Einträge an, Zurück verließ die
 * Seite (auf `impressum.html` oder `about:blank`), in der Android-Hülle die App.
 *
 * Die Ansicht steht im Verlaufszustand (`history.state.eebAnsicht`), nicht im
 * Fragment: Das Fragment trägt die Bogen-Links (`#…`, eingang/aufnahme.tsx) und
 * wird nach dem Lesen aus der Adresse genommen. Die Einträge bilden immer die
 * Kette Startseite → Einsatz → Erfassung; nach einem Kaltstart in einen
 * Einsatz liegt die Startseite darunter, damit Zurück dorthin führt und nicht
 * aus der App heraus.
 *
 * Zurück bei offenem Fenster schließt erst das Fenster und lässt die Ansicht
 * stehen. Die Verlaufseinträge der Overlays und Rückfragen aus
 * `@bos/oberflaeche/modal-overlay` übernehmen den Zustand darunter; ein
 * Rücksprung von dort ändert die Ansicht also nicht. Der erste Eintrag trägt
 * `eebErste`, damit die Fenster der Startseite dort ihren eigenen Eintrag
 * bekommen (R6-S3 im Erfassungsbogen).
 */

import { useEffect, useRef } from "react";
import { eigenesZurueckVerbrauchen, rueckfrageEintragErsetzbar } from "@bos/oberflaeche/modal-overlay";

export type Ansicht = { art: "start" } | { art: "einsatz"; id: string } | { art: "erfassung"; id: string };

const START: Ansicht = { art: "start" };

export function ansichtTiefe(a: Ansicht): number {
  return a.art === "start" ? 0 : a.art === "einsatz" ? 1 : 2;
}

export function ansichtGleich(a: Ansicht | null | undefined, b: Ansicht | null | undefined): boolean {
  if (!a || !b || a.art !== b.art) return false;
  return a.art === "start" || a.id === (b as { id: string }).id;
}

/** Die Ansicht aus einem Verlaufszustand; `null`, wenn der Eintrag keine trägt. */
export function ansichtAusZustand(zustand: unknown): Ansicht | null {
  const a = (zustand as { eebAnsicht?: unknown } | null)?.eebAnsicht as Partial<{ art: string; id: unknown }> | undefined;
  if (!a || typeof a !== "object") return null;
  if (a.art === "start") return START;
  if ((a.art === "einsatz" || a.art === "erfassung") && typeof a.id === "string" && a.id) return { art: a.art, id: a.id };
  return null;
}

/** Die Ansichten darüber bis einschließlich `a`: Startseite → Einsatz → Erfassung. */
export function ansichtKette(a: Ansicht): Ansicht[] {
  if (a.art === "start") return [START];
  if (a.art === "einsatz") return [START, a];
  return [START, { art: "einsatz", id: a.id }, a];
}

function zustandMit(a: Ansicht, erste = false): Record<string, unknown> {
  let darunter: Record<string, unknown> = {};
  try {
    // Fremde Schlüssel (Overlay-Ebenen) wandern nicht mit; nur die Ansicht zählt.
    const { eebEbene: _e, eebErste: _f, eebAnsicht: _a, ...rest } = (history.state as Record<string, unknown> | null) ?? {};
    void _e;
    void _f;
    void _a;
    darunter = rest;
  } catch {
    /* ohne Verlauf */
  }
  return { ...darunter, eebAnsicht: a, ...(erste ? { eebErste: true } : {}) };
}

function ersetzen(a: Ansicht, erste: boolean): void {
  history.replaceState(zustandMit(a, erste), "");
}

function anlegen(a: Ansicht): void {
  history.pushState(zustandMit(a), "");
}

/** Das oberste offene Fenster wie mit Escape abbrechen. `true`, wenn eins offen war. */
export function offenesFensterAbbrechen(): boolean {
  const offen = Array.from(document.querySelectorAll<HTMLDialogElement>("dialog[open]")).pop();
  if (!offen) return false;
  const abbruch = new Event("cancel", { cancelable: true });
  if (offen.dispatchEvent(abbruch)) {
    try {
      offen.close();
    } catch {
      offen.removeAttribute("open");
    }
  }
  return true;
}

/**
 * Hält Verlauf und Ansicht der App gleich. `ansicht` ist die Ansicht, die die
 * App gerade zeigt; `setzen` stellt sie um, wenn Zurück oder Vor sie ändern.
 *
 * Wechselt die App selbst die Ansicht, legt der Hook einen Eintrag an (tiefer),
 * ersetzt den obersten (gleiche Tiefe, anderer Einsatz) oder geht im Verlauf
 * zurück (höher, etwa „‹ Startseite"), damit Zurück danach nicht wieder in die
 * eben verlassene Ansicht führt.
 */
export function useAnsichtVerlauf(ansicht: Ansicht, setzen: (a: Ansicht) => void): void {
  const aktuell = useRef(ansicht);
  aktuell.current = ansicht;
  const setzenRef = useRef(setzen);
  setzenRef.current = setzen;
  /** Ein eigenes `history.go(-n)` steht aus: Der Pop bringt keine neue Ansicht, nur den Eintrag. */
  const eigenerRuecksprung = useRef(false);

  // Kaltstart: die Kette unter der gezeigten Ansicht anlegen. Nach einem Neuladen steht sie schon da.
  useEffect(() => {
    try {
      const da = ansichtAusZustand(history.state);
      if (ansichtGleich(da, aktuell.current)) return;
      if (da && ansichtTiefe(da) >= ansichtTiefe(aktuell.current)) {
        ersetzen(aktuell.current, ansichtTiefe(aktuell.current) === 0);
        return;
      }
      const kette = ansichtKette(aktuell.current);
      const ab = da ? ansichtTiefe(da) : 0;
      ersetzen(kette[ab]!, ab === 0);
      for (const a of kette.slice(ab + 1)) anlegen(a);
    } catch {
      /* ohne Verlauf (eingebettet, file://): Zurück verlässt die Seite wie bisher */
    }
  }, []);

  // Wechsel durch die App selbst.
  const schluessel = ansicht.art === "start" ? "start" : `${ansicht.art}:${ansicht.id}`;
  useEffect(() => {
    try {
      const da = ansichtAusZustand(history.state);
      if (!da || ansichtGleich(da, ansicht)) return;
      const differenz = ansichtTiefe(ansicht) - ansichtTiefe(da);
      if (differenz > 0) {
        const neue = ansichtKette(ansicht).slice(ansichtTiefe(da) + 1);
        // Liegt noch der Eintrag einer eben beantworteten Rückfrage obenauf, nimmt die neue Ansicht ihn (R6-E4).
        if (rueckfrageEintragErsetzbar()) ersetzen(neue.shift()!, false);
        for (const a of neue) anlegen(a);
      } else if (differenz === 0) {
        ersetzen(ansicht, ansichtTiefe(ansicht) === 0);
      } else {
        eigenerRuecksprung.current = true;
        history.go(differenz);
      }
    } catch {
      /* ohne Verlauf */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- der Schlüssel fasst die Ansicht
  }, [schluessel]);

  // Zurück und Vor.
  useEffect(() => {
    const beiPop = () => {
      const ziel = ansichtAusZustand(history.state);
      const jetzt = aktuell.current;
      // Eigener Rücksprung (oben) oder der eines Overlays: Die Ansicht bleibt, nur der Eintrag muss passen.
      if (eigenerRuecksprung.current || eigenesZurueckVerbrauchen()) {
        eigenerRuecksprung.current = false;
        if (!ansichtGleich(ziel, jetzt)) {
          try {
            ersetzen(jetzt, ansichtTiefe(jetzt) === 0);
          } catch {
            /* ohne Verlauf */
          }
        }
        return;
      }
      if (!ziel) {
        // Ein Bogen-Link bei offener Seite ändert nur das Fragment: Das ist kein Zurück. Die Aufnahme nimmt das
        // Fragment gleich aus der Adresse und den Zustand mit; danach bekommt der Eintrag die Ansicht wieder.
        if (window.location.hash.length > 1) {
          setTimeout(() => {
            try {
              if (!ansichtAusZustand(history.state)) ersetzen(aktuell.current, false);
            } catch {
              /* ohne Verlauf */
            }
          }, 0);
          return;
        }
      }
      const neu = ziel ?? START;
      if (ansichtGleich(neu, jetzt)) {
        // Rücksprung aus einem Fenster-Eintrag derselben Ansicht: das Fenster schließen, falls es noch offen ist.
        offenesFensterAbbrechen();
        return;
      }
      // Offenes Fenster: Zurück schließt erst das Fenster, die Ansicht bleibt.
      if (offenesFensterAbbrechen()) {
        try {
          anlegen(jetzt);
        } catch {
          /* ohne Verlauf */
        }
        return;
      }
      setzenRef.current(neu);
    };
    window.addEventListener("popstate", beiPop);
    return () => window.removeEventListener("popstate", beiPop);
  }, []);
}
