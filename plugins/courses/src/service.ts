// Le service `courses@1` : ce que d'autres plugins (Repas et recettes) peuvent demander à Courses. Fonction pure, testée sans navigateur ;
// la page de service (service/main.ts) n'y ajoute que la lecture et l'écriture des données du plugin.
//   - `contexte.lire` (lecture) : le budget de la semaine, le jour des courses et les prix vus sur les tickets (par magasin) ;
//   - `listes.ajouter` (écriture) : crée une liste de courses ; rejouer la même demande (même nom, mêmes articles) ne crée pas de doublon ;
//   - `listes.remplacer` (écriture) : remplace les articles d'une liste pas encore réglée (Repas y fusionne une recette).
// `contexte.lire` rend aussi les listes pas encore réglées, pour qu'on puisse y fusionner une recette sans doublon.
import { creerListe, lireDonnees, remplacerArticles } from "./donnees";
import { reglagesDepuis, type Parametres } from "./parametres";
import { baseDePrix } from "./prix";
import { ErreurCourses, type Donnees } from "./types";
import { objet } from "./validation";

export const FONCTIONS: Record<string, "lecture" | "ecriture"> = {
  "contexte.lire": "lecture",
  "listes.ajouter": "ecriture",
  "listes.remplacer": "ecriture",
};

/** Au plus ce nombre de prix rendus (les plus vus d'abord). */
export const PRIX_MAX = 600;

export interface Execution {
  valeur: unknown;
  /** Données à enregistrer, ou `null` si rien n'a changé. */
  donnees: Donnees | null;
}

export function executer(enregistre: unknown, parametres: Parametres, fonction: string, args: unknown): Execution {
  if (!Object.hasOwn(FONCTIONS, fonction)) throw new ErreurCourses("introuvable", `Fonction inconnue : « ${fonction} ».`);
  const d = lireDonnees(enregistre);
  if (fonction === "contexte.lire") {
    const r = reglagesDepuis(parametres);
    const prix = baseDePrix(d)
      .flatMap((a) => [...a.magasins].map(([magasin, p]) => ({ nom: a.nom, magasin, prixCents: p.prixCents, fois: p.fois })))
      .sort((a, b) => b.fois - a.fois)
      .slice(0, PRIX_MAX);
    const listes = d.listes.filter((l) => l.reglement === null).map((l) => ({ id: l.id, nom: l.nom, articles: l.articles.map((a) => a.nom) }));
    return { valeur: { budgetSemaineCents: r.budgetCents, jourCourses: r.jourCourses, prix, listes }, donnees: null };
  }
  if (fonction === "listes.remplacer") {
    const o = objet(args, ["id", "articles"]);
    if (typeof o.id !== "string") throw new ErreurCourses("argument_invalide", "Liste inconnue.");
    return { valeur: { id: o.id }, donnees: remplacerArticles(d, o.id, o.articles) };
  }
  const o = objet(args, ["nom", "articles"]);
  const nom = typeof o.nom === "string" ? o.nom.trim() : "";
  const articles = Array.isArray(o.articles) ? o.articles.map((a) => (typeof a === "string" ? a.trim() : a)) : o.articles;
  const meme = d.listes.find((l) => l.reglement === null && l.nom === nom && JSON.stringify(l.articles.map((a) => a.nom)) === JSON.stringify(articles));
  if (meme) return { valeur: { id: meme.id, rejoue: true }, donnees: null };
  const { id, donnees } = creerListe(d, nom, articles);
  return { valeur: { id, rejoue: false }, donnees };
}
