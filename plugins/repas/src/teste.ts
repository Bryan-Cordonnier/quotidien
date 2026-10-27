// « Testée » : une recette mise dans une liste de courses, une fois la liste réglée (elle n'est plus ouverte dans Courses) et le repas
// prévu passé, on demande si je l'ai faite et ma note. Fonctions pures.
import { ajouterJours, comparerJours, type Jour } from "@etabli/ui/civil";
import { caseDe } from "./semaine";
import { MOMENTS, type Donnees, type Recette } from "./types";

/** Retient qu'une recette vient d'être mise dans une liste de courses (une seule demande en attente par recette). */
export function mettreATester(d: Donnees, recetteId: string, listeId: string, jour: Jour): Donnees {
  return { ...d, aTester: [...d.aTester.filter((a) => a.recetteId !== recetteId), { recetteId, listeId, depuis: jour }] };
}

/**
 * Les recettes à demander maintenant. `listesOuvertes` : les listes pas encore réglées de Courses (une liste qui n'y est plus a été
 * réglée — ou supprimée : on demande quand même, on peut répondre « pas faite »). Si un repas avec la recette est prévu depuis la mise en
 * liste, on attend son heure ; sinon on demande dès le lendemain de la mise en liste.
 */
export function aDemander(d: Donnees, listesOuvertes: readonly string[], aujourdhui: Jour, maintenantMin: number): Recette[] {
  const sortie: Recette[] = [];
  for (const a of d.aTester) {
    const recette = d.recettes.find((r) => r.id === a.recetteId);
    if (!recette || listesOuvertes.includes(a.listeId)) continue;
    // les repas prévus avec cette recette, de la mise en liste à une semaine après aujourd'hui
    const repas = [];
    for (let j = a.depuis; comparerJours(j, ajouterJours(aujourdhui, 7)) <= 0; j = ajouterJours(j, 1)) {
      for (const m of MOMENTS) {
        const c = caseDe(d, j, m);
        if (c.recette?.id === a.recetteId) repas.push(c);
      }
    }
    const passe = repas.some((c) => comparerJours(c.jour, aujourdhui) < 0 || (c.jour === aujourdhui && c.heureMin <= maintenantMin));
    if (repas.length ? passe : comparerJours(aujourdhui, a.depuis) > 0) sortie.push(recette);
  }
  return sortie;
}

/** Ma réponse : faite avec une note (1 à 5) → « Testée » ce jour ; `null` → pas faite. Dans les deux cas on ne redemande plus. */
export function repondre(d: Donnees, recetteId: string, note: number | null, jour: Jour): Donnees {
  const aTester = d.aTester.filter((a) => a.recetteId !== recetteId);
  if (note === null) return { ...d, aTester };
  const n = Math.max(1, Math.min(5, Math.round(note)));
  return { ...d, aTester, recettes: d.recettes.map((r) => (r.id === recetteId ? { ...r, note: n, teste: jour } : r)) };
}
