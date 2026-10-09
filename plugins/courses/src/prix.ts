// Estimer une liste de courses d'après NOS prix : chaque article tapé simplement (« Lait cru 1L », « salade », « coca ») est rapproché des
// lignes des tickets déjà scannés (hors budget compris), on en tire un prix par magasin, et on conseille le magasin le moins cher pour toute la
// liste. Tout est local et sans IA : rien ne part sur internet, et c'est instantané.
import type { Centimes } from "@etabli/ui/money";
import { normaliser } from "./menu";
import type { Donnees } from "./types";

const MOTS_VIDES = new Set(["de", "du", "des", "la", "le", "les", "l", "d", "au", "aux", "a", "et", "en", "un", "une", "x", "pour", "avec"]);
const UNITES = /^(\d+([.,]\d+)?)?(g|kg|mg|l|cl|ml|dl|pcs?|pce|pieces?|u|x\d*|\d+x|%|cm|mm|m)$/;

/** Les mots qui comptent d'un nom d'article : sans accents, sans quantités ni unités (« 1L », « 500g »), sans petits mots, au singulier. */
export function jetons(nom: string): string[] {
  const mots = normaliser(nom)
    .split(" ")
    .filter((m) => m !== "" && !MOTS_VIDES.has(m) && !UNITES.test(m) && !/^\d+$/.test(m))
    .map((m) => (m.length > 3 && m.endsWith("s") ? m.slice(0, -1) : m));
  return [...new Set(mots)];
}

/** Un nombre devant le nom (« 2 yaourts », « 6 œufs ») : la quantité à acheter ; sinon 1. */
export function multiplicateur(nom: string): number {
  const m = /^\s*(\d{1,2})\s*x?\s+\S/.exec(nom);
  const n = m ? Number(m[1]) : 1;
  return n >= 1 && n <= 24 ? n : 1;
}

export interface PrixArticle {
  nom: string;
  jetons: string[];
  /** Prix unitaire moyen par magasin. */
  magasins: Map<string, { prixCents: Centimes; fois: number }>;
  /** Prix unitaire moyen tous magasins confondus (pour compléter un magasin où l'article n'a pas encore été vu). */
  moyenneCents: Centimes;
}

/** La base de prix : un article par nom normalisé, avec son prix unitaire dans chaque magasin où on l'a vu. */
export function baseDePrix(d: Donnees): PrixArticle[] {
  const parCle = new Map<string, { nom: string; parMagasin: Map<string, number[]> }>();
  for (const t of d.tickets) {
    for (const l of t.articles) {
      if (l.quantite <= 0) continue;
      const cle = normaliser(l.nom);
      if (cle === "") continue;
      const a = parCle.get(cle) ?? { nom: l.nom, parMagasin: new Map() };
      const liste = a.parMagasin.get(t.magasin) ?? [];
      liste.push(l.prixCents / l.quantite);
      a.parMagasin.set(t.magasin, liste);
      parCle.set(cle, a);
    }
  }
  return [...parCle.values()]
    .map((a) => {
      const magasins = new Map([...a.parMagasin].map(([m, v]) => [m, { prixCents: Math.round(v.reduce((x, y) => x + y, 0) / v.length), fois: v.length }]));
      const tous = [...a.parMagasin.values()].flat();
      return { nom: a.nom, jetons: jetons(a.nom), magasins, moyenneCents: Math.round(tous.reduce((x, y) => x + y, 0) / tous.length) };
    })
    .filter((a) => a.jetons.length > 0);
}

/** Ressemblance entre l'article tapé et un article connu : tous les mots tapés doivent se retrouver (« salade » → « salade verte »). */
function ressemblance(q: string[], c: string[]): number {
  if (q.length === 0 || c.length === 0) return 0;
  const communs = q.filter((m) => c.includes(m)).length;
  const contenu = communs / q.length;
  const jaccard = communs / (q.length + c.length - communs);
  return contenu < 1 ? 0.7 * contenu * contenu : 0.7 + 0.3 * jaccard;
}

const SEUIL = 0.7;

/**
 * L'article de la base qui correspond à ce qui a été tapé. Tous les articles connus qui contiennent tous les mots tapés sont réunis : « salade »
 * regroupe « Salade verte » (vue chez Lidl) et « Salade » (vue chez Leclerc), avec un prix moyen par magasin pondéré par le nombre d'achats.
 */
export function trouver(nom: string, base: readonly PrixArticle[]): PrixArticle | null {
  const q = jetons(nom);
  const candidats = base.map((a) => ({ a, s: ressemblance(q, a.jetons) })).filter((c) => c.s >= SEUIL - 1e-9);
  if (candidats.length === 0) return null;
  candidats.sort((x, y) => y.s - x.s || achats(y.a) - achats(x.a));
  const meilleur = candidats[0]!.a;
  if (candidats.length === 1) return meilleur;

  const parMagasin = new Map<string, { somme: number; fois: number }>();
  for (const { a } of candidats) {
    for (const [m, v] of a.magasins) {
      const x = parMagasin.get(m) ?? { somme: 0, fois: 0 };
      x.somme += v.prixCents * v.fois;
      x.fois += v.fois;
      parMagasin.set(m, x);
    }
  }
  const magasins = new Map([...parMagasin].map(([m, x]) => [m, { prixCents: Math.round(x.somme / x.fois), fois: x.fois }]));
  const toutes = [...parMagasin.values()];
  return { nom: meilleur.nom, jetons: meilleur.jetons, magasins, moyenneCents: Math.round(toutes.reduce((n, x) => n + x.somme, 0) / toutes.reduce((n, x) => n + x.fois, 0)) };
}

const achats = (a: PrixArticle): number => [...a.magasins.values()].reduce((n, m) => n + m.fois, 0);
export interface LigneEstimee {
  /** L'article tel qu'il est écrit dans la liste. */
  nom: string;
  /** L'article de la base auquel il a été rapproché (« Lait cru bio 1L »), ou `null` : prix inconnu. */
  connu: string | null;
  quantite: number;
  /** Prix de la ligne dans le magasin conseillé (centimes), ou `null`. */
  prixCents: Centimes | null;
}

export interface MagasinEstime {
  magasin: string;
  totalCents: Centimes;
  /** Articles dont le prix a été vu dans CE magasin ; les autres sont complétés par leur prix moyen ailleurs. */
  vusIci: number;
}

export interface Estimation {
  /** Du moins cher au plus cher. */
  magasins: MagasinEstime[];
  conseille: MagasinEstime | null;
  /** Les lignes, avec leur prix dans le magasin conseillé. */
  lignes: LigneEstimee[];
  /** Articles qu'on sait chiffrer / articles de la liste. */
  connus: number;
  total: number;
}

/** Estime une liste : le total dans chaque magasin connu, le magasin le moins cher, et le prix de chaque ligne. */
export function estimerListe(articles: readonly string[], base: readonly PrixArticle[]): Estimation {
  const rapproches = articles.map((nom) => ({ nom, a: trouver(nom, base), quantite: multiplicateur(nom) }));
  const connus = rapproches.filter((r) => r.a !== null);
  const noms = new Set<string>();
  for (const r of connus) for (const m of r.a!.magasins.keys()) noms.add(m);

  const magasins: MagasinEstime[] = [...noms].map((magasin) => {
    let totalCents = 0;
    let vusIci = 0;
    for (const r of connus) {
      const ici = r.a!.magasins.get(magasin);
      if (ici) vusIci++;
      totalCents += (ici?.prixCents ?? r.a!.moyenneCents) * r.quantite;
    }
    return { magasin, totalCents, vusIci };
  });
  // Le moins cher d'abord ; à prix égal, celui où l'on a le plus de prix réellement vus.
  magasins.sort((x, y) => x.totalCents - y.totalCents || y.vusIci - x.vusIci || x.magasin.localeCompare(y.magasin, "fr"));
  const conseille = magasins[0] ?? null;
  const lignes: LigneEstimee[] = rapproches.map((r) => ({
    nom: r.nom,
    connu: r.a?.nom ?? null,
    quantite: r.quantite,
    prixCents: r.a && conseille ? (r.a.magasins.get(conseille.magasin)?.prixCents ?? r.a.moyenneCents) * r.quantite : null,
  }));
  return { magasins, conseille, lignes, connus: connus.length, total: articles.length };
}