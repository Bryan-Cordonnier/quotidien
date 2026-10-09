// Lecture stricte des données : « rien d'enregistré » donne des données vides ; des données PRÉSENTES et illisibles sont une erreur,
// jamais des données vides (on écraserait l'historique des recalages).
import { estJour } from "@etabli/ui/civil";
import { ErreurMesFinances, RECALAGES_MAX, ROLES, SCHEMA, type Donnees, type Recalage, type Role } from "./types";

export const donneesVides = (): Donnees => ({ schema: SCHEMA, roles: {}, recalages: [], comptesWidgets: {} });

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
  // Ajouté après coup : absent des données plus anciennes, ce n'est pas une erreur. L'ancien champ « compteWidget » devient l'exemplaire 1.
  const comptesWidgets: Record<string, string> = {};
  const brutComptes = o.comptesWidgets ?? (typeof o.compteWidget === "string" ? { "1": o.compteWidget } : {});
  if (typeof brutComptes !== "object" || brutComptes === null || Array.isArray(brutComptes)) return illisible();
  for (const [n, id] of Object.entries(brutComptes)) {
    if (!/^[1-9]\d{0,2}$/.test(n) || typeof id !== "string" || !/^[A-Za-z0-9_-]{1,40}$/.test(id)) return illisible();
    comptesWidgets[n] = id;
  }  return { schema: SCHEMA, roles, recalages, comptesWidgets };
}

/** Choisit le compte d'un exemplaire du widget « Un compte » (`null` : aucun). */
export function avecCompteWidget(d: Donnees, exemplaire: number, compteId: string | null): Donnees {
  const { [String(exemplaire)]: _ancien, ...autres } = d.comptesWidgets;
  return { ...d, comptesWidgets: compteId ? { ...autres, [String(exemplaire)]: compteId } : autres };
}

export function avecRole(d: Donnees, compteId: string, role: Role): Donnees {
  return { ...d, roles: { ...d.roles, [compteId]: role } };
}

/** Ajoute un recalage (le plus récent en dernier) ; l'historique est borné. */
export function avecRecalage(d: Donnees, r: Recalage): Donnees {
  return { ...d, recalages: [...d.recalages, r].slice(-RECALAGES_MAX) };
}
