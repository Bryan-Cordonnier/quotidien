// Données propres à Mes finances. L'argent réel reste dans Finances et le prévu dans Budget : ici, seulement la manière dont je regarde
// mes comptes (rôles) et l'historique des recalages. Montants en centimes entiers, jours civils AAAA-MM-JJ.
import type { Jour } from "@etabli/ui/civil";

export const SCHEMA = 1;
export const RECALAGES_MAX = 60;

/** « vie » : l'argent que je dépense ; « secours » : mis de côté, compté à part ; « hors » : ignoré. */
export type Role = "vie" | "secours" | "hors";
export const ROLES: readonly Role[] = ["vie", "secours", "hors"];

export interface Recalage {
  jour: Jour;
  /** Solde réel moins estimé, au moment du recalage (positif : j'avais plus que prévu). */
  ecartCents: number;
  /** L'écriture de Finances qui a corrigé l'écart (absente des recalages anciens ou sans écart). */
  ecritureId?: string;
}

export interface Donnees {
  schema: typeof SCHEMA;
  /** Rôle choisi par compte ; un compte absent prend le rôle par défaut de son type. */
  roles: Record<string, Role>;
  recalages: Recalage[];
  /** Le compte que montre chaque exemplaire du widget « Un compte » de l'accueil (numéro d'exemplaire → compte). */
  comptesWidgets: Record<string, string>;
}

export interface Compte {
  id: string;
  nom: string;
  type: string;
  soldeInitialCents?: number;
  ouvertLe?: Jour;
  archive?: boolean;
}

/** Les types de compte que connaît Finances, avec leur nom. */
export const TYPES_COMPTE: { valeur: string; nom: string }[] = [
  { valeur: "courant", nom: "Compte courant" },
  { valeur: "secondaire", nom: "Compte secondaire" },
  { valeur: "pro", nom: "Compte pro" },
  { valeur: "livret-a", nom: "Livret A" },
  { valeur: "lep", nom: "LEP" },
  { valeur: "epargne", nom: "Autre épargne" },
  { valeur: "pea", nom: "PEA" },
  { valeur: "especes", nom: "Espèces" },
  { valeur: "autre", nom: "Autre" },
];
export const nomType = (t: string): string => TYPES_COMPTE.find((x) => x.valeur === t)?.nom ?? t;

/** Une écriture de Finances telle que la montre l'historique. */
export interface Ecriture {
  id: string;
  compteId: string;
  montantCents: number;
  jour: Jour;
  quand: number;
  libelle: string;
  source: string;
  annule: string | null;
}

/** Un abonnement ou un paiement en plusieurs fois (Budget). */
export interface Abonnement {
  id: string;
  libelle: string;
  montantCents: number;
  compteId: string | null;
  periodicite: "semaine" | "mois" | "an";
  jour: Jour;
  aResilier: boolean;
  echeances: number | null;
}

export interface Prevision {
  id: string;
  jour: Jour;
  montantCents: number;
  compteId: string | null;
  libelle: string;
}

export interface Reglages {
  seuilCents: number;
  horizon: number;
  recalagesRetenus: number;
}

export class ErreurMesFinances extends Error {
  constructor(
    readonly code: "illisible" | "argument_invalide",
    message: string,
  ) {
    super(message);
    this.name = "ErreurMesFinances";
  }
}
