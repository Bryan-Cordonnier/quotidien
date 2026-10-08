// Transmission de Courses vers Budget. L'appelant (`appeler`) est injecté : testé sans moteur. Budget absent : tout le reste de Courses
// fonctionne, et la prévision repart à la prochaine ouverture (rejouable, sans doublon grâce à la clé d'idempotence liée au contenu).
import type { Jour } from "@etabli/ui/civil";
import { empreinte, previsionsBudget, REF_BUDGET } from "./projection";
import type { Donnees, Reglages } from "./types";

export type Reponse = { ok: true; valeur: unknown } | { ok: false; code: string; message: string };
export type Appeler = (service: "budget", fonction: string, args: unknown) => Promise<Reponse>;

export type Etat = "a_jour" | "envoye" | "absent" | "erreur";

const INDISPONIBLE = new Set(["service_absent", "contrat_incompatible", "permission_refusee", "delai_depasse", "occupe"]);

export interface Rapport {
  etat: Etat;
  message: string;
}

/** Envoie à Budget la dépense prévue si elle a changé. Ne jette jamais : tout est dans le rapport. */
export async function transmettre(d: Donnees, r: Reglages, aujourdhui: Jour, appeler: Appeler): Promise<{ donnees: Donnees; rapport: Rapport }> {
  const prevues = previsionsBudget(d, r, aujourdhui);
  const h = empreinte(prevues);
  const cle = `budget|${REF_BUDGET}`;
  if (d.transmis[cle] === h) return { donnees: d, rapport: { etat: "a_jour", message: "" } };
  const reponse = await appeler("budget", "previsions.remplacer", { ref: REF_BUDGET, previsions: prevues, cle: `${REF_BUDGET}@${h}` });
  if (reponse.ok) return { donnees: { ...d, transmis: { ...d.transmis, [cle]: h } }, rapport: { etat: "envoye", message: "" } };
  if (INDISPONIBLE.has(reponse.code)) {
    const message =
      reponse.code === "service_absent"
        ? "Installez Budget pour y voir vos courses prévues : tout le reste de Courses fonctionne sans."
        : "Budget ne répond pas pour l'instant : Courses réessaiera à la prochaine ouverture.";
    return { donnees: d, rapport: { etat: "absent", message } };
  }
  return { donnees: d, rapport: { etat: "erreur", message: `Budget a refusé la prévision : ${reponse.message}` } };
}