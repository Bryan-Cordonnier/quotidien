// Données de Courses : lecture stricte, saisies validées, opérations. Même règle de sécurité que partout : « rien d'enregistré » donne des
// données vides ; des données PRÉSENTES et illisibles sont une erreur, jamais des données vides (on écraserait les vrais tickets).
import { comparerJours, type Jour } from "@etabli/ui/civil";
import { ErreurCourses, SCHEMA, type Article, type Donnees, type Liste, type Reglement, type Ticket } from "./types";
import { entier, jourValide, liste as listeDe, montant, objet, texte } from "./validation";

export const LIMITE_OCTETS = 3_500_000;
export const TICKETS_MAX = 20_000;
export const LISTES_MAX = 2_000;
export const ARTICLES_MAX = 300;
export const SANS_MAGASIN = "Sans magasin";

export const donneesVides = (): Donnees => ({ schema: SCHEMA, suivant: 1, tickets: [], listes: [], transmis: {} });
const octets = (d: Donnees): number => JSON.stringify(d).length;

const identifiant = (prefixe: string, v: unknown, suivant: number): string => {
  const id = String(v);
  if (!new RegExp(`^${prefixe}[1-9]\\d{0,9}$`).test(id) || Number(id.slice(1)) >= suivant) throw new ErreurCourses("illisible", "Identifiant illisible.");
  return id;
};

function lireTicket(brut: unknown, suivant: number): Ticket {
  const o = objet(brut, ["id", "jour", "magasin", "montantCents", "listeId"]);
  return { id: identifiant("t", o.id, suivant), jour: jourValide(o.jour, "jour"), magasin: texte(o.magasin, "magasin", 80), montantCents: montant(o.montantCents, "montantCents", 1), listeId: o.listeId === null ? null : identifiant("l", o.listeId, suivant) };
}

function lireArticle(brut: unknown, suivant: number): Article {
  const o = objet(brut, ["id", "nom", "pris"]);
  if (typeof o.pris !== "boolean") throw new ErreurCourses("illisible", "Article illisible.");
  return { id: identifiant("a", o.id, suivant), nom: texte(o.nom, "nom", 120), pris: o.pris };
}

function lireReglement(brut: unknown, suivant: number): Reglement | null {
  if (brut === null) return null;
  const o = objet(brut, ["jour", "magasin", "montantCents", "ticketId"]);
  return { jour: jourValide(o.jour, "jour"), magasin: texte(o.magasin, "magasin", 80), montantCents: montant(o.montantCents, "montantCents", 1), ticketId: identifiant("t", o.ticketId, suivant) };
}

/** Données enregistrées → données validées. */
export function lireDonnees(enregistre: unknown): Donnees {
  if (enregistre === null || enregistre === undefined) return donneesVides();
  try {
    const o = objet(enregistre, ["schema", "suivant", "tickets", "listes", "transmis"]);
    if (o.schema !== SCHEMA) throw new ErreurCourses("illisible", `Version de données inconnue : ${String(o.schema)} (ce plugin lit la version ${SCHEMA}).`);
    const suivant = entier(o.suivant, "suivant", 1, 2_000_000_000);
    if (o.transmis === null || typeof o.transmis !== "object" || Array.isArray(o.transmis)) throw new ErreurCourses("illisible", "Suivi des transmissions illisible.");
    const transmis = Object.fromEntries(Object.entries(o.transmis).map(([k, v]) => [k, typeof v === "string" && v.length <= 64 ? v : (() => { throw new ErreurCourses("illisible", "Suivi des transmissions illisible."); })()]));
    const tickets = listeDe(o.tickets, "tickets", (t) => lireTicket(t, suivant), TICKETS_MAX);
    const listes = listeDe(o.listes, "listes", (l) => {
      const x = objet(l, ["id", "nom", "articles", "reglement"]);
      return { id: identifiant("l", x.id, suivant), nom: texte(x.nom, "nom", 120), articles: listeDe(x.articles, "articles", (a) => lireArticle(a, suivant), ARTICLES_MAX), reglement: lireReglement(x.reglement, suivant) } satisfies Liste;
    }, LISTES_MAX);
    return { schema: SCHEMA, suivant, tickets, listes, transmis };
  } catch (e) {
    if (e instanceof ErreurCourses && e.code === "illisible") throw e;
    throw new ErreurCourses("illisible", `Les données de Courses sont illisibles (${e instanceof Error ? e.message : "erreur inconnue"}). Rien n'a été modifié.`);
  }
}

function verifier(d: Donnees): Donnees {
  if (octets(d) > LIMITE_OCTETS) throw new ErreurCourses("limite_atteinte", "Les données de Courses sont pleines (3,5 Mo) ; rien n'a été enregistré.");
  return d;
}

// ——— Tickets ———

/** Un ticket de caisse (le montant est positif : c'est une dépense). */
export function ajouterTicket(d: Donnees, brut: unknown): { id: string; donnees: Donnees } {
  if (d.tickets.length >= TICKETS_MAX) throw new ErreurCourses("limite_atteinte", `Au plus ${TICKETS_MAX} tickets.`);
  const o = objet(brut, ["jour", "montantCents"], ["magasin"]);
  const magasin = typeof o.magasin === "string" && o.magasin.trim() !== "" ? texte(o.magasin, "magasin", 80) : SANS_MAGASIN;
  const id = `t${d.suivant}`;
  const ticket: Ticket = { id, jour: jourValide(o.jour, "jour"), magasin, montantCents: montant(o.montantCents, "montantCents", 1), listeId: null };
  return { id, donnees: verifier({ ...d, suivant: d.suivant + 1, tickets: [...d.tickets, ticket] }) };
}

/** Supprime un ticket saisi à la main. Un ticket qui a réglé une liste ne se supprime pas (la liste reste verrouillée avec son montant). */
export function supprimerTicket(d: Donnees, id: string): Donnees {
  const t = d.tickets.find((x) => x.id === id);
  if (!t) throw new ErreurCourses("introuvable", `Ticket « ${id} » introuvable.`);
  if (t.listeId) throw new ErreurCourses("argument_invalide", "Ce ticket a réglé une liste de courses : il ne se supprime pas.");
  return { ...d, tickets: d.tickets.filter((x) => x.id !== id) };
}

// ——— Listes ———

function liste(d: Donnees, id: string): Liste {
  const l = d.listes.find((x) => x.id === id);
  if (!l) throw new ErreurCourses("introuvable", `Liste « ${id} » introuvable.`);
  return l;
}

/** Une liste réglée ne change plus. */
function modifiable(d: Donnees, id: string): Liste {
  const l = liste(d, id);
  if (l.reglement) throw new ErreurCourses("argument_invalide", `La liste « ${l.nom} » est réglée : elle ne se modifie plus.`);
  return l;
}

const remplacer = (d: Donnees, l: Liste): Donnees => ({ ...d, listes: d.listes.map((x) => (x.id === l.id ? l : x)) });

/** Crée une liste avec ses articles (au moins un). */
export function creerListe(d: Donnees, nom: unknown, articles: unknown): { id: string; donnees: Donnees } {
  if (d.listes.length >= LISTES_MAX) throw new ErreurCourses("limite_atteinte", `Au plus ${LISTES_MAX} listes.`);
  const noms = listeDe(articles, "articles", (a) => texte(a, "article", 120), ARTICLES_MAX);
  if (noms.length === 0) throw new ErreurCourses("argument_invalide", "Ajoutez au moins un article.");
  const id = `l${d.suivant}`;
  const base = d.suivant + 1;
  const l: Liste = { id, nom: texte(nom, "nom", 120), articles: noms.map((n, i) => ({ id: `a${base + i}`, nom: n, pris: false })), reglement: null };
  return { id, donnees: verifier({ ...d, suivant: base + noms.length, listes: [...d.listes, l] }) };
}

export function renommerListe(d: Donnees, id: string, nom: unknown): Donnees {
  return remplacer(d, { ...modifiable(d, id), nom: texte(nom, "nom", 120) });
}

export function supprimerListe(d: Donnees, id: string): Donnees {
  modifiable(d, id);
  return { ...d, listes: d.listes.filter((x) => x.id !== id) };
}

export function ajouterArticle(d: Donnees, listeId: string, nom: unknown): Donnees {
  const l = modifiable(d, listeId);
  if (l.articles.length >= ARTICLES_MAX) throw new ErreurCourses("limite_atteinte", `Au plus ${ARTICLES_MAX} articles par liste.`);
  return verifier(remplacer({ ...d, suivant: d.suivant + 1 }, { ...l, articles: [...l.articles, { id: `a${d.suivant}`, nom: texte(nom, "nom", 120), pris: false }] }));
}

function article(l: Liste, id: string): Article {
  const a = l.articles.find((x) => x.id === id);
  if (!a) throw new ErreurCourses("introuvable", `Article « ${id} » introuvable.`);
  return a;
}

export function renommerArticle(d: Donnees, listeId: string, id: string, nom: unknown): Donnees {
  const l = modifiable(d, listeId);
  const a = article(l, id);
  return remplacer(d, { ...l, articles: l.articles.map((x) => (x === a ? { ...x, nom: texte(nom, "nom", 120) } : x)) });
}

export function retirerArticle(d: Donnees, listeId: string, id: string): Donnees {
  const l = modifiable(d, listeId);
  article(l, id);
  return remplacer(d, { ...l, articles: l.articles.filter((x) => x.id !== id) });
}

/** Met un article dans le caddie, ou l'en retire. */
export function basculerPris(d: Donnees, listeId: string, id: string): Donnees {
  const l = modifiable(d, listeId);
  const a = article(l, id);
  return remplacer(d, { ...l, articles: l.articles.map((x) => (x === a ? { ...x, pris: !x.pris } : x)) });
}

/**
 * Règle la course : le montant payé devient un ticket (donc compte dans le budget de la semaine) et la liste est verrouillée. Les articles
 * non cochés ne gênent pas : on a pu ne pas les prendre ou ne pas les trouver.
 */
export function reglerListe(d: Donnees, listeId: string, brut: unknown): { ticketId: string; donnees: Donnees } {
  const l = modifiable(d, listeId);
  const o = objet(brut, ["jour", "montantCents"], ["magasin"]);
  const magasin = typeof o.magasin === "string" && o.magasin.trim() !== "" ? texte(o.magasin, "magasin", 80) : SANS_MAGASIN;
  const { id: ticketId, donnees } = ajouterTicket(d, { jour: o.jour, montantCents: o.montantCents, magasin });
  const reglement: Reglement = { jour: jourValide(o.jour, "jour"), magasin, montantCents: montant(o.montantCents, "montantCents", 1), ticketId };
  const avecLien: Donnees = { ...donnees, tickets: donnees.tickets.map((t) => (t.id === ticketId ? { ...t, listeId } : t)) };
  return { ticketId, donnees: remplacer(avecLien, { ...l, reglement }) };
}

/** Les listes réglées, la plus récente d'abord. */
export const listesReglees = (d: Donnees): Liste[] => d.listes.filter((l) => l.reglement).sort((a, b) => comparerJours(b.reglement!.jour, a.reglement!.jour));
export const listesEnCours = (d: Donnees): Liste[] => d.listes.filter((l) => !l.reglement);
export const dernierJour = (jours: readonly Jour[]): Jour | null => (jours.length ? [...jours].sort(comparerJours).at(-1)! : null);