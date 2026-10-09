<script lang="ts">
  // Les widgets de Mes finances sur l'accueil : l'estimé, jusqu'à quand je tiens, la courbe, les prochains paiements, un compte au choix.
  // L'accueil donne l'identifiant du widget dans l'adresse (« #widget=courbe ») ; un clic ouvre la page Mes finances en grand.
  import { LineChart } from "@etabli/ui";
  import { ajouterJours, decomposer, differenceJours } from "@etabli/ui/civil";
  import { formatEuros } from "@etabli/ui/money";
  import { Session } from "../../src/session.svelte";

  const id = /^#widget=([a-z0-9-]+)/.exec(location.hash)?.[1] ?? "resume";
  /** Numéro d'exemplaire : le même widget peut être posé plusieurs fois, chacun avec son compte. */
  const exemplaire = Number(/[&?]i=(\d+)/.exec(location.hash)?.[1] ?? 1);
  const s = new Session();
  void s.demarrer();

  const MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
  const court = (j: string): string => `${decomposer(j).jour} ${MOIS[decomposer(j).mois - 1]}`;
  const dateLongue = (j: string): string => {
    const { annee, mois, jour } = decomposer(j);
    return new Date(annee, mois - 1, jour).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  };
  const euros = (c: number): string => `${c < 0 ? "− " : ""}${formatEuros(Math.abs(c))}`;
  const jours = $derived(s.tient ? differenceJours(s.aujourdhui, s.tient) : null);
  const points = $derived(s.courbe.map((p) => ({ label: court(p.jour), value: p.soldeCents / 100 })));
  const compte = $derived(s.comptes.find((c) => c.id === s.donnees?.comptesWidgets[String(exemplaire)]) ?? null);
  const ouvrir = () => s.ouvrirPage("situation");

  // La courbe occupe exactement la place que le widget lui laisse : sa hauteur suit celle de son conteneur (elle est dessinée sur 600 de large).
  let largeurCourbe = $state(400);
  let hauteurPlace = $state(120);
  const hauteurCourbe = $derived(Math.max(60, Math.min(420, Math.round((600 * hauteurPlace) / Math.max(120, largeurCourbe)))));
</script>

{#snippet duree()}
  {#if s.tient && jours !== null}
    <div class="grand num negatif">{jours === 0 ? "Aujourd'hui" : `${jours} jour${jours > 1 ? "s" : ""}`}</div>
    <p class="date">{jours === 0 ? "Sous le seuil dès" : "Jusqu'au"} <b>{dateLongue(jours === 0 ? s.tient : ajouterJours(s.tient, -1))}</b></p>
  {:else}
    <div class="grand num">Tout l'horizon</div>
    <p class="date">Au moins jusqu'au <b>{dateLongue(s.courbe.at(-1)?.jour ?? s.aujourdhui)}</b></p>
  {/if}
{/snippet}

{#if s.illisible}
  <div class="w"><p class="petit negatif">Données illisibles.</p></div>
{:else if !s.charge}
  <div class="w"><p class="petit">Chargement…</p></div>
{:else if s.sansFinances}
  <div class="w"><p class="petit">Finances n'est pas disponible.</p></div>
{:else if id === "compte"}
  <div class="w">
    <p class="etiquette">Un compte</p>
    <select class="saisie choix" value={s.donnees?.comptesWidgets[String(exemplaire)] ?? ""} aria-label="Compte affiché" onchange={(e) => s.choisirCompteWidget(exemplaire, e.currentTarget.value || null)}>
      <option value="">Choisir un compte…</option>
      {#each s.comptes as c (c.id)}<option value={c.id}>{c.nom}</option>{/each}
    </select>
    {#if compte}
      <button class="lien" onclick={ouvrir}>
        <span class="grand num" class:negatif={(s.soldes[compte.id] ?? 0) < 0}>{euros(s.soldes[compte.id] ?? 0)}</span>
      </button>
    {/if}
  </div>
{:else if id === "tient"}
  <button class="w lien" onclick={ouvrir} aria-label="Ouvrir Mes finances">
    <p class="etiquette">Jusqu'à quand je tiens</p>
    {@render duree()}
  </button>
{:else if id === "courbe"}
  <button class="w lien" onclick={ouvrir} aria-label="Ouvrir Mes finances">
    <p class="etiquette">Courbe des {s.reglages.horizon} prochains jours</p>
    <div class="courbe" bind:clientWidth={largeurCourbe} bind:clientHeight={hauteurPlace}>
      <!-- Posée à plat dans son conteneur : c'est le conteneur qui donne la taille, jamais le dessin. -->
      <div class="dessin"><LineChart {points} title="Solde estimé de la vie courante" format={(v) => `${Math.round(v)} €`} height={hauteurCourbe} /></div>
    </div>
  </button>
{:else if id === "paiements"}
  <button class="w lien haut" onclick={ouvrir} aria-label="Ouvrir Mes finances">
    <p class="etiquette">Prochains paiements</p>
    {#if s.paiements.length === 0}
      <p class="petit">Rien de prévu.</p>
    {:else}
      <ul class="liste">
        {#each s.paiements as p (p.id)}<li><span>{court(p.jour)} · {p.libelle}</span><b class="num">{euros(p.montantCents)}</b></li>{/each}
      </ul>
    {/if}
  </button>
{:else if id === "estime"}
  <button class="w lien" onclick={ouvrir} aria-label="Ouvrir Mes finances">
    <p class="etiquette">Argent actuel · vie courante</p>
    <div class="grand num" class:negatif={s.estime.vie < 0}>{euros(s.estime.vie)}</div>
    {#if s.estime.secours !== 0}<p class="petit secondaire">Secours à part : {euros(s.estime.secours)}</p>{/if}
  </button>
{:else}
  <button class="w lien" onclick={ouvrir} aria-label="Ouvrir Mes finances">
    <p class="etiquette">Estimé · vie courante</p>
    <div class="grand num" class:negatif={s.estime.vie < 0}>{euros(s.estime.vie)}</div>
    <p class="petit secondaire">
      {#if s.tient && jours !== null}Je tiens {jours} jour{jours > 1 ? "s" : ""} · jusqu'au {court(ajouterJours(s.tient, -1))}{:else}Au-dessus du seuil jusqu'au {court(s.courbe.at(-1)?.jour ?? s.aujourdhui)}{/if}
    </p>
  </button>
{/if}

<style>
  .w {
    box-sizing: border-box;
    width: 100%;
    height: 100vh;
    padding: 14px 16px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 4px;
    margin: 0;
    border: 0;
    background: none;
    color: var(--text);
    text-align: left;
    font: inherit;
    position: relative;
    overflow: hidden;
  }
  .w.haut {
    justify-content: flex-start;
    overflow: auto;
  }
  .lien {
    cursor: pointer;
  }
  .lien:hover {
    background: var(--surface-2);
  }
  .grand {
    font-size: 30px;
    font-weight: 600;
    line-height: 1.1;
  }
  .date {
    margin: 4px 0 0;
    font-size: 16px;
  }
  .date b {
    font-weight: 800;
  }
  .courbe {
    flex: 1 1 0;
    min-height: 0;
    width: 100%;
    overflow: hidden;
    position: relative;
  }
  .dessin {
    position: absolute;
    inset: 0;
    overflow: hidden;
  }
  .liste {
    list-style: none;
    margin: 6px 0 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .liste li {
    display: flex;
    justify-content: space-between;
    gap: 10px;
  }
  .choix {
    width: 100%;
  }
  /* Petites tailles (une case de haut ou de large) : on resserre et on garde l'essentiel. */
  @media (max-height: 150px) {
    .w {
      padding: 10px 14px;
      gap: 2px;
    }
    .grand {
      font-size: 24px;
    }
    .date {
      font-size: 14px;
      margin-top: 2px;
    }
    .secondaire {
      display: none;
    }
  }
  @media (max-width: 260px) {
    .grand {
      font-size: 22px;
    }
  }
</style>