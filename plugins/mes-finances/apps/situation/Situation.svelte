<script lang="ts">
  // Mes finances : l'estimé de la vie courante, jusqu'à quand je tiens, la courbe, les prochains paiements, l'ajustement rapide,
  // le recalage sur le solde réel et le rôle de chaque compte.
  import { Entete, LineChart } from "@etabli/ui";
  import { decomposer, differenceJours } from "@etabli/ui/civil";
  import { formatEuros, parseEuros } from "@etabli/ui/money";
  import { roleDe } from "../../src/calculs";
  import { Session } from "../../src/session.svelte";
  import type { Role } from "../../src/types";

  const s = new Session();
  void s.demarrer();

  const MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
  const court = (j: string): string => `${decomposer(j).jour} ${MOIS[decomposer(j).mois - 1]}`;
  const euros = (c: number): string => `${c < 0 ? "− " : ""}${formatEuros(Math.abs(c))}`;
  const ROLES: { valeur: Role; nom: string }[] = [
    { valeur: "vie", nom: "Vie courante" },
    { valeur: "secours", nom: "Secours" },
    { valeur: "hors", nom: "Ignoré" },
  ];

  const roles = $derived(s.donnees?.roles ?? {});
  const jours = $derived(s.tient ? differenceJours(s.aujourdhui, s.tient) : null);
  const points = $derived(s.courbe.map((p) => ({ label: court(p.jour), value: p.soldeCents / 100 })));

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
</script>

<div class="page-plugin">
  <Entete titre="Mes finances">
    {#snippet actions()}<button class="btn" onclick={() => s.ouvrirParametres()}>Paramètres</button>{/snippet}
  </Entete>

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
          <p class="petit">Sous le seuil de {euros(s.reglages.seuilCents)} dès le {court(s.tient)}</p>
        {:else}
          <div class="grand num">Tout l'horizon</div>
          <p class="petit">Au-dessus de {euros(s.reglages.seuilCents)} jusqu'au {court(s.courbe.at(-1)?.jour ?? s.aujourdhui)}</p>
        {/if}
        {#if s.sansBudget}
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
      </section>
    </div>

    <div class="grille-2">
      <section class="bloc centre">
        <p class="etiquette">Ajouter{s.compteParDefaut ? ` · ${s.compteParDefaut.nom}` : ""}</p>
        <div class="ajout">
          <input class="saisie num" bind:value={ajustement} placeholder="0,00 €" aria-label="Montant" inputmode="decimal" autocomplete="off" />
          <button class="carre plus" onclick={() => ajuster(1)} aria-label="Ajouter une rentrée" title="Rentrée">+</button>
          <input class="saisie" bind:value={libelle} placeholder="Libellé" aria-label="Libellé" autocomplete="off" />
          <button class="carre moins" onclick={() => ajuster(-1)} aria-label="Ajouter une dépense" title="Dépense">−</button>
        </div>
      </section>

      <section class="bloc centre">
        <p class="etiquette">Recaler sur le solde réel</p>
        <div class="recaler">
          <input class="saisie num" bind:value={reel} placeholder="0,00 €" aria-label="Solde réel" inputmode="decimal" autocomplete="off" onkeydown={(e) => e.key === "Enter" && recaler()} />
          <button class="btn primary" onclick={recaler}>Recaler</button>
        </div>
      </section>
    </div>

    <div class="seul">      <section class="bloc">
        <p class="etiquette">Mes comptes</p>
        {#if s.comptes.length === 0}
          <p class="petit">Aucun compte. Créez-les dans Finances.</p>
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
  .grand {
    margin-top: 6px;
    font-size: 34px;
    font-weight: 600;
    line-height: 1.1;
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
  .centre {
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
  /* Prix en haut, libellé en bas, et à droite deux gros boutons carrés alignés sur ces deux lignes : + (vert) et − (rouge). */
  .ajout {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-rows: 58px 58px;
    gap: 10px 14px;
    align-items: center;
    margin-top: 10px;
  }
  .carre {
    width: 58px;
    height: 58px;
    border: 0;
    border-radius: 14px;
    color: #fff;
    font-size: 30px;
    font-weight: 700;
    line-height: 1;
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
  .role {
    width: auto;
  }
</style>
