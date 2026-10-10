// Lecture d'un ticket de caisse par l'IA : la consigne, la forme de la réponse attendue et, surtout, la vérification de ce qui revient.
// L'IA peut se tromper ou répondre n'importe quoi : rien n'est enregistré sans que l'utilisateur ait vérifié, et tout ce qui revient est
// validé et borné ici (montants en centimes entiers, date qui existe, nombre de lignes, longueur des noms).
import { estJour, type Jour } from "@etabli/ui/civil";
import { LIGNES_MAX } from "./donnees";
import type { LigneTicket } from "./types";

export const INSTRUCTION = `Tu lis la photo d'un ticket de caisse français (courses). Extrais :
- estTicket : false si l'image n'est pas un ticket de caisse lisible, sinon true ;
- magasin : le nom de l'enseigne (Carrefour, Lidl, Boulangerie…), sans adresse ;
- date : la date du ticket au format AAAA-MM-JJ (chaîne vide si illisible) ;
- total : le montant total payé TTC en euros (nombre décimal avec un point) ;
- articles : une entrée par article acheté, avec nom (lisible, en français, sans codes ni abréviations inutiles), quantite (1 si non indiquée) et prix (le prix de la ligne en euros, après quantité). Ignore les lignes de total, de TVA, de paiement, de fidélité ou de remise globale.
Ne rien inventer : si un champ est illisible, laisse-le vide ou à 0.`;

export const SCHEMA_TICKET = {
  type: "object",
  properties: {
    estTicket: { type: "boolean" },
    magasin: { type: "string" },
    date: { type: "string" },
    total: { type: "number" },
    articles: {
      type: "array",
      items: { type: "object", properties: { nom: { type: "string" }, quantite: { type: "number" }, prix: { type: "number" } }, required: ["nom", "prix"] },
    },
  },
  required: ["estTicket", "total", "articles"],
} as const;

export interface TicketLu {
  magasin: string;
  jour: Jour;
  /** Le total lu sur le ticket (ou, à défaut, la somme des lignes), en centimes. */
  totalCents: number;
  articles: LigneTicket[];
  /** Total moins somme des lignes (centimes) : un écart non nul prévient l'utilisateur qu'une ligne manque ou est fausse. */
  ecartCents: number;
  /** La date n'a pas été lue : celle du jour a été proposée. */
  dateDevinee: boolean;
}

export type Lecture = { ok: true; ticket: TicketLu } | { ok: false; message: string };

const euros = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 100_000 ? Math.round(v * 100) : null);

/** Retire les balises de code que certains modèles ajoutent malgré la consigne, puis lit le JSON. */
function lireJson(texte: string): unknown {
  const net = texte.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    return JSON.parse(net);
  } catch {
    return undefined;
  }
}

/** Transforme la réponse de l'IA en ticket à vérifier, ou en message clair. `aujourdhui` : date proposée quand celle du ticket est illisible. */
export function lireTicketIa(texte: string, aujourdhui: Jour): Lecture {
  const o = lireJson(texte);
  if (o === null || typeof o !== "object" || Array.isArray(o)) return { ok: false, message: "La réponse de l'IA n'a pas pu être lue : réessayez avec une photo plus nette." };
  const r = o as Record<string, unknown>;
  if (r.estTicket === false) return { ok: false, message: "Cette photo ne ressemble pas à un ticket de caisse." };

  const articles: LigneTicket[] = [];
  for (const brut of Array.isArray(r.articles) ? r.articles.slice(0, LIGNES_MAX) : []) {
    const a = brut as Record<string, unknown> | null;
    const nom = typeof a?.nom === "string" ? a.nom.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, 120) : "";
    const prix = euros(a?.prix);
    if (nom === "" || prix === null) continue;
    const q = typeof a?.quantite === "number" && Number.isFinite(a.quantite) && a.quantite > 0 && a.quantite <= 999 ? Math.round(a.quantite * 1000) / 1000 : 1;
    articles.push({ nom, quantite: q, prixCents: prix });
  }
  let somme = articles.reduce((s, a) => s + a.prixCents, 0);
  const lu = euros(r.total);
  // Souvent l'IA donne le prix à l'unité malgré la consigne : si « quantité × prix » retombe exactement sur le total, c'est ce qu'elle a fait.
  if (lu !== null && lu > 0 && somme !== lu) {
    const avecQuantites = articles.reduce((s, a) => s + Math.round(a.prixCents * a.quantite), 0);
    if (avecQuantites === lu) {
      for (const a of articles) a.prixCents = Math.round(a.prixCents * a.quantite);
      somme = avecQuantites;
    }
  }
  const totalCents = lu !== null && lu > 0 ? lu : somme;
  if (totalCents <= 0) return { ok: false, message: "Le total du ticket n'a pas pu être lu : essayez une photo plus nette, bien cadrée." };

  const jourLu = typeof r.date === "string" ? r.date.trim() : "";
  const datee = estJour(jourLu);
  const magasin = typeof r.magasin === "string" ? r.magasin.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, 80) : "";
  return {
    ok: true,
    ticket: { magasin, jour: datee ? jourLu : aujourdhui, totalCents, articles, ecartCents: articles.length > 0 ? totalCents - somme : 0, dateDevinee: !datee },
  };
}