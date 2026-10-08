// Données de Travail : lecture stricte, saisies validées, opérations. Règle de sécurité (cahier de bord, point 6) : « rien d'enregistré » donne des
// données vides, mais des données PRÉSENTES et illisibles sont une erreur, jamais des données vides : on écraserait les vraies paies.
import { comparerJours, differenceJours, type Jour } from "@etabli/ui/civil";
import {
  ErreurTravail,
  type Agence,
  type Bulletin,
  SCHEMA,
  type Contrat,
  type Donnees,
  type Mission,
  type PeriodeReserve,
  type RythmePaie,
  type TypeContrat,
} from "./types";
import { choix, entier, jourValide, liste, montant, objet, texte, texteFacultatif } from "./validation";

export const LIMITE_OCTETS = 3_500_000;
export const MISSIONS_MAX = 500;
export const RESERVES_MAX = 200;
export const CONTRATS_MAX = 50;
export const AGENCES_MAX = 50;
/** Une mission dure 400 jours au plus (au-delà, c'est un contrat). */
export const MISSION_MAX_JOURS = 400;

export const donneesVides = (): Donnees => ({ schema: SCHEMA, suivant: 1, agences: [], missions: [], reserves: [], contrats: [], transmis: {}, bulletins: {} });
export const octetsDe = (d: Donnees): number => JSON.stringify(d).length;

function joursUniques(v: unknown, nom: string, max: number): Jour[] {
  const jours = liste(v, nom, (x) => jourValide(x, nom), max);
  if (new Set(jours).size !== jours.length) throw new ErreurTravail("argument_invalide", `« ${nom} » contient un jour en double.`);
  return jours;
}

export const RYTHMES: readonly RythmePaie[] = ["fin", "mois", "semaine"];

export function lireAgence(brut: unknown, avecId: boolean): Omit<Agence, "id"> & { id?: string } {
  const o = objet(brut, ["nom"], avecId ? ["id", "cotisationsBp", "rythme"] : ["cotisationsBp", "rythme"]);
  return {
    ...(avecId ? { id: String(o.id) } : {}),
    nom: texte(o.nom, "nom", 80),
    cotisationsBp: o.cotisationsBp === undefined || o.cotisationsBp === null ? null : entier(o.cotisationsBp, "cotisationsBp", 0, 6000),
    rythme: o.rythme === undefined ? "fin" : choix(o.rythme, "rythme", RYTHMES),
  };
}

export function lireMission(brut: unknown, avecId: boolean): Omit<Mission, "id"> & { id?: string } {
  const o = objet(
    brut,
    ["libelle", "debut", "fin", "joursSemaine", "debutMin", "finMin", "pauseMin", "tauxHoraireCents"],
    avecId ? ["id", "entreprise", "agenceId", "trajetMin", "panierCents", "deplacementCents", "exclusions", "supplementaires"] : ["entreprise", "agenceId", "trajetMin", "panierCents", "deplacementCents", "exclusions", "supplementaires"],
  );
  const debut = jourValide(o.debut, "debut");
  const fin = jourValide(o.fin, "fin");
  if (comparerJours(fin, debut) < 0) throw new ErreurTravail("argument_invalide", "La mission ne peut pas finir avant de commencer.");
  if (differenceJours(debut, fin) + 1 > MISSION_MAX_JOURS) throw new ErreurTravail("limite_atteinte", `Une mission dure ${MISSION_MAX_JOURS} jours au plus.`);
  const joursSemaine = liste(o.joursSemaine, "joursSemaine", (x) => entier(x, "joursSemaine", 1, 7), 7);
  if (joursSemaine.length === 0 || new Set(joursSemaine).size !== joursSemaine.length) throw new ErreurTravail("argument_invalide", "Choisissez au moins un jour de la semaine, sans doublon.");
  const debutMin = entier(o.debutMin, "debutMin", 0, 1439);
  const finMin = entier(o.finMin, "finMin", 0, 1439);
  if (debutMin === finMin) throw new ErreurTravail("argument_invalide", "Début et fin identiques (durée nulle). Une fin plus petite que le début passe minuit.");
  const supplementaires = liste(o.supplementaires ?? [], "supplementaires", (x) => {
    const s = objet(x, ["jour", "minutes"]);
    const jour = jourValide(s.jour, "supplementaires.jour");
    if (comparerJours(jour, debut) < 0 || comparerJours(jour, fin) > 0) throw new ErreurTravail("argument_invalide", `Le jour supplémentaire ${jour} est hors de la mission.`);
    return { jour, minutes: entier(s.minutes, "supplementaires.minutes", 1, 720) };
  }, 100);
  return {
    ...(avecId ? { id: String(o.id) } : {}),
    libelle: texte(o.libelle, "libelle", 120),
    entreprise: texteFacultatif(o.entreprise, "entreprise", 120),
    agenceId: o.agenceId === undefined || o.agenceId === null ? null : texte(o.agenceId, "agenceId", 20),
    debut,
    fin,
    joursSemaine: [...joursSemaine].sort((a, b) => a - b),
    exclusions: joursUniques(o.exclusions ?? [], "exclusions", MISSION_MAX_JOURS),
    debutMin,
    finMin,
    pauseMin: entier(o.pauseMin, "pauseMin", 0, 480),
    trajetMin: o.trajetMin === undefined || o.trajetMin === null ? null : entier(o.trajetMin, "trajetMin", 0, 240),
    tauxHoraireCents: montant(o.tauxHoraireCents, "tauxHoraireCents", 1),
    panierCents: montant(o.panierCents ?? 0, "panierCents", 0),
    deplacementCents: montant(o.deplacementCents ?? 0, "deplacementCents", 0),
    supplementaires,
  };
}

export function lireReserve(brut: unknown, avecId: boolean): Omit<PeriodeReserve, "id"> & { id?: string } {
  const o = objet(brut, ["libelle", "jours", "horsBase"], avecId ? ["id"] : []);
  return { ...(avecId ? { id: String(o.id) } : {}), libelle: texte(o.libelle, "libelle", 120), jours: joursUniques(o.jours, "jours", 366), horsBase: entier(o.horsBase, "horsBase", 0, 366) };
}

export function lireContrat(brut: unknown, avecId: boolean): Omit<Contrat, "id"> & { id?: string } {
  const o = objet(brut, ["libelle", "type", "brutMensuelCents", "debut", "jourDePaie"], avecId ? ["id", "fin", "entreprise"] : ["fin", "entreprise"]);
  const type: TypeContrat = choix(o.type, "type", ["cdi", "cdd"] as const);
  const debut = jourValide(o.debut, "debut");
  const fin = o.fin === undefined || o.fin === null ? null : jourValide(o.fin, "fin");
  if (type === "cdd" && fin === null) throw new ErreurTravail("argument_invalide", "Un CDD a une date de fin.");
  if (fin !== null && comparerJours(fin, debut) < 0) throw new ErreurTravail("argument_invalide", "Le contrat ne peut pas finir avant de commencer.");
  return {
    ...(avecId ? { id: String(o.id) } : {}),
    libelle: texte(o.libelle, "libelle", 120),
    entreprise: texteFacultatif(o.entreprise, "entreprise", 120),
    type,
    brutMensuelCents: montant(o.brutMensuelCents, "brutMensuelCents", 1),
    debut,
    fin,
    jourDePaie: entier(o.jourDePaie, "jourDePaie", 1, 28),
  };
}

function elements<T extends { id: string }>(brut: unknown, nom: string, prefixe: string, lire: (x: unknown) => T, suivant: number): T[] {
  if (!Array.isArray(brut)) throw new ErreurTravail("illisible", `Liste « ${nom} » illisible.`);
  const lus = brut.map(lire);
  const motif = new RegExp(`^${prefixe}[1-9]\\d{0,9}$`);
  for (const e of lus) if (!motif.test(e.id) || Number(e.id.slice(1)) >= suivant) throw new ErreurTravail("illisible", `Identifiant illisible dans « ${nom} ».`);
  return lus;
}

function lireBulletins(brut: unknown): Record<string, Bulletin> {
  if (brut === null || typeof brut !== "object" || Array.isArray(brut)) throw new ErreurTravail("illisible", "Bulletins illisibles.");
  const sortie: Record<string, Bulletin> = {};
  for (const [ref, b] of Object.entries(brut)) {
    if (!/^(mission:m|reserve:r)[1-9]\d{0,9}$/.test(ref)) throw new ErreurTravail("illisible", "Bulletin illisible.");
    const o = objet(b, ["netCents", "jour", "ecritureId"]);
    if (o.ecritureId !== null && typeof o.ecritureId !== "string") throw new ErreurTravail("illisible", "Bulletin illisible.");
    sortie[ref] = { netCents: montant(o.netCents, "netCents"), jour: jourValide(o.jour, "jour"), ecritureId: o.ecritureId };
  }
  return sortie;
}

/**
 * Données de la version 1 (le plugin s'appelait Paie) → forme de la version 2 : les réglages quittent les données (ce sont des paramètres
 * du plugin), une mission a une entreprise (vide), une agence (aucune), pas de panier ; elle n'a plus de statut (il suit les dates).
 */
function depuisVersion1(o: Record<string, unknown>): Record<string, unknown> {
  const { reglages: _reglages, ...reste } = o;
  const missions = Array.isArray(o.missions)
    ? o.missions.map((m) => {
        if (m === null || typeof m !== "object" || Array.isArray(m)) return m;
        const { statut: _statut, ...mission } = m as Record<string, unknown>;
        return { entreprise: "", agenceId: null, trajetMin: null, panierCents: 0, deplacementCents: 0, ...mission };
      })
    : o.missions;
  const contrats = Array.isArray(o.contrats) ? o.contrats.map((c) => (c !== null && typeof c === "object" && !Array.isArray(c) ? { entreprise: "", ...c } : c)) : o.contrats;
  return { ...reste, schema: SCHEMA, agences: [], missions, contrats };
}

/** Données enregistrées → données validées. `null`/`undefined` (rien d'enregistré) → données vides ; tout autre écart → `ErreurTravail("illisible")`. */
export function lireDonnees(enregistre: unknown): Donnees {
  if (enregistre === null || enregistre === undefined) return donneesVides();
  try {
    let brut = enregistre;
    if (brut !== null && typeof brut === "object" && !Array.isArray(brut) && (brut as { schema?: unknown }).schema === 1) brut = depuisVersion1(brut as Record<string, unknown>);
    const o = objet(brut, ["schema", "suivant", "agences", "missions", "reserves", "contrats", "transmis", "bulletins"]);
    if (o.schema !== SCHEMA) throw new ErreurTravail("illisible", `Version de données inconnue : ${String(o.schema)} (ce plugin lit la version ${SCHEMA}).`);
    const suivant = entier(o.suivant, "suivant", 1, 2_000_000_000);
    if (o.transmis === null || typeof o.transmis !== "object" || Array.isArray(o.transmis)) throw new ErreurTravail("illisible", "Suivi des transmissions illisible.");
    const transmis = Object.fromEntries(Object.entries(o.transmis).map(([k, v]) => [k, typeof v === "string" && v.length <= 64 ? v : (() => { throw new ErreurTravail("illisible", "Suivi des transmissions illisible."); })()]));
    const agences = elements(o.agences, "agences", "a", (x) => lireAgence(x, true) as Agence, suivant);
    const missions = elements(o.missions, "missions", "m", (x) => lireMission(x, true) as Mission, suivant);
    for (const m of missions) if (m.agenceId !== null && !agences.some((a) => a.id === m.agenceId)) throw new ErreurTravail("illisible", `La mission « ${m.id} » cite une agence inconnue.`);
    return {
      schema: SCHEMA,
      suivant,
      agences,
      missions,
      reserves: elements(o.reserves, "reserves", "r", (x) => lireReserve(x, true) as PeriodeReserve, suivant),
      contrats: elements(o.contrats, "contrats", "c", (x) => lireContrat(x, true) as Contrat, suivant),
      transmis,
      bulletins: lireBulletins(o.bulletins),
    };
  } catch (e) {
    if (e instanceof ErreurTravail && e.code === "illisible") throw e;
    throw new ErreurTravail("illisible", `Les données de Travail sont illisibles (${e instanceof Error ? e.message : "erreur inconnue"}). Rien n'a été modifié.`);
  }
}

// ——— Opérations (chacune rend de NOUVELLES données ; en cas de refus rien n'est écrit) ———

function verifierTaille(d: Donnees): Donnees {
  if (octetsDe(d) > LIMITE_OCTETS) throw new ErreurTravail("limite_atteinte", "Les données de Travail sont pleines (3,5 Mo) ; rien n'a été enregistré.");
  return d;
}

function verifierAgence(d: Donnees, m: { agenceId: string | null }): void {
  if (m.agenceId !== null && !d.agences.some((a) => a.id === m.agenceId)) throw new ErreurTravail("introuvable", `Agence « ${m.agenceId} » introuvable.`);
}

export function ajouterAgence(d: Donnees, brut: unknown): { id: string; donnees: Donnees } {
  if (d.agences.length >= AGENCES_MAX) throw new ErreurTravail("limite_atteinte", `Au plus ${AGENCES_MAX} agences.`);
  const lue = lireAgence(brut, false);
  if (d.agences.some((a) => a.nom.toLowerCase() === lue.nom.toLowerCase())) throw new ErreurTravail("argument_invalide", `Une agence s'appelle déjà « ${lue.nom} ».`);
  const id = `a${d.suivant}`;
  return { id, donnees: verifierTaille({ ...d, suivant: d.suivant + 1, agences: [...d.agences, { id, ...lue } as Agence] }) };
}

export function modifierAgence(d: Donnees, id: string, brut: unknown): Donnees {
  if (!d.agences.some((a) => a.id === id)) throw new ErreurTravail("introuvable", `Agence « ${id} » introuvable.`);
  const lue = lireAgence(brut, false);
  if (d.agences.some((a) => a.id !== id && a.nom.toLowerCase() === lue.nom.toLowerCase())) throw new ErreurTravail("argument_invalide", `Une agence s'appelle déjà « ${lue.nom} ».`);
  return verifierTaille({ ...d, agences: d.agences.map((a) => (a.id === id ? ({ id, ...lue } as Agence) : a)) });
}

/** Supprime l'agence : ses missions restent, sans agence (leurs cotisations deviennent celles des paramètres). */
export function supprimerAgence(d: Donnees, id: string): Donnees {
  if (!d.agences.some((a) => a.id === id)) throw new ErreurTravail("introuvable", `Agence « ${id} » introuvable.`);
  return { ...d, agences: d.agences.filter((a) => a.id !== id), missions: d.missions.map((m) => (m.agenceId === id ? { ...m, agenceId: null } : m)) };
}

export function ajouterMission(d: Donnees, brut: unknown): { id: string; donnees: Donnees } {
  if (d.missions.length >= MISSIONS_MAX) throw new ErreurTravail("limite_atteinte", `Au plus ${MISSIONS_MAX} missions.`);
  const lue = lireMission(brut, false);
  verifierAgence(d, lue);
  const id = `m${d.suivant}`;
  return { id, donnees: verifierTaille({ ...d, suivant: d.suivant + 1, missions: [...d.missions, { id, ...lue } as Mission] }) };
}

export function modifierMission(d: Donnees, id: string, brut: unknown): Donnees {
  if (!d.missions.some((m) => m.id === id)) throw new ErreurTravail("introuvable", `Mission « ${id} » introuvable.`);
  const lue = lireMission(brut, false);
  verifierAgence(d, lue);
  return verifierTaille({ ...d, missions: d.missions.map((m) => (m.id === id ? ({ id, ...lue } as Mission) : m)) });
}

export function supprimerMission(d: Donnees, id: string): Donnees {
  if (!d.missions.some((m) => m.id === id)) throw new ErreurTravail("introuvable", `Mission « ${id} » introuvable.`);
  return { ...d, missions: d.missions.filter((m) => m.id !== id) };
}

/**
 * Ajoute des minutes supplémentaires à un jour de la mission (« +1 h 35 ce soir ») : elles s'additionnent à celles déjà notées ce jour-là
 * et sont payées en heures supplémentaires. Le jour doit être dans la mission.
 */
export function ajouterSupplementaires(d: Donnees, id: string, jour: Jour, minutes: number): Donnees {
  const m = d.missions.find((x) => x.id === id);
  if (!m) throw new ErreurTravail("introuvable", `Mission « ${id} » introuvable.`);
  const ajout = entier(minutes, "minutes", 1, 720);
  const existant = m.supplementaires.find((s) => s.jour === jour);
  const total = (existant?.minutes ?? 0) + ajout;
  if (total > 720) throw new ErreurTravail("limite_atteinte", "Pas plus de 12 h supplémentaires dans une même journée.");
  const supplementaires = existant ? m.supplementaires.map((s) => (s.jour === jour ? { jour, minutes: total } : s)) : [...m.supplementaires, { jour, minutes: total }];
  const { id: _id, ...sansId } = m;
  return modifierMission(d, id, { ...sansId, supplementaires });
}

/** Efface les minutes supplémentaires ajoutées dans la semaine (lundi → dimanche) d'un jour donné. */
export function effacerSupplementaires(d: Donnees, id: string, jours: readonly Jour[]): Donnees {
  const m = d.missions.find((x) => x.id === id);
  if (!m) throw new ErreurTravail("introuvable", `Mission « ${id} » introuvable.`);
  const retire = new Set(jours);
  const { id: _id, ...sansId } = m;
  return modifierMission(d, id, { ...sansId, supplementaires: m.supplementaires.filter((s) => !retire.has(s.jour)) });
}

export function ajouterReserve(d: Donnees, brut: unknown): { id: string; donnees: Donnees } {
  if (d.reserves.length >= RESERVES_MAX) throw new ErreurTravail("limite_atteinte", `Au plus ${RESERVES_MAX} périodes de réserve.`);
  const id = `r${d.suivant}`;
  return { id, donnees: verifierTaille({ ...d, suivant: d.suivant + 1, reserves: [...d.reserves, { id, ...lireReserve(brut, false) } as PeriodeReserve] }) };
}

export function supprimerReserve(d: Donnees, id: string): Donnees {
  if (!d.reserves.some((r) => r.id === id)) throw new ErreurTravail("introuvable", `Période « ${id} » introuvable.`);
  return { ...d, reserves: d.reserves.filter((r) => r.id !== id) };
}

export function ajouterContrat(d: Donnees, brut: unknown): { id: string; donnees: Donnees } {
  if (d.contrats.length >= CONTRATS_MAX) throw new ErreurTravail("limite_atteinte", `Au plus ${CONTRATS_MAX} contrats.`);
  const id = `c${d.suivant}`;
  return { id, donnees: verifierTaille({ ...d, suivant: d.suivant + 1, contrats: [...d.contrats, { id, ...lireContrat(brut, false) } as Contrat] }) };
}

export function supprimerContrat(d: Donnees, id: string): Donnees {
  if (!d.contrats.some((c) => c.id === id)) throw new ErreurTravail("introuvable", `Contrat « ${id} » introuvable.`);
  return { ...d, contrats: d.contrats.filter((c) => c.id !== id) };
}

/** Enregistre le net réellement reçu pour une mission (`mission:m1`) ou une période de réserve (`reserve:r2`). */
export function enregistrerBulletin(d: Donnees, ref: string, bulletin: Bulletin): Donnees {
  const [type, id] = ref.split(":");
  const existe = type === "mission" ? d.missions.some((m) => m.id === id) : type === "reserve" ? d.reserves.some((r) => r.id === id) : false;
  if (!existe) throw new ErreurTravail("introuvable", `« ${ref} » introuvable.`);
  return { ...d, bulletins: { ...d.bulletins, [ref]: { netCents: montant(bulletin.netCents, "netCents", 1), jour: jourValide(bulletin.jour, "jour"), ecritureId: bulletin.ecritureId } } };
}
