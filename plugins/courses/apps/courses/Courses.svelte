<script lang="ts">
  // Courses : le budget de la semaine, la moyenne par mois, les dernières semaines et les derniers tickets.
  import { Entete } from "@etabli/ui";
  import { Session } from "../../src/session.svelte";
  import BudgetSemaine from "./BudgetSemaine.svelte";
  import MoyenneMois from "./MoyenneMois.svelte";
  import Semaines from "./Semaines.svelte";
  import Tickets from "./Tickets.svelte";

  const s = new Session();
  void s.demarrer();
</script>

<div class="page-plugin">
  <Entete titre="Courses">
    {#snippet actions()}<button class="btn" onclick={() => s.ouvrirParametres()}>Paramètres</button>{/snippet}
  </Entete>

  {#if s.illisible}
    <section class="bloc">
      <p class="etiquette">Données illisibles</p>
      <p class="negatif">{s.illisible}</p>
      <p class="petit">Les données n'ont pas été touchées. Rien ne s'enregistre tant qu'elles ne peuvent pas être lues.</p>
    </section>
  {:else if s.donnees}
    <div class="grille-2-1">
      <BudgetSemaine {s} />
      <MoyenneMois {s} />
    </div>
    <div class="grille-2 egaux">
      <Semaines {s} />
      <Tickets {s} />
    </div>
    {#if s.rapport && s.rapport.message}<p class="petit" role="status">{s.rapport.message}</p>{/if}
    {#if s.message}<p class="negatif" role="alert">{s.message}</p>{/if}
  {:else}
    <p class="petit">Chargement…</p>
  {/if}
</div>

<style>
  /* Les deux blocs du bas ont la même hauteur : celui qui est plus court s'étire. */
  .egaux > :global(.bloc) {
    display: flex;
    flex-direction: column;
  }
</style>