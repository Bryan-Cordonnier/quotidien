import { describe, expect, it } from "vitest";
import { pdfBulletin, type LigneBulletin } from "./bulletin";

describe("pdfBulletin", () => {
  const lignes: LigneBulletin[] = [
    { libelle: "Congés payés", detail: "10 %", montantCents: 12345 },
    { libelle: "Net estimé", detail: "", montantCents: 98765, total: true },
  ];
  const pdf = pdfBulletin("Bulletin estimé", "Opérateur (Logis-Verre)", lignes, "Estimation : à comparer au vrai bulletin.");
  it("est un PDF entièrement ASCII, accents et euro encodés", () => {
    expect(pdf.startsWith("%PDF-1.4")).toBe(true);
    expect(/^[\x00-\x7f]*$/.test(pdf)).toBe(true);
    expect(pdf).toContain("Cong\\351s pay\\351s");
    expect(pdf).toContain("\\200");
  });
  it("a une table des objets cohérente avec leurs positions", () => {
    const xref = Number(/startxref\n(\d+)/.exec(pdf)![1]);
    expect(pdf.slice(xref, xref + 4)).toBe("xref");
    const premiere = Number(/0000000000 65535 f \n(\d{10})/.exec(pdf)![1]);
    expect(pdf.slice(premiere, premiere + 7)).toBe("1 0 obj");
  });
});