// Modèle de données de Repas et recettes : une bibliothèque de recettes, les ustensiles de la maison, des relevés de prix (recherches,
// saisies, l'assistant) et les derniers plans de repas concoctés. Montants en centimes entiers, jours civils AAAA-MM-JJ.
// Les prix vus sur les tickets restent chez Courses : on les lui demande (service `courses@1`), on ne les recopie pas.
import type { Jour } from "@etabli/ui/civil";
import type { Centimes } from "@etabli/ui/money";

export const SCHEMA = 1;

export const MOMENTS = ["matin", "midi", "soir"] as const;
export type Moment = (typeof MOMENTS)[number];
export const LIBELLES_MOMENTS: Record<Moment, string> = { matin: "Petit-déjeuner", midi: "Midi", soir: "Soir" };

/** Les rayons de la bibliothèque de recettes, dans l'ordre d'affichage. */
export const CATEGORIES = [
  "Petit-déjeuner",
  "Entrées",
  "Salades",
  "Soupes",
  "Plats chauds",
  "Plats froids",
  "Pâtes",
  "Riz et céréales",
  "Pizzas et tartes",
  "Viandes",
  "Poissons",
  "Végétarien",
  "Charcuterie",
  "Sauces",
  "Desserts",
  "Pâtisseries",
  "Boissons",
  "Autres",
] as const;
export type Categorie = (typeof CATEGORIES)[number];

export const SOURCES = ["moi", "ia", "max"] as const;
export type Source = (typeof SOURCES)[number];

export interface Ingredient {
  nom: string;
  /** Quantité en clair (« 200 g », « 2 », « 1 c. à soupe ») : une recette se lit, elle ne se calcule pas. */
  quantite: string;
}

/** Valeurs nutritionnelles d'UNE portion (estimées par l'IA) : kilocalories et grammes. */
export interface Nutrition {
  kcal: number;
  proteines: number;
  glucides: number;
  lipides: number;
}

export interface Recette {
  id: string;
  nom: string;
  categorie: Categorie;
  /** Nombre de personnes pour les quantités données. */
  portions: number;
  /** Temps total en minutes, ou `null` s'il n'est pas connu. */
  tempsMin: number | null;
  ingredients: Ingredient[];
  etapes: string[];
  ustensiles: string[];
  notes: string;
  /** Qui l'a ajoutée : moi (saisie), l'IA (plan concocté), Max (l'assistant). */
  source: Source;
  /** Épinglée en tête de la page. */
  favori: boolean;
  /** Par portion, ou `null` tant qu'elle n'a pas été estimée. */
  nutrition: Nutrition | null;
  /** Quelques mots pour donner envie (« Gratin crémeux, prêt en 30 min »). */
  description: string;
  /** Ma note, de 1 à 5 étoiles, ou 0 si pas notée. */
  note: number;
  /** Photo réduite (JPEG en « data: »), ou vide. */
  photo: string;
  /** Jour où je l'ai faite et notée (« Testée »), ou `null` tant que je ne l'ai pas faite. */
  teste: Jour | null;
}

/** Une recette mise dans une liste de courses : une fois la liste réglée et le repas passé, on demande si je l'ai faite. */
export interface ATester {
  recetteId: string;
  /** La liste de Courses où elle a été mise. */
  listeId: string;
  depuis: Jour;
}

/** Un repas prévu à la main dans la semaine (gagne sur le plan concocté). */
export interface RepasPrevu {
  jour: Jour;
  moment: Moment;
  plat: string;
  recetteId: string | null;
  /** Heure visée pour manger (minutes depuis minuit), ou `null` : l'heure habituelle du moment. */
  heureMin: number | null;
}

/** Réglages de la page Repas. */
export interface ReglagesRepas {
  /** Le système de repas (semaine, heure de cuisine, alertes) ; coupé tant qu'on ne gère pas ses repas soi-même. */
  actif: boolean;
  alertes: boolean;
  /** Heures habituelles des repas (minutes depuis minuit). */
  heures: Record<Moment, number>;
}

/** Un prix relevé ailleurs que sur un ticket : une recherche, une saisie, l'assistant. */
export interface PrixReleve {
  nom: string;
  magasin: string;
  /** Prix d'UNE unité d'achat (un paquet, une pièce, un kilo selon `unite`). */
  prixCents: Centimes;
  /** Ce que ce prix achète (« paquet 500 g », « le kg », « la pièce »). */
  unite: string;
  jour: Jour;
  source: "recherche" | "saisie" | "max";
}

/** Un repas d'un plan : un jour, un moment, combien de personnes, le plat et sa recette s'il y en a une. */
export interface RepasPlan {
  jour: Jour;
  moment: Moment;
  personnes: number;
  plat: string;
  recetteId: string | null;
}

/** Une ligne de la liste de courses d'un plan, chiffrée dans le magasin conseillé. */
export interface LigneCourse {
  nom: string;
  /** À quoi elle sert (« pâtes carbo, salade mardi »). */
  pour: string;
  /** Unités à acheter (paquets, pièces…). */
  unites: number;
  /** Prix d'une unité dans le magasin conseillé : connu (tickets, relevés) ou estimé par l'IA ; `null` si inconnu. */
  prixUnitaireCents: Centimes | null;
  /** Vrai si le prix n'a été vu nulle part et vient d'une estimation. */
  estime: boolean;
}

export interface TotalMagasin {
  magasin: string;
  totalCents: Centimes;
  /** Lignes dont le prix a été vu dans ce magasin (le reste est complété par des moyennes ou des estimations). */
  connues: number;
}

export interface Plan {
  id: string;
  /** Jour où il a été concocté. */
  cree: Jour;
  debut: Jour;
  jours: number;
  budgetCents: Centimes;
  /** Semaine exceptionnelle (invités) : le budget habituel a été dépassé volontairement. */
  exceptionnel: boolean;
  envies: string;
  repas: RepasPlan[];
  courses: LigneCourse[];
  magasinConseille: string;
  totaux: TotalMagasin[];
  totalCents: Centimes;
  remarques: string;
  /** La liste a été envoyée à Courses. */
  envoye: boolean;
}

export interface Donnees {
  schema: typeof SCHEMA;
  suivant: number;
  recettes: Recette[];
  /** Les ustensiles de la maison : l'IA ne propose que ce qu'on peut cuisiner avec. */
  ustensiles: string[];
  prix: PrixReleve[];
  /** Les derniers plans concoctés, du plus récent au plus ancien. */
  plans: Plan[];
  /** Les repas prévus à la main, jour par jour. */
  semaine: RepasPrevu[];
  reglages: ReglagesRepas;
  aTester: ATester[];
}

export type CodeErreur = "argument_invalide" | "introuvable" | "limite_atteinte" | "illisible";

export class ErreurRepas extends Error {
  constructor(
    readonly code: CodeErreur,
    message: string,
  ) {
    super(message);
    this.name = "ErreurRepas";
  }
}
