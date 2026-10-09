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
