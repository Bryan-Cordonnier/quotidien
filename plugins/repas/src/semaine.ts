// La semaine des repas : ce qui est prévu matin, midi et soir (saisi à la main, sinon repris du dernier plan concocté), l'heure visée de
// chaque repas et l'heure où commencer à cuisiner (d'après le temps de la recette), et les alertes (rien de prévu, pas de liste de courses).
// Fonctions pures.
import { ajouterJours, comparerJours, type Jour } from "@etabli/ui/civil";
import { ErreurRepas, MOMENTS, type Donnees, type Moment, type Recette, type RepasPrevu, type ReglagesRepas } from "./types";

export const REGLAGES_REPAS_DEFAUT: ReglagesRepas = { actif: false, alertes: true, heures: { matin: 7 * 60 + 30, midi: 12 * 60 + 30, soir: 19 * 60 + 30 } };

/** Les sept jours montrés : aujourd'hui au milieu, trois avant, trois après. */
export const septJours = (aujourdhui: Jour): Jour[] => [-3, -2, -1, 0, 1, 2, 3].map((n) => ajouterJours(aujourdhui, n));

export interface Case {
  jour: Jour;
  moment: Moment;
  plat: string;
  recette: Recette | null;
  /** Heure visée (minutes depuis minuit). */
  heureMin: number;
  /** Heure où commencer à cuisiner, si la recette a un temps. */
  cuisinerMin: number | null;
  /** D'où vient le repas : saisi, ou repris d'un plan concocté. */
  origine: "saisi" | "plan" | "vide";
}

/** Le repas prévu d'une case : la saisie gagne sur le plan concocté le plus récent qui couvre ce jour. */
export function caseDe(d: Donnees, jour: Jour, moment: Moment): Case {
  const r = d.reglages;
  const saisi = d.semaine.find((x) => x.jour === jour && x.moment === moment);
  const plan = d.plans.flatMap((p) => p.repas).find((x) => x.jour === jour && x.moment === moment);
  const recetteId = saisi ? saisi.recetteId : (plan?.recetteId ?? null);
  const recette = recetteId ? (d.recettes.find((x) => x.id === recetteId) ?? null) : null;
  // une recette choisie sans plat écrit : son nom fait le plat
  const plat = (saisi ? saisi.plat : plan?.plat) || recette?.nom || "";
  const heureMin = saisi?.heureMin ?? r.heures[moment];
  return {
    jour,
    moment,
    plat,
    recette,
    heureMin,
    cuisinerMin: recette?.tempsMin ? heureMin - recette.tempsMin : null,
    origine: saisi ? "saisi" : plan ? "plan" : "vide",
  };
}

export const grille = (d: Donnees, aujourdhui: Jour): Case[][] => septJours(aujourdhui).map((j) => MOMENTS.map((m) => caseDe(d, j, m)));

export interface Alerte {
  niveau: "urgent" | "info";
  texte: string;
}

/**
 * Les alertes des trois prochains jours : un repas sans rien de prévu, et des courses à faire (repas prévus mais aucune liste de courses
 * en cours). Rien si le système de repas ou les alertes sont coupés.
 */
export function alertes(d: Donnees, aujourdhui: Jour, listesEnCours: number, maintenantMin: number): Alerte[] {
  if (!d.reglages.actif || !d.reglages.alertes) return [];
  const sortie: Alerte[] = [];
  const nomJour = (j: Jour) => (j === aujourdhui ? "aujourd'hui" : j === ajouterJours(aujourdhui, 1) ? "demain" : new Date(`${j}T12:00:00`).toLocaleDateString("fr-FR", { weekday: "long" }));
  const vides: string[] = [];
  let prevus = 0;
  for (let n = 0; n < 3; n++) {
    const j = ajouterJours(aujourdhui, n);
    for (const m of MOMENTS) {
      const c = caseDe(d, j, m);
      if (n === 0 && c.heureMin < maintenantMin) continue;
      if (c.plat) prevus++;
      else vides.push(`${nomJour(j)} ${m === "matin" ? "matin" : m === "midi" ? "midi" : "soir"}`);
    }
  }
  if (vides.length) sortie.push({ niveau: vides.some((v) => v.startsWith("aujourd'hui")) ? "urgent" : "info", texte: `Rien de prévu : ${vides.slice(0, 4).join(", ")}${vides.length > 4 ? "…" : ""}.` });
  if (prevus > 0 && listesEnCours === 0) sortie.push({ niveau: "urgent", texte: "Des repas sont prévus mais aucune liste de courses n'est en cours : pense à faire les courses." });
  if (prevus === 0 && listesEnCours === 0) sortie.push({ niveau: "info", texte: "Ni repas ni liste de courses prévus pour les trois prochains jours." });
  return sortie;
}

/** Prévoit (ou efface, avec un plat vide) le repas d'une case. */
export function prevoir(d: Donnees, r: RepasPrevu): Donnees {
  if (r.plat.length > 160) throw new ErreurRepas("argument_invalide", "Le plat : 160 caractères au plus.");
  if (r.recetteId && !d.recettes.some((x) => x.id === r.recetteId)) throw new ErreurRepas("introuvable", "Recette introuvable.");
  const autres = d.semaine.filter((x) => !(x.jour === r.jour && x.moment === r.moment));
  // On ne garde que deux mois de semaines passées.
  const limite = ajouterJours(r.jour, -60);
  const gardes = autres.filter((x) => comparerJours(x.jour, limite) >= 0);
  return { ...d, semaine: r.plat.trim() || r.recetteId ? [...gardes, { ...r, plat: r.plat.trim() }] : gardes };
}

export function reglerRepas(d: Donnees, r: Partial<ReglagesRepas>): Donnees {
  return { ...d, reglages: { ...d.reglages, ...r, heures: { ...d.reglages.heures, ...(r.heures ?? {}) } } };
}

/** Les moments de cuisine des prochains jours, à poser dans l'Agenda (« commencer à cuisiner »). */
export function cuisines(d: Donnees, aujourdhui: Jour): { jour: Jour; debutMin: number; finMin: number; titre: string }[] {
  if (!d.reglages.actif) return [];
  return [0, 1, 2, 3, 4, 5, 6]
    .map((n) => ajouterJours(aujourdhui, n))
    .flatMap((j) => MOMENTS.map((m) => caseDe(d, j, m)))
    .filter((c) => c.cuisinerMin !== null && c.cuisinerMin >= 0)
    .map((c) => ({ jour: c.jour, debutMin: c.cuisinerMin!, finMin: c.heureMin, titre: `🍳 Cuisiner : ${c.plat || c.recette!.nom}` }));
}
