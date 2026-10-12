// Bulletin estimé d'une mission d'intérim : le détail ligne à ligne, à mettre à côté du vrai bulletin, et sa version PDF.
// Tout vient de `detailMission` (les mêmes calculs que le net estimé) : rien n'est recalculé autrement ici.
import { formatEuros } from "@etabli/ui/money";
import { detailMission } from "./calculs";
import type { Mission, Reglages } from "./types";

export interface LigneBulletin {
  libelle: string;
  /** Précision affichée à côté du libellé (heures, taux). */
  detail: string;
  montantCents: number | null;
  /** Ligne de total, en gras. */
  total?: boolean;
}

const heures = (min: number): string => `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, "0")}`;
const pct = (bp: number): string => `${(bp / 100).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} %`;
const euros = (c: number): string => formatEuros(c);

export function lignesBulletin(m: Mission, r: Reglages): LigneBulletin[] {
  const d = detailMission(m, r);
  const somme = (cle: "normalesMin" | "sup1Min" | "sup2Min") => d.semaines.reduce((s, x) => s + x[cle], 0);
  const lignes: LigneBulletin[] = [{ libelle: "Heures normales", detail: `${heures(somme("normalesMin"))} × ${euros(m.tauxHoraireCents)}`, montantCents: null }];
  if (somme("sup1Min") > 0) lignes.push({ libelle: "Heures supplémentaires", detail: `${heures(somme("sup1Min"))} à +${pct(r.majorationSup1Bp)}`, montantCents: null });
  if (somme("sup2Min") > 0) lignes.push({ libelle: "Heures supplémentaires", detail: `${heures(somme("sup2Min"))} à +${pct(r.majorationSup2Bp)}`, montantCents: null });
  const cotisations = d.brutTotalCents - (d.netCents - d.indemnitesCents);
  lignes.push(
    { libelle: "Salaire de base", detail: "heures × taux", montantCents: d.brutBaseCents },
    { libelle: "Indemnité de fin de mission", detail: pct(r.ifmBp), montantCents: d.ifmCents },
    { libelle: "Congés payés", detail: pct(r.cpBp), montantCents: d.cpCents },
    { libelle: "Brut total", detail: "", montantCents: d.brutTotalCents, total: true },
    { libelle: "Cotisations", detail: pct(r.cotisationsBp), montantCents: -cotisations },
  );
  if (d.indemnitesCents > 0) lignes.push({ libelle: "Paniers et déplacements", detail: "sans cotisations", montantCents: d.indemnitesCents });
  lignes.push({ libelle: "Net estimé", detail: "", montantCents: d.netCents, total: true });
  return lignes;
}

/** Texte d'un PDF : tout en ASCII (accents et € en séquences octales, encodage WinAnsi), pour un fichier sûr quel que soit l'enregistrement. */
function chaine(texte: string): string {
  let out = "";
  for (const c of texte.normalize("NFC")) {
    const code = c.codePointAt(0)!;
    if (c === "(" || c === ")" || c === "\\") out += `\\${c}`;
    else if (code >= 32 && code < 127) out += c;
    else if (c === "€") out += "\\200";
    else if (c === "×") out += "\\327";
    else if (c === "−" || c === "–" || c === "—") out += "-";
    else if (c === "’") out += "'";
    else if (code === 0xa0 || code === 0x202f) out += " ";
    else if (code >= 160 && code <= 255) out += `\\${code.toString(8).padStart(3, "0")}`;
    else out += "?";
  }
  return out;
}

/** Une page A4 : titre, sous-titre, puis les lignes (libellé, détail, montant aligné à droite). */
export function pdfBulletin(titre: string, sousTitre: string, lignes: readonly LigneBulletin[], note: string): string {
  const ops: string[] = [];
  const texte = (x: number, y: number, police: string, taille: number, t: string) => ops.push(`BT /${police} ${taille} Tf ${x} ${y} Td (${chaine(t)}) Tj ET`);
  texte(56, 780, "F2", 18, titre);
  texte(56, 758, "F1", 11, sousTitre);
  let y = 720;
  for (const l of lignes) {
    if (l.total) ops.push(`0.8 G 56 ${y + 14} m 539 ${y + 14} l S 0 G`);
    texte(56, y, l.total ? "F2" : "F1", 11, l.libelle);
    if (l.detail) texte(250, y, "F1", 10, l.detail);
    if (l.montantCents !== null) {
      const m = (l.montantCents < 0 ? "- " : "") + formatEuros(Math.abs(l.montantCents));
      texte(539 - m.length * 6, y, l.total ? "F4" : "F3", 10, m);
    }
    y -= l.total ? 26 : 20;
  }
  texte(56, Math.max(y - 20, 60), "F1", 9, note);
  const contenu = ops.join("\n");
  const objets = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R /F3 6 0 R /F4 7 0 R >> >> /Contents 8 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Courier-Bold /Encoding /WinAnsiEncoding >>",
    `<< /Length ${contenu.length} >>\nstream\n${contenu}\nendstream`,
  ];
  let pdf = "%PDF-1.4\n";
  const positions: number[] = [];
  objets.forEach((o, i) => {
    positions.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objets.length + 1}\n0000000000 65535 f \n${positions.map((p) => `${String(p).padStart(10, "0")} 00000 n \n`).join("")}`;
  pdf += `trailer\n<< /Size ${objets.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return pdf;
}