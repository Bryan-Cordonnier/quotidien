// État de l'écran Travail : les données (enregistrées par le moteur avec le plugin), les paramètres réglés dans Paramètres, l'état de la
// transmission vers Budget et l'Agenda, et la liste des comptes de Finances.
// Règle de sécurité : des données illisibles ne sont JAMAIS remplacées par des données vides ; l'écran le dit et n'écrit rien.
import { connect } from "@etabli/sdk";
import { jourDeInstant, type Jour } from "@etabli/ui/civil";
import { lireDonnees } from "./donnees";
import { projections } from "./projection";
import { reglagesDepuis, type Parametres } from "./reglages";
import { saisirNetRecu, transmettre, type Appeler, type Rapport, type SaisieNetRecu } from "./transmission";
import { ErreurTravail, type Donnees, type Reglages } from "./types";

type Hote = Awaited<ReturnType<typeof connect<unknown>>>;

export interface CompteFinances {
  id: string;
  nom: string;
  archive: boolean;
}

export class Session {
  donnees = $state<Donnees | null>(null);
  illisible = $state("");
  message = $state("");
  rapport = $state<Rapport | null>(null);
  comptes = $state<CompteFinances[]>([]);
  aujourdhui = $state<Jour>(jourDeInstant(Date.now()));
  /** Valeurs des paramètres, réglées dans Paramètres → Travail. */
  parametres = $state<Parametres>({});
  /** Réglages des calculs (taux, seuils, délais), tirés des paramètres. */
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
    await this.#chargerComptes();
    await this.transmettre();
  }

  #recevoir(brut: unknown): void {
    try {
      this.aujourdhui = jourDeInstant(Date.now());
      this.donnees = lireDonnees(brut);
      this.illisible = "";
    } catch (e) {
      this.donnees = null;
      this.illisible = e instanceof ErreurTravail ? e.message : "Données illisibles.";
    }
  }

  async #chargerComptes(): Promise<void> {
    const r = await this.appeler("finances", "comptes.liste", undefined);
    this.comptes = r.ok ? (r.valeur as CompteFinances[]).filter((c) => !c.archive) : [];
  }

  /** Ouvre l'onglet Travail des Paramètres du moteur (taux, seuils, délais). */
  /** Ouvre une page de ce plugin (depuis un widget de l'accueil). */
  ouvrirPage(page: string): void {
    this.#hote?.openPage(page);
  }

  ouvrirParametres(): void {
    this.#hote?.openSettings("travail");
  }

  /** Une modification : enregistrée en entier dans les réglages du plugin, puis transmise. Rend vrai si elle a eu lieu. */
  appliquer(travail: (d: Donnees) => Donnees): boolean {
    this.message = "";
    if (!this.donnees || !this.#hote) return false;
    try {
      const suivant = travail(this.donnees);
      this.#hote.settings.update(suivant);
      this.donnees = suivant;
    } catch (e) {
      this.message = e instanceof ErreurTravail ? e.message : "Une erreur est survenue : rien n'a été enregistré.";
      return false;
    }
    void this.transmettre();
    return true;
  }

  /** Envoie à Budget et à l'Agenda ce qui a changé. Les envois se font l'un après l'autre (jamais deux en même temps). */
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

  /** Le net est arrivé : Finances, Budget, puis le bulletin dans Travail. */
  async netRecu(saisie: SaisieNetRecu): Promise<void> {
    this.message = "";
    const d = this.donnees;
    if (!d || !this.#hote) return;
    try {
      const r = await saisirNetRecu(d, saisie, this.appeler, Date.now());
      this.#hote.settings.update(r.donnees);
      this.donnees = r.donnees;
      this.message = r.avertissements.join(" ");
      void this.transmettre();
    } catch (e) {
      this.message = e instanceof ErreurTravail ? e.message : "Une erreur est survenue : rien n'a été enregistré.";
    }
  }

  /** « n sur n » : projections déjà à jour chez Budget et l'Agenda, sur le total voulu. */
  get transmises(): { a: number; sur: number } {
    const d = this.donnees;
    if (!d) return { a: 0, sur: 0 };
    const voulues = projections(d, this.reglages, this.aujourdhui);
    return { a: this.rapport ? this.rapport.aJour + this.rapport.envoyees : 0, sur: voulues.length };
  }
}
