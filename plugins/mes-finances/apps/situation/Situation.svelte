<script lang="ts">
  // Mes finances : l'estimé de la vie courante, jusqu'à quand je tiens, la courbe, les prochains paiements, l'ajustement rapide,
  // le recalage sur le solde réel et le rôle de chaque compte.
  import { Entete, LineChart, Icon } from "@etabli/ui";
  import { ajouterJours, decomposer, differenceJours } from "@etabli/ui/civil";
  import { formatEuros, parseEuros } from "@etabli/ui/money";
  import { roleDe } from "../../src/calculs";
  import { Session } from "../../src/session.svelte";
  import type { Role } from "../../src/types";

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
  const ROLES: { valeur: Role; nom: string }[] = [
    { valeur: "vie", nom: "Vie courante" },
    { valeur: "secours", nom: "Secours" },
    { valeur: "hors", nom: "Ignoré" },
  ];

  const roles = $derived(s.donnees?.roles ?? {});
  const jours = $derived(s.tient ? differenceJours(s.aujourdhui, s.tient) : null);
  const points = $derived(s.courbe.map((p) => ({ label: court(p.jour), value: p.soldeCents / 100 })));

  /** Montant corrigé avant confirmation, par prévision (en euros, sans signe). */
  let montants = $state<Record<string, string>>({});
  const montantDe = (p: { id: string; montantCents: number }): string => montants[p.id] ?? formatEuros(Math.abs(p.montantCents)).replace(/\s?€/, "").replace(/\u202f|\u00a0/g, "");
  async function confirmer(p: { id: string; montantCents: number; jour: string; libelle: string; compteId: string | null }): Promise<void> {
    const cents = parseEuros(montantDe(p));
    if (cents === null || cents <= 0) {
      s.message = "Le montant s'écrit comme 12,40.";
      return;
    }
    await s.confirmerPrevision(p, Math.sign(p.montantCents || 1) * cents);
  }
  let ajustement = $state("");
  let libelle = $state("");
  let reel = $state("");
  // Nouveau compte : nom, type et solde d'aujourd'hui.
  let nouveau = $state<{ nom: string; type: "courant" | "epargne" | "especes" | "autre"; solde: string } | null>(null);
  async function creer(): Promise<void> {
    if (!nouveau) return;
    const cents = nouveau.solde.trim() === "" ? 0 : parseEuros(nouveau.solde);
    if (nouveau.nom.trim() === "" || cents === null) {
      s.message = "Donnez un nom au compte ; le solde s'écrit comme 1 250,00.";
      return;
    }
    if (await s.creerCompte(nouveau.nom, nouveau.type, cents)) nouveau = null;
  }

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
      <section class="bloc">
        <p class="etiquette">Estimé · vie courante</p>
        <div class="grand num" class:negatif={s.estime.vie < 0}>{euros(s.estime.vie)}</div>
        {#if s.estime.secours !== 0}<p class="petit">Secours à part : {euros(s.estime.secours)}</p>{/if}
        <p class="petit">
          {#if s.precision === null}Pas encore de recalage : la précision se mesure dès le premier.{:else}Précision : à ± {formatEuros(s.precision)} près.{/if}
        </p>
      </section>

      <section class="bloc">
        <p class="etiquette">Jusqu'à quand je tiens</p>
        {#if s.tient && jours !== null}
          <div class="grand num negatif">{jours === 0 ? "Aujourd'hui" : `${jours} jour${jours > 1 ? "s" : ""}`}</div>
          <p class="date">{jours === 0 ? "Sous le seuil dès" : "Jusqu'au"} <b>{dateLongue(jours === 0 ? s.tient : ajouterJours(s.tient, -1))}</b></p>
          <p class="petit">Seuil réglé : {euros(s.reglages.seuilCents)}</p>
        {:else}
          <div class="grand num">Tout l'horizon</div>
          <p class="date">Au moins jusqu'au <b>{dateLongue(s.courbe.at(-1)?.jour ?? s.aujourdhui)}</b></p>
          <p class="petit">Seuil réglé : {euros(s.reglages.seuilCents)}</p>
        {/if}        {#if s.sansBudget}
          <p class="petit">Budget n'est pas là : la courbe ne montre que l'état actuel, sans les paiements prévus.</p>
        {/if}
      </section>
    </div>

    <div class="grille-2-1">
      <section class="bloc">
        <p class="etiquette">Courbe des {s.reglages.horizon} prochains jours</p>
        <LineChart {points} title="Solde estimé de la vie courante" format={(v) => `${Math.round(v)} €`} />
      </section>

      <section class="bloc">
        <p class="etiquette">Prochains paiements</p>
        {#if s.paiements.length === 0}
          <p class="petit">Rien de prévu{s.sansBudget ? " (Budget absent)" : ""}.</p>
        {:else}
          <ul class="liste">
            {#each s.paiements as p (p.id)}
              <li><span>{court(p.jour)} · {p.libelle}</span><b class="num">{euros(p.montantCents)}</b></li>
            {/each}
          </ul>
        {/if}
        {#if nouveau}
          <div class="nouveau">
            <input class="saisie" bind:value={nouveau.nom} placeholder="Nom (ex. : Compte courant)" aria-label="Nom du compte" autocomplete="off" />
            <select class="saisie" bind:value={nouveau.type} aria-label="Type de compte">
              <option value="courant">Courant</option><option value="epargne">Épargne</option><option value="especes">Espèces</option><option value="autre">Autre</option>
            </select>
            <input class="saisie num" bind:value={nouveau.solde} placeholder="Solde aujourd'hui (0,00 €)" aria-label="Solde d'aujourd'hui" inputmode="decimal" autocomplete="off" />
            <div class="actions">
              <button class="btn primary sm" onclick={creer}>Créer le compte</button>
              <button class="btn sm" onclick={() => (nouveau = null)}>Annuler</button>
            </div>
          </div>
        {:else}
          <button class="btn sm ajouter-compte" onclick={() => (nouveau = { nom: "", type: "courant", solde: "" })}>+ Compte</button>
        {/if}
      </section>
    </div>

    <!-- Trois blocs de même forme : un titre, une ligne d'explication, puis le contenu. -->
    <div class="trois">
      <section class="bloc">
        <p class="etiquette">Ajout</p>
        <p class="petit">{s.compteParDefaut ? `Sur ${s.compteParDefaut.nom}` : "Une dépense ou une rentrée oubliée"}</p>
        <div class="ajout">
          <input class="saisie num" bind:value={ajustement} placeholder="0,00 €" aria-label="Montant" inputmode="decimal" autocomplete="off" />
          <button class="carre plus" onclick={() => ajuster(1)} aria-label="Ajouter une rentrée" title="Rentrée"><Icon name="plus" size={15} /></button>
          <input class="saisie" bind:value={libelle} placeholder="Libellé" aria-label="Libellé" autocomplete="off" />
          <button class="carre moins" onclick={() => ajuster(-1)} aria-label="Ajouter une dépense" title="Dépense"><Icon name="minus" size={15} /></button>
        </div>
      </section>

      <section class="bloc">
        <p class="etiquette">Recalage</p>
        <p class="petit">Le solde réel de la vie courante</p>
        <div class="recaler">
          <input class="saisie num" bind:value={reel} placeholder="0,00 €" aria-label="Solde réel" inputmode="decimal" autocomplete="off" onkeydown={(e) => e.key === "Enter" && recaler()} />
          <button class="btn primary" onclick={recaler}>Recaler</button>
        </div>
      </section>

      <section class="bloc">
        <p class="etiquette">Mes comptes</p>
        <p class="petit">Le rôle de chaque compte</p>
        {#if s.comptes.length === 0}
          <p class="petit">Aucun compte pour l'instant.</p>
        {:else}
          <ul class="liste">
            {#each s.comptes as c (c.id)}
              <li>
                <span>{c.nom} <span class="petit num">{euros(s.soldes[c.id] ?? 0)}</span></span>
                <select class="saisie role" value={roleDe(c, roles)} aria-label={`Rôle de ${c.nom}`} onchange={(e) => s.definirRole(c.id, e.currentTarget.value as Role)}>
                  {#each ROLES as r (r.valeur)}<option value={r.valeur}>{r.nom}</option>{/each}
                </select>
              </li>
            {/each}
          </ul>
        {/if}
      </section>
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
  .confirmer .choix {
    display: flex;
    gap: 6px;
  }
  .grand {
    margin-top: 6px;
    font-size: 34px;
    font-weight: 600;
    line-height: 1.1;
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
  .nouveau {
    display: grid;
    gap: 8px;
    margin-top: 10px;
  }
  .ajouter-compte {
    margin-top: 10px;
  }
  .role {
    width: auto;
  }
</style>
