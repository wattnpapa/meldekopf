import { describe, it, expect, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { ErfassungsbogenWeg } from "./erfassungsbogen-weg";
import { ERFASSUNGSBOGEN_URL } from "./adressen";

afterEach(cleanup);

describe("ErfassungsbogenWeg", () => {
  it("führt mit einem Primärknopf zum Erfassungsbogen, in einem neuen Fenster", () => {
    render(<ErfassungsbogenWeg />);
    expect(screen.getByRole("heading", { name: "Bogen erfassen (Erfassungsbogen)" })).toBeTruthy();
    const link = screen.getByRole("link", { name: /Erfassungsbogen öffnen/ });
    expect(link.getAttribute("href")).toBe(ERFASSUNGSBOGEN_URL);
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toContain("noopener");
    expect(link.className).toContain("primaer");
  });
});
