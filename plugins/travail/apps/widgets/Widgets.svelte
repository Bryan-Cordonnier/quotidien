<script lang="ts">
  // Le widget de Travail sur l'accueil : la mission en cours (ou la prochaine), son net et l'avancement. Un clic ouvre la page Travail.
  import { Jauge } from "@etabli/ui";
  import { formatEuros } from "@etabli/ui/money";
  import { dans } from "../../src/affichage";
  import { Session } from "../../src/session.svelte";
  import { missionEnCours, prochaine, resume } from "../../src/vue";

  const s = new Session();
  void s.demarrer();

  const encours = $derived(s.donnees ? missionEnCours(s.donnees, s.aujourdhui) : undefined);
  const suivante = $derived(s.donnees && !encours ? prochaine(s.donnees, s.reglages, s.aujourdhui) : null);
  const r = $derived(s.donnees && encours ? resume(s.donnees, s.reglages, encours, s.aujourdhui) : null);

  // Résumé pour l'écran d'accueil du téléphone.
  $effect(() => {
    if (!s.donnees) return;
    s.resumerWidget(
      r
        ? { titre: "Mission en cours", valeur: formatEuros(r.netCents), lignes: [r.titre, `${r.faits}/${r.total} jours`], page: "travail" }
        : suivante
          ? { titre: "Prochaine mission", valeur: formatEuros(suivante.netCents), lignes: [suivante.titre, dans(s.aujourdhui, suivante.debut)], page: "travail" }
          : { titre: "Travail", lignes: ["Aucune mission pour l'instant."], page: "travail" },
    );
  });
</script>

{#if s.illisible}
  <div class="w"><p class="petit negatif">Données illisibles.</p></div>
{:else if !s.donnees}
  <div class="w"><p class="petit">Chargement…</p></div>
{:else}
  <button class="w lien" onclick={() => s.ouvrirPage("travail")} aria-label="Ouvrir Travail">
    <p class="etiquette">{encours ? "Mission en cours" : "Prochaine mission"}</p>
    {#if r}
      <div class="titre"><b>{r.titre}</b><span class="num net">{formatEuros(r.netCents)}</span></div>
      <Jauge pourcent={r.pourcent} gauche="{r.faits}/{r.total} jours" droite="{r.pourcent} %" label="Jours travaillés de la mission" />
    {:else if suivante}
      <div class="titre"><b>{suivante.titre}</b><span class="num net">{formatEuros(suivante.netCents)}</span></div>
      <span class="num petit">{dans(s.aujourdhui, suivante.debut)}</span>
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
