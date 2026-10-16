// État des pages de Repas et recettes : les données du plugin (enregistrées par le moteur), les paramètres, et les échanges : Courses (budget,
// prix des tickets, envoi d'une liste), Santé (objectifs, s'il est installé) et l'IA (le cerveau de l'utilisateur ou Gemini, au choix du moteur).
// Règle de sécurité : des données illisibles ne sont JAMAIS remplacées par des données vides.
import { connect } from "@etabli/sdk";
import { jourDeInstant, type Jour } from "@etabli/ui/civil";
import { construireConsigne, construireConsigneListe, lireListeIa, lirePlanIa, SCHEMA_LISTE, SCHEMA_PLAN, type Choix, type PropositionPlan, type Questionnaire } from "./concocter";
import { definirNutrition, lireDonnees } from "./donnees";
import { consigneFusion, lireFusionIa, SCHEMA_FUSION } from "./fusion";
import { consigneNutrition, lireNutritionIa, moyenneMangee, SCHEMA_NUTRITION } from "./nutrition";
import { basePrix, type PrixConnu } from "./prix";
import { ErreurRepas, type Donnees, type Recette } from "./types";

type Hote = Awaited<ReturnType<typeof connect<unknown>>>;

export interface ContexteCourses {
  budgetSemaineCents: number;
  jourCourses: number;
  prix: PrixConnu[];
  /** Les listes pas encore réglées (la plus récente en dernier). */
  listes: { id: string; nom: string; articles: string[] }[];
  /** Vrai si Courses a répondu ; sinon budget et prix par défaut. */
  disponible: boolean;
}

const COURSES_PAR_DEFAUT: ContexteCourses = { budgetSemaineCents: 7000, jourCourses: 6, prix: [], listes: [], disponible: false };

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

  /** Les ustensiles de la maison : le paramètre (séparés par des virgules), sinon l'ancienne liste enregistrée. */
  get ustensiles(): string[] {
    const p = typeof this.parametres.ustensiles === "string" ? this.parametres.ustensiles.split(/[,\n]/).map((u) => u.trim()).filter((u) => u !== "") : [];
    return p.length ? p : (this.donnees?.ustensiles ?? []);
  }

  ouvrirParametres(): void {
    this.#hote?.openSettings("repas");
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
      this.#publier();
    } catch (e) {
      this.donnees = null;
      this.illisible = e instanceof ErreurRepas ? e.message : "Données illisibles.";
    }
  }

  /** Service `repas@1` : ce que l'on mange en moyenne par portion (Santé s'en sert pour ses conseils). */
  #publier(): void {
    if (this.donnees) this.#hote?.services.provide("repas", { moyenne: moyenneMangee(this.donnees) });
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
      listes: (Array.isArray(v.listes) ? v.listes : [])
        .map((l) => l as Record<string, unknown>)
        .filter((l) => typeof l.id === "string" && typeof l.nom === "string" && Array.isArray(l.articles))
        .map((l) => ({ id: l.id as string, nom: l.nom as string, articles: (l.articles as unknown[]).filter((a): a is string => typeof a === "string") })),
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
      this.#publier();
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
    const consigne = construireConsigne(q, { budgetSemaineCents: this.courses.budgetSemaineCents, ustensiles: this.ustensiles, recettes: d.recettes, prix: this.prixPourIa, sante: this.sante });
    const r = await this.#hote.ai.extraire({ instruction: consigne, schema: SCHEMA_PLAN });
    if (!r.ok) return r.message;
    return lirePlanIa(r.texte, q, d.recettes, this.ustensiles);
  }

  /** Demande à l'IA la liste d'achats de recettes choisies. */
  async listePourRecettes(choix: readonly Choix[], budgetCents: number | null): Promise<ReturnType<typeof lireListeIa>> {
    if (!this.#hote) return "Pas encore prêt : réessayez dans un instant.";
    const r = await this.#hote.ai.extraire({ instruction: construireConsigneListe(choix, this.prixPourIa, budgetCents), schema: SCHEMA_LISTE });
    if (!r.ok) return r.message;
    return lireListeIa(r.texte);
  }

  /**
   * Prépare l'ajout d'une recette aux courses : l'IA la fusionne avec la liste ouverte de Courses (la plus récente). Rien n'est écrit :
   * la proposition est montrée, puis `ecrireFusion` l'enregistre. Sans liste ouverte, on en crée une avec la recette.
   */
  async preparerFusion(recette: Recette, personnes: number): Promise<{ listeId: string | null; nomListe: string; articles: string[]; ajoutes: string[]; retires: string[]; remarques: string } | string> {
    if (!this.#hote) return "Pas encore prêt : réessayez dans un instant.";
    await this.rafraichirCourses();
    if (!this.courses.disponible) return "Courses ne répond pas : la recette n'a pas pu être ajoutée.";
    const liste = this.courses.listes.at(-1);
    const actuels = liste?.articles ?? [];
    const r = await this.#hote.ai.extraire({ instruction: consigneFusion(actuels, recette, personnes), schema: SCHEMA_FUSION });
    if (!r.ok) return r.message;
    const lu = lireFusionIa(r.texte, actuels);
    return typeof lu === "string" ? lu : { listeId: liste?.id ?? null, nomListe: liste?.nom ?? recette.nom, ...lu };
  }

  async ecrireFusion(listeId: string | null, nom: string, articles: string[]): Promise<{ ok: boolean; message: string }> {
    if (!this.#hote) return { ok: false, message: "Pas encore prêt." };
    if (listeId === null) return this.envoyerACourses(nom, articles);
    const r = await this.#hote.services.call("courses", "listes.remplacer", { id: listeId, articles }, { timeoutMs: 8000 });
    return r.ok ? { ok: true, message: `Liste « ${nom} » mise à jour dans Courses.` } : { ok: false, message: r.message };
  }

  /** Estime à l'IA les valeurs nutritionnelles des recettes qui n'en ont pas (par paquets de 15). Rend un message. */
  async estimerNutrition(): Promise<string> {
    if (!this.#hote || !this.donnees) return "Pas encore prêt.";
    const manquantes = this.donnees.recettes.filter((r) => r.nutrition === null).slice(0, 15);
    if (manquantes.length === 0) return "Toutes les recettes ont leurs valeurs.";
    const r = await this.#hote.ai.extraire({ instruction: consigneNutrition(manquantes), schema: SCHEMA_NUTRITION });
    if (!r.ok) return r.message;
    const lu = lireNutritionIa(r.texte, manquantes.map((x) => x.id));
    if (typeof lu === "string") return lu;
    return this.appliquer((d) => definirNutrition(d, lu)) ? `Valeurs estimées pour ${Object.keys(lu).length} recette${Object.keys(lu).length > 1 ? "s" : ""}.` : this.message;
  }

  /** Envoie une liste à Courses (rejouer la même liste ne crée pas de doublon). Rend un message pour l'utilisateur. */
  async envoyerACourses(nom: string, articles: string[]): Promise<{ ok: boolean; message: string }> {
    if (!this.#hote) return { ok: false, message: "Pas encore prêt." };
    const r = await this.#hote.services.call("courses", "listes.ajouter", { nom, articles }, { timeoutMs: 8000 });
    if (r.ok) return { ok: true, message: `Liste « ${nom} » ajoutée dans Courses.` };
    return { ok: false, message: r.code === "service_absent" ? "Courses n'est pas installé : la liste n'a pas pu être envoyée." : r.message };
  }
}
