// État de la page Mes finances : les données du plugin (rôles, recalages), les paramètres réglés dans Paramètres → Mes finances, et ce que
// Finances (comptes, soldes) et Budget (prévisions) répondent. Les deux services sont facultatifs : sans eux, la page le dit au lieu de planter.
// Règle de sécurité : des données illisibles ne sont JAMAIS remplacées par des données vides.
import { connect } from "@etabli/sdk";
import { ajouterJours, jourDeInstant, type Jour } from "@etabli/ui/civil";
import { courbe, ecartDeRecalage, estime, precision, premierJourSousSeuil, prochainsPaiements, reglagesDepuis, roleDe, type Point, finDesRevenus } from "./calculs";
import { avecCompteWidget, avecRecalage, avecRole, lireDonnees, sansRecalage } from "./donnees";
import { ErreurMesFinances, type Abonnement, type Compte, type Donnees, type Ecriture, type Prevision, type Role } from "./types";

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
  /** Prévisions dont le jour est passé et qui attendent encore : l'utilisateur dit si l'argent est vraiment passé. */
  aConfirmer = $state<Prevision[]>([]);
  /** Problème de lecture de Finances / Budget (null : tout va bien). */
  sansFinances = $state<string | null>(null);
  sansBudget = $state<string | null>(null);
  charge = $state(false);
  /** Pour les grandes fenêtres : tous les comptes (archivés compris), l'historique des écritures, les abonnements, l'année à venir. */
  tousComptes = $state<Compte[]>([]);
  historique = $state<Ecriture[]>([]);
  abonnements = $state<Abonnement[]>([]);
  aVenir = $state<Prevision[]>([]);
  #hote: Hote | undefined;

  estime = $derived(estime(this.comptes, this.soldes, this.donnees?.roles ?? {}));
  courbe = $derived<Point[]>(courbe(this.estime.vie, this.aujourdhui, this.reglages.horizon, this.previsions, this.comptes, this.donnees?.roles ?? {}));
  tient = $derived(premierJourSousSeuil(this.courbe, this.reglages.seuilCents));
  paiements = $derived(prochainsPaiements(this.previsions, this.aujourdhui, 6));
  /** Dernier revenu prévu, s'il arrive bientôt sans suite (fin de mission sans mission suivante). */
  finRevenus = $derived(finDesRevenus(this.previsions, this.aujourdhui));
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
    const [comptes, soldes, previsions, passees] = await Promise.all([
      this.#appeler("finances", "comptes.liste", {}),
      this.#appeler("finances", "soldes.aLaDate", { jour: this.aujourdhui }),
      this.#appeler("budget", "previsions.liste", { du: this.aujourdhui, au: fin, statut: "attendue" }),
      this.#appeler("budget", "previsions.liste", { du: ajouterJours(this.aujourdhui, -120), au: ajouterJours(this.aujourdhui, -1), statut: "attendue" }),
    ]);
    this.aConfirmer = passees.ok ? ((passees.valeur as { previsions: Prevision[] }).previsions ?? []) : [];
    this.sansFinances = absent(comptes) ?? absent(soldes);
    if (comptes.ok && soldes.ok) {
      this.comptes = (comptes.valeur as Compte[]).filter((c) => !(c as Compte & { archive?: boolean }).archive);
      this.soldes = soldes.valeur as Record<string, number>;
    }
    this.sansBudget = absent(previsions);
    this.previsions = previsions.ok ? ((previsions.valeur as { previsions: Prevision[] }).previsions ?? []) : [];
    this.charge = true;
    await this.chargerDetails();
  }

  /** Ce que montrent les grandes fenêtres (« + ») : écritures des 365 derniers jours, abonnements, paiements de l'année. */
  async chargerDetails(): Promise<void> {
    const [comptes, ecritures, abonnements, aVenir] = await Promise.all([
      this.#appeler("finances", "comptes.liste", {}),
      this.#appeler("finances", "ecritures.liste", { du: ajouterJours(this.aujourdhui, -365), au: this.aujourdhui }),
      this.#appeler("budget", "abonnements.liste", {}),
      this.#appeler("budget", "previsions.liste", { du: this.aujourdhui, au: ajouterJours(this.aujourdhui, 365), statut: "attendue" }),
    ]);
    if (comptes.ok) this.tousComptes = comptes.valeur as Compte[];
    if (ecritures.ok) {
      const toutes = ((ecritures.valeur as { ecritures: Ecriture[] }).ecritures ?? []) as Ecriture[];
      // On cache les annulations et ce qu'elles annulent : l'historique montre ce qui compte vraiment.
      const annulees = new Set(toutes.filter((e) => e.annule).map((e) => e.annule));
      this.historique = toutes.filter((e) => !e.annule && !annulees.has(e.id)).reverse();
    }
    this.abonnements = abonnements.ok ? (abonnements.valeur as Abonnement[]) : [];
    this.aVenir = aVenir.ok ? ((aVenir.valeur as { previsions: Prevision[] }).previsions ?? []) : [];
  }

  async #faire(r: Promise<Reponse>, refus: string): Promise<boolean> {
    this.message = "";
    const x = await r;
    if (!x.ok) {
      this.message = `${refus} : ${x.message}`;
      return false;
    }
    await this.actualiser();
    return true;
  }

  /** Règle un compte : nom, type, archivé, solde de départ. */
  modifierCompte(id: string, champs: { nom?: string; type?: string; archive?: boolean; soldeInitialCents?: number }): Promise<boolean> {
    return this.#faire(this.#appeler("finances", "comptes.modifier", { id, ...champs }), "Finances a refusé");
  }

  /** Corrige une écriture (montant, libellé, date, compte) : Finances garde l'historique. */
  corrigerEcriture(id: string, champs: { montantCents?: number; libelle?: string; quand?: number; compteId?: string }): Promise<boolean> {
    return this.#faire(this.#appeler("finances", "ecritures.corriger", { id, ...champs, cle: `mf-corr-${id}-${Date.now()}` }), "Finances a refusé");
  }

  /** Supprime une écriture (elle est annulée : les soldes redeviennent ceux d'avant). */
  supprimerEcriture(id: string): Promise<boolean> {
    return this.#faire(this.#appeler("finances", "ecritures.annuler", { id, motif: "Supprimée depuis Mes finances", cle: `mf-annule-${id}` }), "Finances a refusé");
  }

  /** Supprime un recalage : son écriture est annulée, il sort de l'historique de précision. */
  async supprimerRecalage(index: number): Promise<boolean> {
    if (!this.donnees || !this.#hote) return false;
    const r = this.donnees.recalages[index];
    if (!r) return false;
    if (r.ecritureId && !(await this.supprimerEcriture(r.ecritureId))) return false;
    const suivant = sansRecalage(this.donnees, index);
    this.#hote.settings.update(suivant);
    this.donnees = suivant;
    return true;
  }

  /** Crée ou modifie un abonnement (avec `echeances` : un paiement en plusieurs fois). */
  enregistrerAbonnement(a: Omit<Abonnement, "id" | "aResilier"> & { id?: string; aResilier?: boolean }): Promise<boolean> {
    const { id, ...champs } = a;
    return this.#faire(this.#appeler("budget", "abonnements.enregistrer", { abonnement: { ...(id ? { id } : {}), ...champs } }), "Budget a refusé");
  }

  supprimerAbonnement(id: string): Promise<boolean> {
    return this.#faire(this.#appeler("budget", "abonnements.supprimer", { id }), "Budget a refusé");
  }

  /** Décale ou corrige une échéance seule. */
  modifierPrevision(id: string, champs: { jour?: string; montantCents?: number; libelle?: string }): Promise<boolean> {
    return this.#faire(this.#appeler("budget", "previsions.modifier", { id, ...champs }), "Budget a refusé");
  }

  /** Solde jour par jour d'un compte sur les `jours` derniers jours (pour sa petite courbe). */
  async serieCompte(id: string, jours: number): Promise<Point[]> {
    const r = await this.#appeler("finances", "serie.parJour", { du: ajouterJours(this.aujourdhui, -jours), au: this.aujourdhui, comptes: [id] });
    return r.ok ? (r.valeur as Point[]) : [];
  }

  /** Crée un compte chez Finances (Finances n'a plus d'écran à lui) ; son solde de départ est le solde d'aujourd'hui. */
  async creerCompte(nom: string, type: string, soldeInitialCents: number): Promise<boolean> {
    this.message = "";
    const r = await this.#appeler("finances", "comptes.creer", { nom: nom.trim(), type, soldeInitialCents, cle: `compte-${Date.now()}` });
    if (!r.ok) {
      this.message = r.message;
      return false;
    }
    await this.actualiser();
    return true;
  }

  /** Choisit le compte que montre le widget « Un compte ». */
  choisirCompteWidget(exemplaire: number, compteId: string | null): void {
    if (!this.donnees || !this.#hote) return;
    const suivant = avecCompteWidget(this.donnees, exemplaire, compteId);
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

  /**
   * Le jour J passé : l'argent est vraiment passé. L'écriture entre dans Finances (à la date prévue, sur le compte de la prévision
   * ou celui de la vie courante), puis Budget marque la prévision réalisée. La clé évite un doublon si l'on appuie deux fois.
   */
  async confirmerPrevision(p: Prevision, montantCents: number): Promise<boolean> {
    this.message = "";
    const compteId = p.compteId ?? this.compteParDefaut?.id ?? null;
    if (!compteId) {
      this.message = "Aucun compte de la vie courante : choisissez-en un dans « Mes comptes ».";
      return false;
    }
    const r = await this.#appeler("finances", "ecritures.ajouter", {
      compteId,
      montantCents,
      quand: new Date(`${p.jour}T12:00:00`).getTime(),
      libelle: p.libelle || "Paiement prévu",
      cle: `mf-prevision-${p.id}`,
    });
    if (!r.ok) {
      this.message = `Finances a refusé : ${r.message}`;
      return false;
    }
    const ecritureId = (r.valeur as { id?: unknown } | null)?.id;
    const b = await this.#appeler("budget", "previsions.confirmer", { id: p.id, ...(typeof ecritureId === "string" ? { ecritureId } : {}) });
    if (!b.ok) this.message = `L'écriture est ajoutée, mais Budget n'a pas pu marquer le paiement : ${b.message}`;
    await this.actualiser();
    return true;
  }

  /** Le paiement prévu n'a pas eu lieu : il sort de la liste sans rien écrire dans Finances. */
  async ecarterPrevision(p: Prevision): Promise<void> {
    this.message = "";
    const b = await this.#appeler("budget", "previsions.abandonner", { id: p.id });
    if (!b.ok) this.message = `Budget a refusé : ${b.message}`;
    await this.actualiser();
  }

  async #ecrire(montantCents: number, libelle: string): Promise<string | false> {
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
    return String((r.valeur as { id?: unknown } | null)?.id ?? "");
  }

  /** Ajustement rapide : une dépense ou une rentrée oubliée, sur le compte par défaut. */
  async ajuster(montantCents: number, libelle: string): Promise<boolean> {
    this.message = "";
    if (!Number.isSafeInteger(montantCents) || montantCents === 0) {
      this.message = "Saisissez un montant non nul.";
      return false;
    }
    if ((await this.#ecrire(montantCents, libelle.trim() || "Ajustement")) === false) return false;
    await this.actualiser();
    return true;
  }

  /** Recalage : j'indique ce que j'ai vraiment ; l'écart est écrit dans Finances et gardé pour mesurer la précision. */
  async recaler(reelCents: number): Promise<boolean> {
    this.message = "";
    if (!this.donnees || !this.#hote) return false;
    const ecart = ecartDeRecalage(reelCents, this.estime.vie);
    const ecritureId = ecart === 0 ? "" : await this.#ecrire(ecart, "Recalage sur le solde réel");
    if (ecritureId === false) return false;
    const suivant = avecRecalage(this.donnees, { jour: this.aujourdhui, ecartCents: ecart, ...(ecritureId ? { ecritureId } : {}) });
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

  /** Résumé du widget affiché, pour l'écran d'accueil du téléphone (widget Android). */
  resumerWidget(resume: { titre: string; valeur?: string; lignes?: string[]; page?: string }): void {
    this.#hote?.widgets.resume(resume);
  }
}
