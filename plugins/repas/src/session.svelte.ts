// État des pages de Repas et recettes : les données du plugin (enregistrées par le moteur), les paramètres, et les échanges : Courses (budget,
// prix des tickets, envoi d'une liste), Santé (objectifs, s'il est installé) et l'IA (le cerveau de l'utilisateur ou Gemini, au choix du moteur).
// Règle de sécurité : des données illisibles ne sont JAMAIS remplacées par des données vides.
import { connect } from "@etabli/sdk";
import { jourDeInstant, type Jour } from "@etabli/ui/civil";
import { construireConsigne, construireConsigneListe, lireListeIa, lirePlanIa, SCHEMA_LISTE, SCHEMA_PLAN, type Choix, type PropositionPlan, type Questionnaire } from "./concocter";
import { lireDonnees } from "./donnees";
import { basePrix, type PrixConnu } from "./prix";
import { ErreurRepas, type Donnees } from "./types";

type Hote = Awaited<ReturnType<typeof connect<unknown>>>;

export interface ContexteCourses {
  budgetSemaineCents: number;
  jourCourses: number;
  prix: PrixConnu[];
  /** Vrai si Courses a répondu ; sinon budget et prix par défaut. */
  disponible: boolean;
}

const COURSES_PAR_DEFAUT: ContexteCourses = { budgetSemaineCents: 7000, jourCourses: 6, prix: [], disponible: false };

export class Session {
  donnees = $state<Donnees | null>(null);
  illisible = $state("");
  message = $state("");
  aujourdhui = $state<Jour>(jourDeInstant(Date.now()));
  parametres = $state<Record<string, unknown>>({});
  courses = $state<ContexteCourses>(COURSES_PAR_DEFAUT);
  sante = $state<Record<string, unknown> | null>(null);
  #hote: Hote | undefined;

  /** Personnes au foyer (paramètre du plugin). */
  get foyer(): number {
    const n = Number(this.parametres.personnes);
    return Number.isInteger(n) && n >= 1 && n <= 20 ? n : 1;
  }

  async demarrer(): Promise<void> {
    const hote = await connect<unknown>();
    this.#hote = hote;
    this.#recevoir(hote.settings.data);
    hote.settings.onChange((d) => this.#recevoir(d));
    this.parametres = { ...hote.parameters.values };
    hote.parameters.onChange((v) => (this.parametres = { ...v }));
    this.#lireSante();
    hote.services.onChange(() => this.#lireSante());
    await this.rafraichirCourses();
  }

  #recevoir(brut: unknown): void {
    try {
      this.aujourdhui = jourDeInstant(Date.now());
      this.donnees = lireDonnees(brut);
      this.illisible = "";
    } catch (e) {
      this.donnees = null;
      this.illisible = e instanceof ErreurRepas ? e.message : "Données illisibles.";
    }
  }

  #lireSante(): void {
    const s = this.#hote?.services.get("sante");
    this.sante = s && typeof s.data === "object" && s.data !== null ? (s.data as Record<string, unknown>) : null;
  }

  /** Budget, jour des courses et prix des tickets, demandés à Courses (s'il est là). */
  async rafraichirCourses(): Promise<void> {
    if (!this.#hote) return;
    const r = await this.#hote.services.call("courses", "contexte.lire", {}, { timeoutMs: 8000 });
    if (!r.ok || typeof r.valeur !== "object" || r.valeur === null) {
      this.courses = COURSES_PAR_DEFAUT;
      return;
    }
    const v = r.valeur as Record<string, unknown>;
    const prix = (Array.isArray(v.prix) ? v.prix : [])
      .map((p) => p as Record<string, unknown>)
      .filter((p) => typeof p.nom === "string" && typeof p.magasin === "string" && Number.isInteger(p.prixCents) && (p.prixCents as number) > 0)
      .map((p) => ({ nom: p.nom as string, magasin: p.magasin as string, prixCents: p.prixCents as number, fois: Number.isInteger(p.fois) ? (p.fois as number) : 1 }));
    this.courses = {
      budgetSemaineCents: Number.isInteger(v.budgetSemaineCents) ? (v.budgetSemaineCents as number) : 7000,
      jourCourses: Number.isInteger(v.jourCourses) ? (v.jourCourses as number) : 6,
      prix,
      disponible: true,
    };
  }

  /** Tous les prix connus : tickets (Courses) et relevés (ce plugin). */
  get base(): ReturnType<typeof basePrix> {
    return basePrix(this.courses.prix, this.donnees?.prix ?? []);
  }

  /** Prix connus, en clair, pour la consigne de l'IA (relevés compris). */
  get prixPourIa(): PrixConnu[] {
    return [...this.courses.prix, ...(this.donnees?.prix ?? []).map((p) => ({ nom: `${p.nom}${p.unite ? ` (${p.unite})` : ""}`, magasin: p.magasin, prixCents: p.prixCents, fois: 1 }))];
  }

  /** Une modification : enregistrée en entier dans les données du plugin. Rend vrai si elle a eu lieu. */
  appliquer(travail: (d: Donnees) => Donnees): boolean {
    this.message = "";
    if (!this.donnees || !this.#hote) return false;
    try {
      const suivant = travail(this.donnees);
      this.#hote.settings.update(suivant);
      this.donnees = suivant;
      return true;
    } catch (e) {
      this.message = e instanceof ErreurRepas ? e.message : "Une erreur est survenue : rien n'a été enregistré.";
      return false;
    }
  }

  /** Demande un plan à l'IA. Rend la proposition lue (et vérifiée), ou une phrase qui dit ce qui ne va pas. */
  async concocter(q: Questionnaire): Promise<PropositionPlan | string> {
    if (!this.#hote || !this.donnees) return "Pas encore prêt : réessayez dans un instant.";
    const d = this.donnees;
    const consigne = construireConsigne(q, { budgetSemaineCents: this.courses.budgetSemaineCents, ustensiles: d.ustensiles, recettes: d.recettes, prix: this.prixPourIa, sante: this.sante });
    const r = await this.#hote.ai.extraire({ instruction: consigne, schema: SCHEMA_PLAN });
    if (!r.ok) return r.message;
    return lirePlanIa(r.texte, q, d.recettes, d.ustensiles);
  }

  /** Demande à l'IA la liste d'achats de recettes choisies. */
  async listePourRecettes(choix: readonly Choix[], budgetCents: number | null): Promise<ReturnType<typeof lireListeIa>> {
    if (!this.#hote) return "Pas encore prêt : réessayez dans un instant.";
    const r = await this.#hote.ai.extraire({ instruction: construireConsigneListe(choix, this.prixPourIa, budgetCents), schema: SCHEMA_LISTE });
    if (!r.ok) return r.message;
    return lireListeIa(r.texte);
  }

  /** Envoie une liste à Courses (rejouer la même liste ne crée pas de doublon). Rend un message pour l'utilisateur. */
  async envoyerACourses(nom: string, articles: string[]): Promise<{ ok: boolean; message: string }> {
    if (!this.#hote) return { ok: false, message: "Pas encore prêt." };
    const r = await this.#hote.services.call("courses", "listes.ajouter", { nom, articles }, { timeoutMs: 8000 });
    if (r.ok) return { ok: true, message: `Liste « ${nom} » ajoutée dans Courses.` };
    return { ok: false, message: r.code === "service_absent" ? "Courses n'est pas installé : la liste n'a pas pu être envoyée." : r.message };
  }
}
