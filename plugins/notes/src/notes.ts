// Notes et pense-bête : ce qui passe par la tête (« appeler mamie », « faire l'URSSAF cette semaine »), noté ici, par Max ou par Claude.
// Le cerveau lit et écrit les mêmes données (`plugin.notes`) ; Max choisit le bon moment pour rappeler ce qui doit l'être.
// Lecture défensive : une note abîmée est ignorée, jamais tout le carnet.

/** Quand rappeler une note : jamais, « Max choisit le bon moment », ou à partir d'un instant (millisecondes). */
export type Rappel = { mode: "aucun" } | { mode: "max"; avant: string | null } | { mode: "heure"; quand: number };

export interface Note {
  id: string;
  texte: string;
  /** Création (millisecondes) ; qui l'a écrite. */
  cree: number;
  par: "bryan" | "max" | "claude";
  fait: boolean;
  rappel: Rappel;
  /** Instant du rappel envoyé, ou null. */
  rappele: number | null;
}

export interface Carnet {
  schema: 1;
  suivant: number;
  notes: Note[];
}

export const CARNET_VIDE: Carnet = { schema: 1, suivant: 1, notes: [] };
const MAX_NOTES = 2000;

const texte = (v: unknown): string => (typeof v === "string" ? v.replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, " ").trim().slice(0, 1000) : "");
const instant = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) && v > 0 ? Math.round(v) : null);

function lireRappel(v: unknown): Rappel {
  const o = typeof v === "object" && v !== null ? (v as Record<string, unknown>) : {};
  if (o.mode === "heure" && instant(o.quand)) return { mode: "heure", quand: instant(o.quand)! };
  if (o.mode === "max") return { mode: "max", avant: typeof o.avant === "string" && /^\d{4}-\d{2}-\d{2}$/.test(o.avant) ? o.avant : null };
  return { mode: "aucun" };
}

export function nettoyer(brut: unknown): Carnet {
  const o = typeof brut === "object" && brut !== null ? (brut as Record<string, unknown>) : {};
  const notes: Note[] = [];
  const vus = new Set<string>();
  for (const n of Array.isArray(o.notes) ? o.notes.slice(-MAX_NOTES) : []) {
    const x = typeof n === "object" && n !== null ? (n as Record<string, unknown>) : {};
    const id = typeof x.id === "string" && /^n\d{1,9}$/.test(x.id) ? x.id : null;
    const t = texte(x.texte);
    if (!id || !t || vus.has(id)) continue;
    vus.add(id);
    notes.push({
      id,
      texte: t,
      cree: instant(x.cree) ?? 0,
      par: x.par === "max" || x.par === "claude" ? x.par : "bryan",
      fait: x.fait === true,
      rappel: lireRappel(x.rappel),
      rappele: instant(x.rappele),
    });
  }
  const plusGrand = notes.reduce((m, n) => Math.max(m, Number(n.id.slice(1))), 0);
  const suivant = typeof o.suivant === "number" && Number.isInteger(o.suivant) && o.suivant > plusGrand ? o.suivant : plusGrand + 1;
  return { schema: 1, suivant, notes };
}

export function ajouter(c: Carnet, t: string, rappel: Rappel, maintenant: number): Carnet {
  const propre = texte(t);
  if (!propre) return c;
  const note: Note = { id: `n${c.suivant}`, texte: propre, cree: maintenant, par: "bryan", fait: false, rappel, rappele: null };
  return { ...c, suivant: c.suivant + 1, notes: [...c.notes, note].slice(-MAX_NOTES) };
}

export const basculer = (c: Carnet, id: string): Carnet => ({ ...c, notes: c.notes.map((n) => (n.id === id ? { ...n, fait: !n.fait } : n)) });
export const retirer = (c: Carnet, id: string): Carnet => ({ ...c, notes: c.notes.filter((n) => n.id !== id) });

/** Les notes à faire d'abord (les plus récentes en haut), puis les faites. */
export const ordonner = (c: Carnet): Note[] => [...c.notes].sort((a, b) => Number(a.fait) - Number(b.fait) || b.cree - a.cree);
