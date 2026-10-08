// État du Calendrier : le carnet (enregistré par le moteur avec le plugin), les paramètres réglés dans Paramètres → Agenda, et l'heure. Règle de
// sécurité : un carnet illisible n'est JAMAIS remplacé par un carnet vide : l'écran le dit et n'écrit rien. Les réglages du carnet (lus par le
// service des rappels, sans écran) suivent les paramètres dès qu'ils changent.
import { connect } from "@etabli/sdk";
import { instantVersLocal, type Jour } from "@etabli/ui/civil";
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
  }

  arreter(): void {
    clearInterval(this.#minuteur);
  }

  #tic(): void {
    const l = instantVersLocal(Date.now());
    this.aujourdhui = l.jour;
    this.maintenantMin = l.minutes;
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