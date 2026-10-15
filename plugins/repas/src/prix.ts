// Chiffrer une liste de courses et choisir le magasin. Les prix viennent de deux sources : les tickets scannés (donnés par Courses) et les
// relevés (recherches, saisies, l'assistant). Chaque ligne est rapprochée des articles connus par ses mots (« spaghetti 500 g » ↔
// « Spaghetti n°5 Barilla 500g »), on calcule le total de toute la liste dans chaque magasin, et on conseille le moins cher. Une ligne jamais
// vue dans un magasin y est comptée au prix moyen connu, ou à l'estimation de l'IA : un magasin n'est pas « moins cher » parce qu'il manque des articles.
// Tout est local et instantané ; l'IA ne fait que proposer les lignes et une estimation quand aucun prix n'est connu.
import type { Centimes } from "@etabli/ui/money";
import type { LigneCourse, PrixReleve, TotalMagasin } from "./types";

/** Un prix connu : d'un ticket (via Courses) ou d'un relevé. */
export interface PrixConnu {
  nom: string;
  magasin: string;
  prixCents: Centimes;
  /** Combien de fois il a été vu (un relevé compte pour un). */
  fois: number;
}

const MOTS_VIDES = new Set(["de", "du", "des", "la", "le", "les", "l", "d", "au", "aux", "a", "et", "en", "un", "une", "x", "pour", "avec", "paquet", "boite", "sachet", "pot", "bouteille", "barquette", "piece", "lot"]);
const UNITES = /^(\d+([.,]\d+)?)?(g|kg|mg|l|cl|ml|dl|pcs?|pce|pieces?|u|x\d*|\d+x|%|cm|mm|m|n\d*)$/;

export const normaliser = (nom: string): string =>
  nom
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** Les mots qui comptent d'un nom d'article : sans accents, quantités, unités ni petits mots, au singulier. */
export function jetons(nom: string): string[] {
  const mots = normaliser(nom)
    .split(" ")
    .filter((m) => m !== "" && !MOTS_VIDES.has(m) && !UNITES.test(m) && !/^\d+$/.test(m))
    .map((m) => (m.length > 3 && m.endsWith("s") ? m.slice(0, -1) : m));
  return [...new Set(mots)];
}

/** Ressemblance entre une ligne cherchée et un article connu : tous les mots cherchés doivent s'y retrouver pour compter vraiment. */
function ressemblance(q: readonly string[], c: readonly string[]): number {
  if (q.length === 0 || c.length === 0) return 0;
  const communs = q.filter((m) => c.includes(m)).length;
  const contenu = communs / q.length;
  const jaccard = communs / (q.length + c.length - communs);
  return contenu < 1 ? 0.7 * contenu * contenu : 0.7 + 0.3 * jaccard;
}

const SEUIL = 0.7;

/** Rassemble les prix des tickets et des relevés (un relevé plus récent que les tickets a le même poids qu'un achat). */
export function basePrix(tickets: readonly PrixConnu[], releves: readonly PrixReleve[]): (PrixConnu & { jetons: string[] })[] {
  return [...tickets, ...releves.map((r) => ({ nom: r.nom, magasin: r.magasin, prixCents: r.prixCents, fois: 1 }))]
    .filter((p) => p.prixCents > 0)
    .map((p) => ({ ...p, jetons: jetons(p.nom) }))
    .filter((p) => p.jetons.length > 0);
}

/** Le prix d'une unité de cette ligne dans chaque magasin où un article ressemblant a été vu (moyenne pondérée par le nombre de fois). */
export function prixParMagasin(nom: string, base: ReturnType<typeof basePrix>): Map<string, Centimes> {
  const q = jetons(nom);
  const parMagasin = new Map<string, { somme: number; fois: number }>();
  for (const p of base) {
    if (ressemblance(q, p.jetons) < SEUIL) continue;
    const m = parMagasin.get(p.magasin) ?? { somme: 0, fois: 0 };
    m.somme += p.prixCents * p.fois;
    m.fois += p.fois;
    parMagasin.set(p.magasin, m);
  }
  return new Map([...parMagasin].map(([magasin, m]) => [magasin, Math.round(m.somme / m.fois)]));
}

export interface LigneAChiffrer {
  nom: string;
  pour: string;
  unites: number;
  /** Estimation de l'IA pour une unité, ou `null`. */
  estimeCents: Centimes | null;
}

export interface Chiffrage {
  /** Total de toute la liste dans chaque magasin connu, du moins cher au plus cher. */
  totaux: TotalMagasin[];
  /** Le magasin conseillé (le moins cher pour TOUTE la liste) ; vide s'il n'y a aucun prix connu. */
  magasin: string;
  /** Les lignes chiffrées dans le magasin conseillé. */
  lignes: LigneCourse[];
  totalCents: Centimes;
  /** Lignes sans prix ni estimation (comptées 0). */
  inconnues: number;
}

/** Chiffre les lignes dans chaque magasin et conseille le moins cher pour l'ensemble (pas article par article : on fait les courses dans UN magasin). */
export function chiffrer(lignes: readonly LigneAChiffrer[], base: ReturnType<typeof basePrix>): Chiffrage {
  const prix = lignes.map((l) => prixParMagasin(l.nom, base));
  const magasins = [...new Set(prix.flatMap((p) => [...p.keys()]))];
  // le prix « de repli » d'une ligne : la moyenne des magasins où on l'a vue, sinon l'estimation de l'IA
  const repli = lignes.map((l, i) => {
    const vus = [...prix[i]!.values()];
    return vus.length > 0 ? Math.round(vus.reduce((a, b) => a + b, 0) / vus.length) : l.estimeCents;
  });
  const total = (magasin: string | null) =>
    lignes.reduce((s, l, i) => s + l.unites * ((magasin !== null ? prix[i]!.get(magasin) : undefined) ?? repli[i] ?? 0), 0);
  const totaux: TotalMagasin[] = magasins
    .map((magasin) => ({ magasin, totalCents: total(magasin), connues: prix.filter((p) => p.has(magasin)).length }))
    .sort((a, b) => a.totalCents - b.totalCents || b.connues - a.connues);
  const magasin = totaux[0]?.magasin ?? "";
  const chiffrees: LigneCourse[] = lignes.map((l, i) => {
    const vu = magasin !== "" ? prix[i]!.get(magasin) : undefined;
    const p = vu ?? repli[i] ?? null;
    return { nom: l.nom, pour: l.pour, unites: l.unites, prixUnitaireCents: p, estime: vu === undefined && prix[i]!.size === 0 && p !== null };
  });
  return {
    totaux,
    magasin,
    lignes: chiffrees,
    totalCents: magasin !== "" ? totaux[0]!.totalCents : total(null),
    inconnues: chiffrees.filter((l) => l.prixUnitaireCents === null).length,
  };
}
