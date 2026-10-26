// État du Calendrier : le carnet (enregistré par le moteur avec le plugin), les paramètres réglés dans Paramètres → Agenda, et l'heure. Règle de
// sécurité : un carnet illisible n'est JAMAIS remplacé par un carnet vide : l'écran le dit et n'écrit rien. Les réglages du carnet (lus par le
// service des rappels, sans écran) suivent les paramètres dès qu'ils changent.
import { aCalculer, avecTrajet, JOURS_AVANCE, TRAJET_MAX_MIN } from "./lieux";
import { occurrencesDuCarnet } from "./calculs";
import { connect } from "@etabli/sdk";
import { ajouterJours, instantVersLocal, localVersInstant, type Jour } from "@etabli/ui/civil";
import { lireCarnet } from "./carnet";
import { reglerHoraires } from "./operations";
import { reglagesDepuis, type Parametres } from "./parametres";
import { rappelsPourLeMoteur } from "./rappels";
import { ErreurAgenda, type Carnet } from "./types";

type Hote = Awaited<ReturnType<typeof connect<unknown>>>;

export class Session {
  carnet = $state<Carnet | null>(null);
  illisible = $state("");
  message = $state("");
  parametres = $state<Parametres>({});
  reglages = $derived(reglagesDepuis(this.parametres));
  aujourdhui = $state<Jour>(instantVersLocal(Date.now()).jour);
  /** Minutes depuis minuit, mises à jour toutes les 30 secondes. */
  maintenantMin = $state(instantVersLocal(Date.now()).minutes);
  hote = $state<Hote | undefined>(undefined);
  #minuteur: ReturnType<typeof setInterval> | undefined;

  async demarrer(): Promise<void> {
    const hote = await connect<unknown>();
    this.hote = hote;
    this.parametres = { ...hote.parameters.values };
    this.#recevoir(hote.settings.data);
    hote.settings.onChange((d) => this.#recevoir(d));
    hote.parameters.onChange((v) => {
      this.parametres = { ...v };
      this.#synchroniser();
    });
    // À chaque ouverture, on renouvelle l'horizon de 60 jours des rappels (le moteur ne programme pas plus loin).
    if (this.carnet) void hote.reminders.set(rappelsPourLeMoteur(this.carnet, Date.now()));
    this.#minuteur = setInterval(() => this.#tic(), 30_000);
    void this.actualiserTrajets();
  }

  /** Dernier souci du calcul des trajets (clé TomTom absente, adresse introuvable…), ou vide. */
  trajetsMessage = $state("");
  #calculEnCours = false;
  #dernierCalcul = 0;

  /**
   * Calcule les trajets qui manquent ou ont vieilli (aujourd'hui et demain : toutes les 30 min, pour les bouchons), un par un, avec le
   * moteur (TomTom). Les rappels « pars maintenant » suivent le nouveau temps de trajet.
   */
  async actualiserTrajets(force = false): Promise<void> {
    const c = this.carnet;
    if (!c || !this.hote || this.#calculEnCours) return;
    this.#calculEnCours = true;
    this.#dernierCalcul = Date.now();
    try {
      // « Calculer » ou « Recalculer maintenant » : on oublie les calculs gardés pour tout refaire.
      const demandes = aCalculer(force ? { ...c, trajetsAuto: {} } : c, occurrencesDuCarnet(c, this.aujourdhui, ajouterJours(this.aujourdhui, JOURS_AVANCE)), this.aujourdhui, Date.now());
      for (const d of demandes) {
        const r = await this.hote.trajets.calculer({ vers: d.vers, ...(d.depuis ? { depuis: d.depuis } : {}), arriveeAvant: localVersInstant(d.jour, d.arriveeMin) });
        if (!r.ok) {
          this.trajetsMessage = r.message;
          if (r.code === "non_configure") break;
          continue;
        }
        if (r.minutes > TRAJET_MAX_MIN) {
          this.trajetsMessage = `Trajet de ${Math.round(r.minutes / 60)} h trouvé vers « ${d.vers} » : l'adresse est sûrement mal trouvée. Donne son adresse complète dans le bouton + du bloc Trajet.`;
          continue;
        }
        this.trajetsMessage = "";
        this.appliquer((x) => avecTrajet(x, d, r.minutes, Date.now(), this.aujourdhui));
      }
    } finally {
      this.#calculEnCours = false;
    }
  }

  arreter(): void {
    clearInterval(this.#minuteur);
  }

  #tic(): void {
    const l = instantVersLocal(Date.now());
    this.aujourdhui = l.jour;
    this.maintenantMin = l.minutes;
    // les bouchons changent : on recalcule au plus toutes les 15 min tant que la page est ouverte
    if (Date.now() - this.#dernierCalcul > 15 * 60_000) void this.actualiserTrajets();
  }

  #recevoir(brut: unknown): void {
    try {
      this.#tic();
      this.carnet = lireCarnet(brut);
      this.illisible = "";
      this.#synchroniser();
    } catch (e) {
      this.carnet = null;
      this.illisible = e instanceof ErreurAgenda ? e.message : "Carnet illisible.";
    }
  }

  /** Les réglages du carnet (lus par le service des rappels) reprennent ceux des paramètres. */
  #synchroniser(): void {
    const c = this.carnet;
    if (!c || !this.hote) return;
    const r = this.reglages;
    if (JSON.stringify(c.reglages) === JSON.stringify(r.carnet) && c.rappelsHoraires === r.rappelsHoraires) return;
    this.appliquer((x) => ({ ...reglerHoraires(x, r.carnet), rappelsHoraires: r.rappelsHoraires }));
  }

  /** Une modification : enregistrée en entier, puis la liste complète des rappels repart au téléphone (sans effet sur PC). Rend vrai si elle a eu lieu. */
  appliquer(travail: (c: Carnet) => Carnet): boolean {
    this.message = "";
    if (!this.carnet || !this.hote) return false;
    try {
      const suivant = travail(this.carnet);
      this.hote.settings.update(suivant);
      this.carnet = suivant;
      void this.hote.reminders.set(rappelsPourLeMoteur(suivant, Date.now()));
      return true;
    } catch (e) {
      this.message = e instanceof ErreurAgenda ? e.message : "Une erreur est survenue : rien n'a été enregistré.";
      return false;
    }
  }

  ouvrirParametres(): void {
    this.hote?.openSettings("agenda");
  }
}