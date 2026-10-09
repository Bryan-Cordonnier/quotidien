<script lang="ts">
  // Les widgets de Courses sur l'accueil : le budget de la semaine, et les listes en cours (un clic ouvre « Liste de courses » en grand).
  import { Jauge } from "@etabli/ui";
  import { formatEuros } from "@etabli/ui/money";
  import { budgetDisponible } from "../../src/calculs";
  import { listesEnCours } from "../../src/donnees";
  import { Session } from "../../src/session.svelte";

  const id = /^#widget=([a-z0-9-]+)/.exec(location.hash)?.[1] ?? "budget";
  const s = new Session();
  void s.demarrer();

  const b = $derived(s.donnees ? budgetDisponible(s.donnees, s.reglages, s.aujourdhui) : null);
  const listes = $derived(s.donnees ? listesEnCours(s.donnees) : []);
</script>

{#if s.illisible}
  <div class="w"><p class="petit negatif">Données illisibles.</p></div>
{:else if !s.donnees}
  <div class="w"><p class="petit">Chargement…</p></div>
{:else if id === "liste"}
  <button class="w lien haut" onclick={() => s.ouvrirPage("liste")} aria-label="Ouvrir la liste de courses">
    <p class="etiquette">Liste de courses</p>
    {#if listes.length === 0}
      <p class="petit">Aucune liste en cours. Touchez pour en créer une.</p>
    {:else}
      <ul class="liste">
        {#each listes as l (l.id)}
          <li><b>{l.nom}</b><span class="num petit">{l.articles.filter((a) => a.pris).length}/{l.articles.length}</span></li>
        {/each}
      </ul>
    {/if}
  </button>
{:else if b}
  <button class="w lien" onclick={() => s.ouvrirPage("courses")} aria-label="Ouvrir Courses">
    <p class="etiquette">Courses · budget disponible</p>
    <div class="grand num" class:attention={b.niveau === "attention"} class:alerte={b.niveau === "alerte"}>{b.disponibleCents < 0 ? "− " : ""}{formatEuros(Math.abs(b.disponibleCents))}</div>
    <Jauge pourcent={b.pourcent} niveau={b.niveau === "alerte" ? "alerte" : b.niveau === "attention" ? "attention" : "normal"} gauche="{formatEuros(b.depenseCents)} dépensés" droite="{Math.round(b.pourcent)} %" label="Part du budget dépensée" />
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
  .attention {
    color: var(--warn);
  }
  .alerte {
    color: var(--err);
  }

  .liste {
    list-style: none;
    margin: 6px 0 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .liste li {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    padding: 8px 10px;
    border-radius: 10px;
    background: var(--surface-2);
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
  }
  @media (max-width: 260px) {
    .grand {
      font-size: 22px;
    }
  }
</style>
