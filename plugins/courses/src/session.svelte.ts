// État des pages de Courses : les données (enregistrées par le moteur avec le plugin), les paramètres réglés dans Paramètres → Courses et
// l'état de la transmission vers Budget. Règle de sécurité : des données illisibles ne sont JAMAIS remplacées par des données vides.
import { connect, type AiImage } from "@etabli/sdk";
import { jourDeInstant, type Jour } from "@etabli/ui/civil";
import { lireDonnees } from "./donnees";
import { reglagesDepuis, type Parametres } from "./parametres";
import { construireConsigne, lireMenuIa, prixConnus, SCHEMA_MENU, type Demande, type Proposition } from "./menu";
import { INSTRUCTION, lireTicketIa, SCHEMA_TICKET, type Lecture } from "./scan";
import { transmettre, type Appeler, type Rapport } from "./transmission";
import { ErreurCourses, type Donnees, type Reglages } from "./types";

type Hote = Awaited<ReturnType<typeof connect<unknown>>>;

export class Session {
  donnees = $state<Donnees | null>(null);
  illisible = $state("");
  message = $state("");
  rapport = $state<Rapport | null>(null);
  aujourdhui = $state<Jour>(jourDeInstant(Date.now()));
  parametres = $state<Parametres>({});
  reglages = $derived<Reglages>(reglagesDepuis(this.parametres));
  #hote: Hote | undefined;
  #file: Promise<void> = Promise.resolve();

  readonly appeler: Appeler = async (service, fonction, args) => {
    if (!this.#hote) return { ok: false, code: "erreur", message: "Pas encore connecté au moteur." };
    return this.#hote.services.call(service, fonction, args, { timeoutMs: 8000 });
  };

  async demarrer(): Promise<void> {
    const hote = await connect<unknown>();
    this.#hote = hote;
    this.#recevoir(hote.settings.data);
    hote.settings.onChange((d) => this.#recevoir(d));
    this.parametres = { ...hote.parameters.values };
    hote.parameters.onChange((v) => {
      this.parametres = { ...v };
      void this.transmettre();
    });
    await this.transmettre();
  }

  #recevoir(brut: unknown): void {
    try {
      this.aujourdhui = jourDeInstant(Date.now());
      this.donnees = lireDonnees(brut);
      this.illisible = "";
    } catch (e) {
      this.donnees = null;
      this.illisible = e instanceof ErreurCourses ? e.message : "Données illisibles.";
    }
  }

  /** Une modification : enregistrée en entier dans les données du plugin, puis annoncée à Budget. Rend vrai si elle a eu lieu. */
  appliquer(travail: (d: Donnees) => Donnees): boolean {
    this.message = "";
    if (!this.donnees || !this.#hote) return false;
    try {
      const suivant = travail(this.donnees);
      this.#hote.settings.update(suivant);
      this.donnees = suivant;
    } catch (e) {
      this.message = e instanceof ErreurCourses ? e.message : "Une erreur est survenue : rien n'a été enregistré.";
      return false;
    }
    void this.transmettre();
    return true;
  }

  /** Annonce à Budget la dépense prévue si elle a changé (les envois se font l'un après l'autre). */
  transmettre(): Promise<void> {
    this.#file = this.#file.then(async () => {
      const d = this.donnees;
      if (!d || !this.#hote) return;
      const { donnees, rapport } = await transmettre(d, this.reglages, this.aujourdhui, this.appeler);
      this.rapport = rapport;
      if (JSON.stringify(donnees.transmis) !== JSON.stringify(d.transmis) && this.donnees === d) {
        this.#hote.settings.update(donnees);
        this.donnees = donnees;
      }
    });
    return this.#file;
  }

  /** Ouvre l'onglet Courses des Paramètres du moteur. */
  /** Demande à l'IA de l'utilisateur de lire un ticket photographié ; ne jette jamais, rend le ticket à vérifier ou un message clair. */
  async lireTicketPhoto(image: AiImage): Promise<Lecture> {
    if (!this.#hote) return { ok: false, message: "Pas encore connecté au moteur." };
    const reponse = await this.#hote.ai.extraire({ instruction: INSTRUCTION, images: [image], schema: SCHEMA_TICKET });
    return reponse.ok ? lireTicketIa(reponse.texte, this.aujourdhui) : { ok: false, message: reponse.message };
  }

  /** Demande à l'IA des repas et leurs ingrédients dans le budget, en partant de nos prix connus ; ne jette jamais. */
  async proposerRepas(demande: Demande): Promise<Proposition> {
    if (!this.#hote) return { ok: false, message: "Pas encore connecté au moteur." };
    const connus = this.donnees ? prixConnus(this.donnees) : [];
    const reponse = await this.#hote.ai.extraire({ instruction: construireConsigne(demande, connus), schema: SCHEMA_MENU, recherche: demande.internet });
    return reponse.ok ? lireMenuIa(reponse.texte, demande.repas) : { ok: false, message: reponse.message };
  }

  /** Nombre d'articles dont on connaît déjà le prix (pour l'annoncer à l'utilisateur). */
  get nbPrixConnus(): number {
    return this.donnees ? prixConnus(this.donnees, 500).length : 0;
  }

  /** Ouvre une page de ce plugin (depuis un widget de l'accueil). */
  ouvrirPage(page: string): void {
    this.#hote?.openPage(page);
  }

  ouvrirParametres(): void {
    this.#hote?.openSettings("courses");
  }
}