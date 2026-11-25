/**
 * Name und Kennung dieses Geräts für die Kopplung (neu im Meldekopf, ADR-009).
 */
import { beforeEach, describe, expect, it } from "vitest";
import { NAME_MAX, geraeteart, geraetekennung, geraetename, geraetenameEigen, geraetenameSetzen } from "./geraetename";

class MemStorage {
  private m = new Map<string, string>();
  get length() { return this.m.size; }
  clear() { this.m.clear(); }
  getItem(k: string) { return this.m.has(k) ? this.m.get(k)! : null; }
  setItem(k: string, v: string) { this.m.set(k, String(v)); }
  removeItem(k: string) { this.m.delete(k); }
  key(i: number) { return [...this.m.keys()][i] ?? null; }
}

beforeEach(() => {
  (globalThis as { localStorage?: Storage }).localStorage = new MemStorage() as unknown as Storage;
});

describe("Gerätename", () => {
  it("nennt als Vorgabe die Geräteart, die der Browser verrät", () => {
    expect(geraeteart("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Mobile/15E148 Safari/604.1")).toBe("iPhone");
    expect(geraeteart("Mozilla/5.0 (Linux; Android 15; K) AppleWebKit/537.36 Chrome/140 Mobile Safari/537.36")).toBe("Android-Telefon");
    expect(geraeteart("Mozilla/5.0 (Linux; Android 15; K) AppleWebKit/537.36 Chrome/140 Safari/537.36")).toBe("Android-Tablet");
    expect(geraeteart("Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/140")).toBe("Windows-Rechner");
    expect(geraeteart("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605")).toBe("Mac");
    expect(geraeteart("Mozilla/5.0 (X11; Linux x86_64) Firefox/140")).toBe("Linux-Rechner");
    expect(geraeteart("")).toBe("Gerät");
  });

  it("merkt sich den eingegebenen Namen, gekürzt, und nimmt mit leerer Eingabe wieder die Vorgabe", () => {
    const vorgabe = geraetename();
    expect(geraetenameEigen()).toBe(false);
    geraetenameSetzen("  Eingang Nord  ");
    expect(geraetename()).toBe("Eingang Nord");
    expect(geraetenameEigen()).toBe(true);
    geraetenameSetzen("x".repeat(80));
    expect(geraetename()).toHaveLength(NAME_MAX);
    geraetenameSetzen("   ");
    expect(geraetename()).toBe(vorgabe);
    expect(geraetenameEigen()).toBe(false);
  });

  it("hält eine dauerhafte Kennung, auch über eine Namensänderung", () => {
    const id = geraetekennung();
    expect(id).toMatch(/^[0-9a-z]{12,}$/);
    geraetenameSetzen("Eingang Süd");
    expect(geraetekennung()).toBe(id);
    expect(JSON.parse(localStorage.getItem("eeb.geraet.v1")!)).toEqual({ id, name: "Eingang Süd" });
  });
});
