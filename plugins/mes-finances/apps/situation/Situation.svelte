<script lang="ts">
  // Mes finances : l'estimé de la vie courante, jusqu'à quand je tiens, la courbe, les prochains paiements, l'ajout rapide, le recalage
  // et mes comptes. Chaque bloc a un bouton « + » : sa grande fenêtre montre le détail et permet de TOUT régler et corriger après coup
  // (comptes, écritures, recalages, paiements prévus, abonnements, paiements en plusieurs fois).
  import { Bloc, Entete, Icon, LineChart, SelectField } from "@etabli/ui";
  import { ajouterJours, decomposer, differenceJours } from "@etabli/ui/civil";
  import { formatEuros, parseEuros } from "@etabli/ui/money";
  import { courbe, roleDe, type Point } from "../../src/calculs";
  import { Session } from "../../src/session.svelte";
  import { nomType, TYPES_COMPTE, type Abonnement, type Ecriture, type Prevision, type Role } from "../../src/types";

  const s = new Session();
  void s.demarrer();

  const MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
  const court = (j: string): string => `${decomposer(j).jour} ${MOIS[decomposer(j).mois - 1]}`;
  /** « samedi 17 octobre » : la date en toutes lettres, pour qu'on la lise d'un coup d'œil. */
  const dateLongue = (j: string): string => {
    const { annee, mois, jour } = decomposer(j);
    return new Date(annee, mois - 1, jour).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  };
  const euros = (c: number): string => `${c < 0 ? "− " : ""}${formatEuros(Math.abs(c))}`;
  /** Montant sans symbole, pour remplir un champ (« 12,40 »). */
  const enChamp = (c: number): string => formatEuros(Math.abs(c)).replace(/\s?€/, "").replace(/ | /g, "");
  const ROLES: { valeur: Role; nom: string }[] = [
    { valeur: "vie", nom: "Vie courante" },
    { valeur: "secours", nom: "Secours" },
    { valeur: "hors", nom: "Ignoré" },
  ];
  const SOURCES: Record<string, string> = { "@utilisateur": "Saisie", "mes-finances": "Mes finances", courses: "Courses", travail: "Travail", budget: "Budget" };
  const PERIODES: Record<Abonnement["periodicite"], string> = { semaine: "chaque semaine", mois: "chaque mois", an: "chaque année" };

  const roles = $derived(s.donnees?.roles ?? {});
  const jours = $derived(s.tient ? differenceJours(s.aujourdhui, s.tient) : null);
  const points = $derived(s.courbe.map((p) => ({ label: court(p.jour), value: p.soldeCents / 100 })));
  const nomCompte = (id: string | null): string => s.tousComptes.find((c) => c.id === id)?.nom ?? "—";

  // ——— À confirmer ———
  let montants = $state<Record<string, string>>({});
  const montantDe = (p: { id: string; montantCents: number }): string => montants[p.id] ?? enChamp(p.montantCents);
  async function confirmer(p: Prevision): Promise<void> {
    const cents = parseEuros(montantDe(p));
    if (cents === null || cents <= 0) {
      s.message = "Le montant s'écrit comme 12,40.";
      return;
    }
    await s.confirmerPrevision(p, Math.sign(p.montantCents || 1) * cents);
  }

  // ——— Ajout et recalage ———
  let ajustement = $state("");
  let libelle = $state("");
  let reel = $state("");
  async function ajuster(signe: 1 | -1): Promise<void> {
    const cents = parseEuros(ajustement);
    if (cents === null || cents <= 0) {
      s.message = "Le montant s'écrit comme 12,40.";
      return;
    }
    if (await s.ajuster(signe * cents, libelle)) {
      ajustement = "";
      libelle = "";
    }
  }
  async function recaler(): Promise<void> {
    const cents = parseEuros(reel);
    if (cents === null) {
      s.message = "Le solde réel s'écrit comme 1 250,00.";
      return;
    }
    if (await s.recaler(cents)) reel = "";
  }

  // ——— Courbe en grand ———
  let horizonGrand = $state(90);
  const courbeGrande = $derived(courbe(s.estime.vie, s.aujourdhui, horizonGrand, s.aVenir, s.comptes, roles).map((p) => ({ label: court(p.jour), value: p.soldeCents / 100 })));

  // ——— Comptes ———
  let comptesOuverts = $state(false);
  let courbesComptes = $state<Record<string, Point[]>>({});
  $effect(() => {
    if (!comptesOuverts) return;
    for (const c of s.tousComptes) void s.serieCompte(c.id, 90).then((p) => (courbesComptes[c.id] = p));
  });
  let compteEdit = $state<{ id: string; nom: string; type: string; solde: string } | null>(null);
  let nouveau = $state<{ nom: string; type: string; solde: string } | null>(null);
  async function creer(): Promise<void> {
    if (!nouveau) return;
    const cents = nouveau.solde.trim() === "" ? 0 : parseEuros(nouveau.solde);
    if (nouveau.nom.trim() === "" || cents === null) {
      s.message = "Donnez un nom au compte ; le solde s'écrit comme 1 250,00.";
      return;
    }
    if (await s.creerCompte(nouveau.nom, nouveau.type, cents)) nouveau = null;
  }
  async function enregistrerCompte(): Promise<void> {
    if (!compteEdit) return;
    const cents = parseEuros(compteEdit.solde);
    if (!compteEdit.nom.trim() || cents === null) {
      s.message = "Donnez un nom ; le solde de départ s'écrit comme 1 250,00.";
      return;
    }
    if (await s.modifierCompte(compteEdit.id, { nom: compteEdit.nom.trim(), type: compteEdit.type, soldeInitialCents: cents })) compteEdit = null;
  }

  // ——— Historique des écritures ———
  let filtre = $state("");
  const historiqueFiltre = $derived(
    s.historique.filter((e) => !filtre.trim() || `${e.libelle} ${nomCompte(e.compteId)}`.toLowerCase().includes(filtre.trim().toLowerCase())).slice(0, 200),
  );
  let ecritureEdit = $state<{ id: string; montant: string; sens: "1" | "-1"; libelle: string; jour: string; compteId: string } | null>(null);
  const editerEcriture = (e: Ecriture) =>
    (ecritureEdit = { id: e.id, montant: enChamp(e.montantCents), sens: e.montantCents < 0 ? "-1" : "1", libelle: e.libelle, jour: e.jour, compteId: e.compteId });
  async function enregistrerEcriture(): Promise<void> {
    if (!ecritureEdit) return;
    const cents = parseEuros(ecritureEdit.montant);
    if (cents === null || cents <= 0 || !ecritureEdit.libelle.trim()) {
      s.message = "Le montant s'écrit comme 12,40 et le libellé ne peut pas être vide.";
      return;
    }
    const ok = await s.corrigerEcriture(ecritureEdit.id, {
      montantCents: Number(ecritureEdit.sens) * cents,
      libelle: ecritureEdit.libelle.trim(),
      quand: new Date(`${ecritureEdit.jour}T12:00:00`).getTime(),
      compteId: ecritureEdit.compteId,
    });
    if (ok) ecritureEdit = null;
  }

  // ——— Paiements prévus et abonnements ———
  let prevEdit = $state<{ id: string; jour: string; montant: string; sens: number } | null>(null);
  async function enregistrerPrevision(): Promise<void> {
    if (!prevEdit) return;
    const cents = parseEuros(prevEdit.montant);
    if (cents === null || cents <= 0) {
      s.message = "Le montant s'écrit comme 12,40.";
      return;
    }
    if (await s.modifierPrevision(prevEdit.id, { jour: prevEdit.jour, montantCents: prevEdit.sens * cents })) prevEdit = null;
  }
  interface FormAbo {
    id?: string;
    libelle: string;
    montant: string;
    periodicite: Abonnement["periodicite"];
    jour: string;
    compteId: string;
    plusieurs: boolean;
    echeances: string;
  }
  let abo = $state<FormAbo | null>(null);
  const nouvelAbo = (plusieurs: boolean): FormAbo => ({ libelle: "", montant: "", periodicite: "mois", jour: s.aujourdhui, compteId: s.compteParDefaut?.id ?? "", plusieurs, echeances: plusieurs ? "4" : "" });
  const editerAbo = (a: Abonnement): FormAbo => ({
    id: a.id,
    libelle: a.libelle,
    montant: enChamp(a.montantCents),
    periodicite: a.periodicite,
    jour: a.jour,
    compteId: a.compteId ?? "",
    plusieurs: a.echeances !== null,
    echeances: a.echeances === null ? "" : String(a.echeances),
  });
  async function enregistrerAbo(): Promise<void> {
    if (!abo) return;
    const cents = parseEuros(abo.montant);
    const n = Number(abo.echeances);
    if (!abo.libelle.trim() || cents === null || cents <= 0 || (abo.plusieurs && (!Number.isInteger(n) || n < 1))) {
      s.message = "Il faut un nom, un montant (12,40) et, en plusieurs fois, le nombre d'échéances.";
      return;
    }
    const ok = await s.enregistrerAbonnement({
      ...(abo.id ? { id: abo.id } : {}),
      libelle: abo.libelle.trim(),
      montantCents: cents,
      periodicite: abo.periodicite,
      jour: abo.jour,
      compteId: abo.compteId || null,
      echeances: abo.plusieurs ? n : null,
    });
    if (ok) abo = null;
  }
</script>

<div class="page-plugin">
  <Entete titre="Mes finances" />

  {#if s.illisible}
    <section class="bloc">
      <p class="etiquette">Données illisibles</p>
      <p class="negatif">{s.illisible}</p>
      <p class="petit">Les données n'ont pas été touchées. Rien ne s'enregistre tant qu'elles ne peuvent pas être lues.</p>
    </section>
  {:else if !s.charge}
    <p class="petit">Chargement…</p>
  {:else if s.sansFinances}
    <section class="bloc">
      <p class="etiquette">Finances indisponible</p>
      <p>
        {s.sansFinances === "absent"
          ? "Installez le plugin Finances : Mes finances lit vos comptes et vos soldes chez lui."
          : s.sansFinances === "refuse"
            ? "Finances n'a pas répondu comme attendu (version ou permission)."
            : `Finances a répondu : ${s.sansFinances}`}
      </p>
    </section>
  {:else}
    {#if s.aConfirmer.length > 0}
      <section class="bloc a-confirmer">
        <p class="etiquette">À confirmer</p>
        <p class="petit" style="margin: 0 0 8px">Ces paiements prévus sont passés : l'argent est-il vraiment passé ? Corrigez le montant si besoin.</p>
        <ul class="confirmer">
          {#each s.aConfirmer as p (p.id)}
            <li>
              <span class="quoi"><b>{p.libelle || "Paiement prévu"}</b><span class="petit">{court(p.jour)} · {p.montantCents < 0 ? "sortie" : "entrée"}</span></span>
              <input class="saisie num" value={montantDe(p)} oninput={(e) => (montants[p.id] = e.currentTarget.value)} inputmode="decimal" aria-label="Montant de {p.libelle}" />
              <span class="choix">
                <button class="btn primary sm" onclick={() => confirmer(p)}>Confirmer</button>
                <button class="btn sm" onclick={() => void s.ecarterPrevision(p)}>Pas passé</button>
              </span>
            </li>
          {/each}
        </ul>
      </section>
    {/if}

    <div class="grille-2">
      <Bloc titre="Estimé · vie courante" titreGrand="Estimé par compte">
        <div class="grand num" class:negatif={s.estime.vie < 0}>{euros(s.estime.vie)}</div>
        {#if s.estime.secours !== 0}<p class="petit">Secours à part : {euros(s.estime.secours)}</p>{/if}
        <p class="petit">
          {#if s.precision === null}Pas encore de recalage : la précision se mesure dès le premier.{:else}Précision : à ± {formatEuros(s.precision)} près.{/if}
        </p>
        {#snippet grand()}
          <table class="table">
            <thead><tr><th>Compte</th><th>Type</th><th>Rôle</th><th class="droite">Estimé</th></tr></thead>
            <tbody>
              {#each s.comptes as c (c.id)}
                <tr><td>{c.nom}</td><td>{nomType(c.type)}</td><td>{ROLES.find((r) => r.valeur === roleDe(c, roles))?.nom}</td><td class="droite num">{euros(s.soldes[c.id] ?? 0)}</td></tr>
              {/each}
            </tbody>
            <tfoot>
              <tr><td colspan="3"><b>Vie courante</b></td><td class="droite num"><b>{euros(s.estime.vie)}</b></td></tr>
              <tr><td colspan="3">Secours (épargne)</td><td class="droite num">{euros(s.estime.secours)}</td></tr>
            </tfoot>
          </table>
          <p class="petit">« Vie courante » : l'argent que tu dépenses. « Secours » : mis de côté, compté à part. « Ignoré » : pas compté (un PEA, par exemple). Le rôle se règle dans « Mes comptes ».</p>
        {/snippet}
      </Bloc>

      <Bloc titre="Jusqu'à quand je tiens" titreGrand="Jusqu'à quand je tiens">
        {#if s.tient && jours !== null}
          <div class="grand num negatif">{jours === 0 ? "Aujourd'hui" : `${jours} jour${jours > 1 ? "s" : ""}`}</div>
          <p class="date">{jours === 0 ? "Sous le seuil dès" : "Jusqu'au"} <b>{dateLongue(jours === 0 ? s.tient : ajouterJours(s.tient, -1))}</b></p>
        {:else}
          <div class="grand num">Tout l'horizon</div>
          <p class="date">Au moins jusqu'au <b>{dateLongue(s.courbe.at(-1)?.jour ?? s.aujourdhui)}</b></p>
        {/if}
        <p class="petit">Seuil réglé : {euros(s.reglages.seuilCents)}</p>
        {#if s.finRevenus}<p class="petit avertissement">Plus aucune paie prévue après le {court(s.finRevenus)} : pense à ajouter ta prochaine mission.</p>{/if}
        {#if s.sansBudget}<p class="petit">Budget n'est pas là : la courbe ne montre que l'état actuel, sans les paiements prévus.</p>{/if}
        {#snippet grand()}
          <p>Le compte à rebours s'arrête le jour où l'estimé de la vie courante passe sous le seuil, en tenant compte de tous les paiements et paies prévus.</p>
          <p class="petit">Seuil actuel : <b>{euros(s.reglages.seuilCents)}</b> · calcul sur {s.reglages.horizon} jours.</p>
          <button class="btn" onclick={() => s.ouvrirParametres()}>Régler le seuil et l'horizon</button>
          <p class="etiquette espace">Ce qui fait baisser la courbe</p>
          <ul class="liste">
            {#each s.paiements.filter((p) => p.montantCents < 0) as p (p.id)}
              <li><span>{court(p.jour)} · {p.libelle}</span><b class="num negatif">{euros(p.montantCents)}</b></li>
            {:else}
              <li class="petit">Aucune sortie prévue.</li>
            {/each}
          </ul>
        {/snippet}
      </Bloc>
    </div>

    <div class="grille-2-1">
      <Bloc titre={`Courbe des ${s.reglages.horizon} prochains jours`} titreGrand="Courbe de l'argent" largeur={1000}>
        <LineChart {points} title="Solde estimé de la vie courante" format={(v) => `${Math.round(v)} €`} />
        {#snippet grand()}
          <div class="choix-horizon" role="group" aria-label="Horizon">
            {#each [30, 90, 180, 365] as h}
              <button class="btn sm" class:primary={horizonGrand === h} onclick={() => (horizonGrand = h)}>{h === 365 ? "1 an" : `${h} jours`}</button>
            {/each}
          </div>
          <LineChart points={courbeGrande} title="Solde estimé de la vie courante" format={(v) => `${Math.round(v)} €`} />
        {/snippet}
      </Bloc>

      <Bloc titre="Prochains paiements" titreGrand="Paiements prévus, abonnements et paiements en plusieurs fois" largeur={900}>
        {#if s.paiements.length === 0}
          <p class="petit">Rien de prévu{s.sansBudget ? " (Budget absent)" : ""}.</p>
        {:else}
          <ul class="liste">
            {#each s.paiements as p (p.id)}
              <li><span>{court(p.jour)} · {p.libelle}</span><b class="num">{euros(p.montantCents)}</b></li>
            {/each}
          </ul>
        {/if}
        {#snippet grand()}
          <p class="etiquette">Abonnements et paiements en plusieurs fois</p>
          <ul class="liste lignes">
            {#each s.abonnements as a (a.id)}
              <li>
                <span>
                  <b>{a.libelle}</b>
                  <span class="petit">
                    {euros(-a.montantCents)} {PERIODES[a.periodicite]}{a.echeances === null ? "" : `, ${a.echeances} fois`} · depuis le {court(a.jour)} · {nomCompte(a.compteId)}
                  </span>
                </span>
                <span class="choix">
                  <button class="btn sm" onclick={() => (abo = editerAbo(a))}>Modifier</button>
                  <button class="btn sm" onclick={() => void s.supprimerAbonnement(a.id)}>Arrêter</button>
                </span>
              </li>
            {:else}
              <li class="petit">Aucun abonnement.</li>
            {/each}
          </ul>
          {#if abo}
            <div class="formulaire">
              <input class="saisie" bind:value={abo.libelle} placeholder="Nom (ex. : Google One, PayPal 4X)" aria-label="Nom" />
              <input class="saisie num" bind:value={abo.montant} placeholder="Montant d'une échéance (0,00 €)" inputmode="decimal" aria-label="Montant" />
              <SelectField compact label="Fréquence" bind:value={abo.periodicite} options={[{ value: "semaine", label: "Chaque semaine" }, { value: "mois", label: "Chaque mois" }, { value: "an", label: "Chaque année" }]} />
              <label class="champ">Première échéance <input class="saisie" type="date" bind:value={abo.jour} /></label>
              <SelectField compact label="Compte débité" bind:value={abo.compteId} options={[{ value: "", label: "Compte à choisir plus tard" }, ...s.comptes.map((c) => ({ value: c.id, label: c.nom }))]} />
              <label class="coche"><input type="checkbox" bind:checked={abo.plusieurs} /> Paiement en plusieurs fois</label>
              {#if abo.plusieurs}<input class="saisie num" bind:value={abo.echeances} placeholder="Nombre d'échéances" inputmode="numeric" aria-label="Nombre d'échéances" />{/if}
              <div class="actions">
                <button class="btn primary sm" onclick={enregistrerAbo}>{abo.id ? "Enregistrer" : "Ajouter"}</button>
                <button class="btn sm" onclick={() => (abo = null)}>Annuler</button>
              </div>
            </div>
          {:else}
            <div class="actions">
              <button class="btn sm" onclick={() => (abo = nouvelAbo(false))}>+ Abonnement</button>
              <button class="btn sm" onclick={() => (abo = nouvelAbo(true))}>+ Paiement en plusieurs fois</button>
            </div>
          {/if}

          <p class="etiquette espace">Les douze prochains mois</p>
          <ul class="liste lignes">
            {#each s.aVenir.slice(0, 60) as p (p.id)}
              <li>
                {#if prevEdit?.id === p.id}
                  <input class="saisie" type="date" bind:value={prevEdit.jour} aria-label="Nouvelle date" />
                  <input class="saisie num petite" bind:value={prevEdit.montant} inputmode="decimal" aria-label="Nouveau montant" />
                  <span class="choix">
                    <button class="btn primary sm" onclick={enregistrerPrevision}>OK</button>
                    <button class="btn sm" onclick={() => (prevEdit = null)}>Annuler</button>
                  </span>
                {:else}
                  <span>{court(p.jour)} · {p.libelle}</span>
                  <span class="choix">
                    <b class="num">{euros(p.montantCents)}</b>
                    <button class="btn sm" onclick={() => (prevEdit = { id: p.id, jour: p.jour, montant: enChamp(p.montantCents), sens: Math.sign(p.montantCents) || -1 })}>Modifier</button>
                    <button class="btn sm" onclick={() => void s.ecarterPrevision(p)} title="Ce paiement n'aura pas lieu">Retirer</button>
                  </span>
                {/if}
              </li>
            {:else}
              <li class="petit">Rien de prévu.</li>
            {/each}
          </ul>
          <p class="petit">Une paie d'intérim se règle dans Travail (taux horaire, paniers…) : elle se recalcule toute seule ici.</p>
        {/snippet}
      </Bloc>
    </div>

    <!-- Trois blocs de même forme : un titre, une ligne d'explication, puis le contenu. -->
    <div class="trois">
      <Bloc titre="Ajout" sousTitre={s.compteParDefaut ? `Sur ${s.compteParDefaut.nom}` : "Une dépense ou une rentrée oubliée"} titreGrand="Historique : ajouts, retraits et dépenses" largeur={900}>
        <div class="ajout">
          <input class="saisie num" bind:value={ajustement} placeholder="0,00 €" aria-label="Montant" inputmode="decimal" autocomplete="off" />
          <button class="carre plus" onclick={() => ajuster(1)} aria-label="Ajouter une rentrée" title="Rentrée"><Icon name="plus" size={15} /></button>
          <input class="saisie" bind:value={libelle} placeholder="Libellé" aria-label="Libellé" autocomplete="off" />
          <button class="carre moins" onclick={() => ajuster(-1)} aria-label="Ajouter une dépense" title="Dépense"><Icon name="minus" size={15} /></button>
        </div>
        {#snippet grand()}
          <input class="saisie" bind:value={filtre} placeholder="Chercher (libellé, compte)…" aria-label="Chercher dans l'historique" />
          <ul class="liste lignes">
            {#each historiqueFiltre as e (e.id)}
              <li>
                {#if ecritureEdit?.id === e.id}
                  <div class="formulaire ligne-edit">
                    <input class="saisie" bind:value={ecritureEdit.libelle} aria-label="Libellé" />
                    <SelectField compact label="Sens" bind:value={ecritureEdit.sens} options={[{ value: "-1", label: "Dépense" }, { value: "1", label: "Rentrée" }]} />
                    <input class="saisie num" bind:value={ecritureEdit.montant} inputmode="decimal" aria-label="Montant" />
                    <input class="saisie" type="date" bind:value={ecritureEdit.jour} aria-label="Date" />
                    <SelectField compact label="Compte" bind:value={ecritureEdit.compteId} options={s.comptes.map((c) => ({ value: c.id, label: c.nom }))} />
                    <span class="choix">
                      <button class="btn primary sm" onclick={enregistrerEcriture}>Enregistrer</button>
                      <button class="btn sm" onclick={() => (ecritureEdit = null)}>Annuler</button>
                    </span>
                  </div>
                {:else}
                  <span>
                    <b>{e.libelle}</b>
                    <span class="petit">{court(e.jour)} · {nomCompte(e.compteId)} · {SOURCES[e.source] ?? e.source}</span>
                  </span>
                  <span class="choix">
                    <b class="num" class:negatif={e.montantCents < 0}>{euros(e.montantCents)}</b>
                    <button class="btn sm" onclick={() => editerEcriture(e)}>Modifier</button>
                    <button class="btn sm" onclick={() => void s.supprimerEcriture(e.id)}>Supprimer</button>
                  </span>
                {/if}
              </li>
            {:else}
              <li class="petit">Rien sur les 12 derniers mois.</li>
            {/each}
          </ul>
          <p class="petit">Une écriture modifiée ou supprimée est annulée puis remplacée : les soldes se recalculent, et rien ne se perd.</p>
        {/snippet}
      </Bloc>

      <Bloc titre="Recalage" sousTitre="Le solde réel de la vie courante" titreGrand="Historique des recalages">
        <div class="recaler">
          <input class="saisie num" bind:value={reel} placeholder="0,00 €" aria-label="Solde réel" inputmode="decimal" autocomplete="off" onkeydown={(e) => e.key === "Enter" && recaler()} />
          <button class="btn primary" onclick={recaler}>Recaler</button>
        </div>
        {#snippet grand()}
          <ul class="liste lignes">
            {#each [...(s.donnees?.recalages ?? [])].map((r, i) => ({ r, i })).reverse() as { r, i } (i)}
              <li>
                <span>{dateLongue(r.jour)}</span>
                <span class="choix">
                  <b class="num" class:negatif={r.ecartCents < 0}>{r.ecartCents === 0 ? "juste" : euros(r.ecartCents)}</b>
                  <button class="btn sm" onclick={() => void s.supprimerRecalage(i)}>Supprimer</button>
                </span>
              </li>
            {:else}
              <li class="petit">Aucun recalage pour l'instant.</li>
            {/each}
          </ul>
          <p class="petit">L'écart, c'est ce que tu avais vraiment moins ce que l'appli estimait. Supprimer un recalage annule sa correction.</p>
        {/snippet}
      </Bloc>

      <Bloc titre="Mes comptes" sousTitre="Le rôle de chaque compte" titreGrand="Mes comptes" largeur={960} bind:ouvert={comptesOuverts}>
        {#if s.comptes.length === 0}
          <p class="petit">Aucun compte pour l'instant : ouvre « + » pour en ajouter.</p>
        {:else}
          <ul class="liste">
            {#each s.comptes as c (c.id)}
              <li>
                <span>{c.nom} <span class="petit num">{euros(s.soldes[c.id] ?? 0)}</span></span>
                <SelectField compact label={`Rôle de ${c.nom}`} value={roleDe(c, roles)} onchange={(v) => s.definirRole(c.id, v as Role)} options={ROLES.map((r) => ({ value: r.valeur, label: r.nom }))} />
              </li>
            {/each}
          </ul>
        {/if}
        {#snippet grand()}
          <div class="cartes-comptes">
            {#each s.tousComptes.filter((c) => !c.archive) as c (c.id)}
              <article class="carte-compte">
                {#if compteEdit?.id === c.id}
                  <input class="saisie" bind:value={compteEdit.nom} aria-label="Nom du compte" />
                  <SelectField compact label="Type de compte" bind:value={compteEdit.type} options={TYPES_COMPTE.map((t) => ({ value: t.valeur, label: t.nom }))} />
                  <label class="champ">Solde de départ <input class="saisie num" bind:value={compteEdit.solde} inputmode="decimal" /></label>
                  <div class="actions">
                    <button class="btn primary sm" onclick={enregistrerCompte}>Enregistrer</button>
                    <button class="btn sm" onclick={() => (compteEdit = null)}>Annuler</button>
                  </div>
                {:else}
                  <header>
                    <b>{c.nom}</b>
                    <span class="petit">{nomType(c.type)}</span>
                  </header>
                  <div class="moyen num" class:negatif={(s.soldes[c.id] ?? 0) < 0}>{euros(s.soldes[c.id] ?? 0)}</div>
                  {#if (courbesComptes[c.id]?.length ?? 0) > 1}
                    <LineChart points={courbesComptes[c.id]!.map((p) => ({ label: court(p.jour), value: p.soldeCents / 100 }))} title={`Solde de ${c.nom} sur 90 jours`} format={(v) => `${Math.round(v)} €`} />
                  {/if}
                  <label class="champ">Rôle
                    <SelectField compact label="Rôle" value={roleDe(c, roles)} onchange={(v) => s.definirRole(c.id, v as Role)} options={ROLES.map((r) => ({ value: r.valeur, label: r.nom }))} />
                  </label>
                  <div class="actions">
                    <button class="btn sm" onclick={() => (compteEdit = { id: c.id, nom: c.nom, type: c.type, solde: enChamp(c.soldeInitialCents ?? 0) })}>Régler</button>
                    <button class="btn sm" onclick={() => void s.modifierCompte(c.id, { archive: true })} title="Le compte disparaît des calculs ; son historique reste">Archiver</button>
                  </div>
                {/if}
              </article>
            {/each}
          </div>
          {#if s.tousComptes.some((c) => c.archive)}
            <p class="etiquette espace">Comptes archivés</p>
            <ul class="liste">
              {#each s.tousComptes.filter((c) => c.archive) as c (c.id)}
                <li><span>{c.nom} <span class="petit">{nomType(c.type)}</span></span><button class="btn sm" onclick={() => void s.modifierCompte(c.id, { archive: false })}>Réactiver</button></li>
              {/each}
            </ul>
          {/if}
          {#if nouveau}
            <div class="formulaire">
              <input class="saisie" bind:value={nouveau.nom} placeholder="Nom (ex. : Revolut perso)" aria-label="Nom du compte" autocomplete="off" />
              <SelectField compact label="Type de compte" bind:value={nouveau.type} options={TYPES_COMPTE.map((t) => ({ value: t.valeur, label: t.nom }))} />
              <input class="saisie num" bind:value={nouveau.solde} placeholder="Solde aujourd'hui (0,00 €)" aria-label="Solde d'aujourd'hui" inputmode="decimal" autocomplete="off" />
              <div class="actions">
                <button class="btn primary sm" onclick={creer}>Créer le compte</button>
                <button class="btn sm" onclick={() => (nouveau = null)}>Annuler</button>
              </div>
            </div>
          {:else}
            <div class="actions espace">
              <button class="btn primary sm" onclick={() => (nouveau = { nom: "", type: "courant", solde: "" })}>+ Ajouter un compte</button>
            </div>
          {/if}
        {/snippet}
      </Bloc>
    </div>
    {#if s.message}<p class="negatif" role="alert">{s.message}</p>{/if}
  {/if}
</div>

<style>
  .confirmer {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .confirmer li {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px 10px;
    padding: 8px 0;
    border-bottom: 1px solid var(--border);
  }
  .confirmer .quoi {
    flex: 1 1 160px;
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  .confirmer .saisie {
    width: 100px;
  }
  .choix {
    display: flex;
    gap: 6px;
    align-items: center;
    flex-wrap: wrap;
  }
  .grand {
    margin-top: 6px;
    font-size: 34px;
    font-weight: 600;
    line-height: 1.1;
  }
  .moyen {
    font-size: 24px;
    font-weight: 600;
  }
  /* La date de fin, bien lisible sous le nombre de jours. */
  .date {
    margin: 6px 0 0;
    font-size: 18px;
    color: var(--text);
  }
  .date b {
    font-weight: 800;
  }
  .avertissement {
    color: var(--warn, #d9a441);
  }
  .liste {
    list-style: none;
    margin: 8px 0 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .liste li {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
  }
  .liste.lignes li {
    padding: 8px 0;
    border-bottom: 1px solid var(--border);
    flex-wrap: wrap;
  }
  .liste.lignes li > span:first-child {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  .trois {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 14px;
    align-items: stretch;
  }
  @media (max-width: 1000px) {
    .trois {
      grid-template-columns: 1fr;
    }
  }
  /* Prix en haut, libellé en bas, et à droite deux petits boutons carrés alignés sur ces deux lignes : + (vert) et − (rouge). */
  .ajout {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-rows: 36px 36px;
    gap: 10px 14px;
    align-items: center;
    margin-top: 10px;
  }
  .carre {
    width: 28px;
    height: 28px;
    display: grid;
    place-items: center;
    padding: 0;
    border: 0;
    border-radius: 8px;
    color: #fff;
    cursor: pointer;
  }
  .carre.plus {
    background: var(--ok);
  }
  .carre.moins {
    background: var(--err);
  }
  .recaler {
    display: flex;
    gap: 12px;
    align-items: center;
    margin-top: 10px;
  }
  .recaler .saisie {
    flex: 1;
    min-width: 0;
  }
  .recaler .btn {
    height: 44px;
    padding: 0 22px;
  }
  .formulaire {
    display: grid;
    gap: 8px;
    margin-top: 10px;
  }
  .ligne-edit {
    width: 100%;
    grid-template-columns: 2fr 1fr 1fr 1fr 1fr;
    align-items: center;
  }
  @media (max-width: 760px) {
    .ligne-edit {
      grid-template-columns: 1fr;
    }
  }
  .actions {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }
  .espace {
    margin-top: 18px;
  }
  .petite {
    width: 110px;
  }
  .champ {
    display: grid;
    gap: 4px;
    font-size: 12px;
    color: var(--muted);
  }
  .coche {
    display: flex;
    gap: 8px;
    align-items: center;
  }
  .choix-horizon {
    display: flex;
    gap: 6px;
    margin-bottom: 10px;
  }
  .table {
    width: 100%;
    border-collapse: collapse;
  }
  .table th,
  .table td {
    padding: 7px 6px;
    border-bottom: 1px solid var(--border);
    text-align: left;
  }
  .table th {
    font-size: 12px;
    color: var(--muted);
    font-weight: 600;
  }
  .droite {
    text-align: right !important;
  }
  .cartes-comptes {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 12px;
  }
  .carte-compte {
    display: grid;
    gap: 8px;
    padding: 12px;
    border: 1px solid var(--border);
    border-radius: 12px;
    background: var(--surface-2);
  }
  .carte-compte header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 8px;
  }
</style>
