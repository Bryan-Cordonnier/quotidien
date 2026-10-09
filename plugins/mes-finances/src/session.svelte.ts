// État de la page Mes finances : les données du plugin (rôles, recalages), les paramètres réglés dans Paramètres → Mes finances, et ce que
// Finances (comptes, soldes) et Budget (prévisions) répondent. Les deux services sont facultatifs : sans eux, la page le dit au lieu de planter.
// Règle de sécurité : des données illisibles ne sont JAMAIS remplacées par des données vides.
import { connect } from "@etabli/sdk";
import { ajouterJours, jourDeInstant, type Jour } from "@etabli/ui/civil";
import { courbe, ecartDeRecalage, estime, precision, premierJourSousSeuil, prochainsPaiements, reglagesDepuis, roleDe, type Point } from "./calculs";
import { avecCompteWidget, avecRecalage, avecRole, lireDonnees } from "./donnees";
import { ErreurMesFinances, type Compte, type Donnees, type Prevision, type Role } from "./types";

type Hote = Awaited<ReturnType<typeof connect<unknown>>>;
type Reponse = { ok: true; valeur: unknown } | { ok: false; code: string; message: string };

const absent = (r: Reponse): string | null =>
  r.ok ? null : r.code === "service_absent" ? "absent" : r.code === "permission_refusee" || r.code === "contrat_incompatible" ? "refuse" : r.message;

export class Session {
  donnees = $state<Donnees | null>(null);
  illisible = $state("");
  message = $state("");
  aujourdhui = $state<Jour>(jourDeInstant(Date.now()));
  parametres = $state<Record<string, number | string | boolean>>({});
  reglages = $derived(reglagesDepuis(this.parametres));
  comptes = $state<Compte[]>([]);
  soldes = $state<Record<string, number>>({});
  previsions = $state<Prevision[]>([]);
  /** Problème de lecture de Finances / Budget (null : tout va bien). */
  sansFinances = $state<string | null>(null);
  sansBudget = $state<string | null>(null);
  charge = $state(false);
  #hote: Hote | undefined;

  estime = $derived(estime(this.comptes, this.soldes, this.donnees?.roles ?? {}));
  courbe = $derived<Point[]>(courbe(this.estime.vie, this.aujourdhui, this.reglages.horizon, this.previsions, this.comptes, this.donnees?.roles ?? {}));
  tient = $derived(premierJourSousSeuil(this.courbe, this.reglages.seuilCents));
  paiements = $derived(prochainsPaiements(this.previsions, this.aujourdhui, 6));
  precision = $derived(precision(this.donnees?.recalages ?? [], this.reglages.recalagesRetenus));
  /** Compte qui reçoit les ajustements et les recalages : le premier de la vie courante. */
  compteParDefaut = $derived(this.comptes.find((c) => roleDe(c, this.donnees?.roles ?? {}) === "vie") ?? null);

  async demarrer(): Promise<void> {
    const hote = await connect<unknown>();
    this.#hote = hote;
    this.#recevoir(hote.settings.data);
    hote.settings.onChange((d) => this.#recevoir(d));
    this.parametres = { ...hote.parameters.values };
    hote.parameters.onChange((v) => {
      this.parametres = { ...v };
      void this.actualiser();
    });
    await this.actualiser();
  }

  #recevoir(brut: unknown): void {
    try {
      this.donnees = lireDonnees(brut);
      this.illisible = "";
    } catch (e) {
      this.donnees = null;
      this.illisible = e instanceof ErreurMesFinances ? e.message : "Données illisibles.";
    }
  }

  async #appeler(service: "finances" | "budget", fonction: string, args: unknown): Promise<Reponse> {
    if (!this.#hote) return { ok: false, code: "erreur", message: "Pas encore connecté au moteur." };
    return this.#hote.services.call(service, fonction, args, { timeoutMs: 8000 });
  }

  /** Relit les comptes, les soldes d'aujourd'hui et les prévisions de l'horizon. */
  async actualiser(): Promise<void> {
    this.aujourdhui = jourDeInstant(Date.now());
    const fin = ajouterJours(this.aujourdhui, this.reglages.horizon);
    const [comptes, soldes, previsions] = await Promise.all([
      this.#appeler("finances", "comptes.liste", {}),
      this.#appeler("finances", "soldes.aLaDate", { jour: this.aujourdhui }),
      this.#appeler("budget", "previsions.liste", { du: this.aujourdhui, au: fin, statut: "attendue" }),
    ]);
    this.sansFinances = absent(comptes) ?? absent(soldes);
    if (comptes.ok && soldes.ok) {
      this.comptes = (comptes.valeur as Compte[]).filter((c) => !(c as Compte & { archive?: boolean }).archive);
      this.soldes = soldes.valeur as Record<string, number>;
    }
    this.sansBudget = absent(previsions);
    this.previsions = previsions.ok ? ((previsions.valeur as { previsions: Prevision[] }).previsions ?? []) : [];
    this.charge = true;
  }

  /** Choisit le compte que montre le widget « Un compte ». */
  choisirCompteWidget(compteId: string | null): void {
    if (!this.donnees || !this.#hote) return;
    const suivant = avecCompteWidget(this.donnees, compteId);
    this.#hote.settings.update(suivant);
    this.donnees = suivant;
  }

  /** Change le rôle d'un compte (enregistré avec les données du plugin). */
  definirRole(compteId: string, role: Role): void {
    if (!this.donnees || !this.#hote) return;
    const suivant = avecRole(this.donnees, compteId, role);
    this.#hote.settings.update(suivant);
    this.donnees = suivant;
  }

  async #ecrire(montantCents: number, libelle: string): Promise<boolean> {
    const compte = this.compteParDefaut;
    if (!compte) {
      this.message = "Aucun compte de la vie courante : choisissez-en un dans « Mes comptes ».";
      return false;
    }
    const r = await this.#appeler("finances", "ecritures.ajouter", {
      compteId: compte.id,
      montantCents,
      quand: Date.now(),
      libelle,
      cle: `mf-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    });
    if (!r.ok) {
      this.message = `Finances a refusé : ${r.message}`;
      return false;
    }
    return true;
  }

  /** Ajustement rapide : une dépense ou une rentrée oubliée, sur le compte par défaut. */
  async ajuster(montantCents: number, libelle: string): Promise<boolean> {
    this.message = "";
    if (!Number.isSafeInteger(montantCents) || montantCents === 0) {
      this.message = "Saisissez un montant non nul.";
      return false;
    }
    if (!(await this.#ecrire(montantCents, libelle.trim() || "Ajustement"))) return false;
    await this.actualiser();
    return true;
  }

  /** Recalage : j'indique ce que j'ai vraiment ; l'écart est écrit dans Finances et gardé pour mesurer la précision. */
  async recaler(reelCents: number): Promise<boolean> {
    this.message = "";
    if (!this.donnees || !this.#hote) return false;
    const ecart = ecartDeRecalage(reelCents, this.estime.vie);
    if (ecart !== 0 && !(await this.#ecrire(ecart, "Recalage sur le solde réel"))) return false;
    const suivant = avecRecalage(this.donnees, { jour: this.aujourdhui, ecartCents: ecart });
    this.#hote.settings.update(suivant);
    this.donnees = suivant;
    await this.actualiser();
    return true;
  }

  /** Ouvre une page de ce plugin (depuis un widget de l'accueil). */
  ouvrirPage(page: string): void {
    this.#hote?.openPage(page);
  }

  ouvrirParametres(): void {
    this.#hote?.openSettings("mes-finances");
  }
}
