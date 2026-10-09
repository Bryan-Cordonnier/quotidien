<script lang="ts">
  // Le widget de Travail sur l'accueil : la mission en cours (ou la prochaine), son net et l'avancement. Un clic ouvre la page Travail.
  import { Jauge } from "@etabli/ui";
  import { formatEuros } from "@etabli/ui/money";
  import { dans } from "../../src/affichage";
  import { Session } from "../../src/session.svelte";
  import { missionEnCours, missionProchaine, resume } from "../../src/vue";

  const s = new Session();
  void s.demarrer();

  const encours = $derived(s.donnees ? missionEnCours(s.donnees, s.aujourdhui) : undefined);
  const suivante = $derived(s.donnees ? missionProchaine(s.donnees, s.aujourdhui) : undefined);
  const m = $derived(encours ?? suivante);
  const r = $derived(s.donnees && m ? resume(s.donnees, s.reglages, m, s.aujourdhui) : null);
</script>

{#if s.illisible}
  <div class="w"><p class="petit negatif">Données illisibles.</p></div>
{:else if !s.donnees}
  <div class="w"><p class="petit">Chargement…</p></div>
{:else}
  <button class="w lien" onclick={() => s.ouvrirPage("travail")} aria-label="Ouvrir Travail">
    <p class="etiquette">{encours ? "Mission en cours" : "Prochaine mission"}</p>
    {#if m && r}
      <div class="titre"><b>{r.titre}</b><span class="num net">{formatEuros(r.netCents)}</span></div>
      {#if encours}
        <Jauge pourcent={r.pourcent} gauche="{r.faits}/{r.total} jours" droite="{r.pourcent} %" label="Jours travaillés de la mission" />
      {:else}
        <span class="num petit">{dans(s.aujourdhui, m.debut)}</span>
      {/if}
    {:else}
      <p class="petit">Aucune mission pour l'instant.</p>
    {/if}
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
    gap: 6px;
    margin: 0;
    border: 0;
    background: none;
    color: var(--text);
    text-align: left;
    font: inherit;
  }
  .lien {
    cursor: pointer;
  }
  .lien:hover {
    background: var(--surface-2);
  }

  .titre {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: baseline;
    gap: 4px 12px;
  }
  .titre b {
    font-size: 17px;
    font-weight: 800;
  }
  .net {
    font-weight: 700;
  }
  /* Petites tailles (une case de haut ou de large) : on resserre et on garde l'essentiel. */
  @media (max-height: 150px) {
    .w {
      padding: 10px 14px;
      gap: 2px;
    }
  }
</style>
