// Lecture stricte des données : « rien d'enregistré » donne des données vides ; des données PRÉSENTES et illisibles sont une erreur,
// jamais des données vides (on écraserait l'historique des recalages).
import { estJour } from "@etabli/ui/civil";
import { ErreurMesFinances, RECALAGES_MAX, ROLES, SCHEMA, type Donnees, type Recalage, type Role } from "./types";

export const donneesVides = (): Donnees => ({ schema: SCHEMA, roles: {}, recalages: [] });

const illisible = (): never => {
  throw new ErreurMesFinances("illisible", "Les données de Mes finances sont illisibles.");
};

export function lireDonnees(enregistre: unknown): Donnees {
  if (enregistre === null || enregistre === undefined) return donneesVides();
  if (typeof enregistre !== "object" || Array.isArray(enregistre)) return illisible();
  const o = enregistre as Record<string, unknown>;
  if (o.schema !== SCHEMA || typeof o.roles !== "object" || o.roles === null || Array.isArray(o.roles) || !Array.isArray(o.recalages)) return illisible();
  const roles: Record<string, Role> = {};
  for (const [id, role] of Object.entries(o.roles)) {
    if (!ROLES.includes(role as Role) || !/^[A-Za-z0-9_-]{1,40}$/.test(id)) return illisible();
    roles[id] = role as Role;
  }
  const recalages: Recalage[] = o.recalages.map((r: unknown) => {
    const x = r as Record<string, unknown> | null;
    if (!x || !estJour(x.jour) || !Number.isSafeInteger(x.ecartCents)) return illisible();
    return { jour: x.jour as string, ecartCents: x.ecartCents as number };
  });
  if (recalages.length > RECALAGES_MAX) return illisible();
  return { schema: SCHEMA, roles, recalages };
}

export function avecRole(d: Donnees, compteId: string, role: Role): Donnees {
  return { ...d, roles: { ...d.roles, [compteId]: role } };
}

/** Ajoute un recalage (le plus récent en dernier) ; l'historique est borné. */
export function avecRecalage(d: Donnees, r: Recalage): Donnees {
  return { ...d, recalages: [...d.recalages, r].slice(-RECALAGES_MAX) };
}
