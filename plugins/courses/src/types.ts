// Modèle de données de Courses (docs/29, section 4) : un budget par semaine, des tickets de caisse et des listes de courses.
// Montants en centimes entiers, jours civils AAAA-MM-JJ. Le budget, le jour des courses et le seuil d'alerte sont des PARAMÈTRES du plugin
// (voir parametres.ts), pas des données : ils se règlent dans Paramètres → Courses.
import type { Jour } from "@etabli/ui/civil";
import type { Centimes } from "@etabli/ui/money";

export const SCHEMA = 1;

export interface Ticket {
  id: string;
  jour: Jour;
  /** Le magasin, ou « Sans magasin ». */
  magasin: string;
  montantCents: Centimes;
  /** La liste de courses réglée par ce ticket, s'il y en a une. */
  listeId: string | null;
}

export interface Article {
  id: string;
  /** Le nom tel qu'il a été tapé : un futur ticket photographié pourra s'y rattacher. */
  nom: string;
  /** Mis dans le caddie. Ne gêne jamais le règlement : on a pu ne pas le prendre ou ne pas le trouver. */
  pris: boolean;
}

/** Une liste réglée est verrouillée : plus aucune modification, seulement une consultation. */
export interface Reglement {
  jour: Jour;
  magasin: string;
  montantCents: Centimes;
  ticketId: string;
}

export interface Liste {
  id: string;
  nom: string;
  articles: Article[];
  reglement: Reglement | null;
}

export interface Donnees {
  schema: typeof SCHEMA;
  suivant: number;
  tickets: Ticket[];
  listes: Liste[];
  /** Ce qui a été transmis à Budget : « budget|ref » → empreinte du contenu envoyé. */
  transmis: Record<string, string>;
}

export type CodeErreur = "argument_invalide" | "introuvable" | "limite_atteinte" | "illisible";

export class ErreurCourses extends Error {
  constructor(
    readonly code: CodeErreur,
    message: string,
  ) {
    super(message);
    this.name = "ErreurCourses";
  }
}

/** Paramètres du plugin, dans leurs unités (euros, pourcents). */
export interface Reglages {
  /** Budget par semaine, en centimes. */
  budgetCents: Centimes;
  /** Jour des courses : 0 = dimanche … 6 = samedi. */
  jourCourses: number;
  /** La jauge passe à l'orange à ce pourcentage du budget. */
  alertePourcent: number;
  /** Le budget non dépensé d'une semaine s'ajoute à la suivante. */
  report: boolean;
}