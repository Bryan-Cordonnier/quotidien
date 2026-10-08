<script lang="ts">
  // Widget de l'accueil : l'estimé de la vie courante et jusqu'à quand je tiens, en un coup d'œil.
  import { decomposer, differenceJours } from "@etabli/ui/civil";
  import { formatEuros } from "@etabli/ui/money";
  import { Session } from "../../src/session.svelte";

  const s = new Session();
  void s.demarrer();

  const MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
  const court = (j: string): string => `${decomposer(j).jour} ${MOIS[decomposer(j).mois - 1]}`;
  const euros = (c: number): string => `${c < 0 ? "− " : ""}${formatEuros(Math.abs(c))}`;
  const jours = $derived(s.tient ? differenceJours(s.aujourdhui, s.tient) : null);
</script>

<div class="widget">
  {#if s.illisible}
    <p class="petit negatif">Données illisibles.</p>
  {:else if !s.charge}
    <p class="petit">Chargement…</p>
  {:else if s.sansFinances}
    <p class="petit">Finances n'est pas disponible.</p>
  {:else}
    <p class="etiquette">Estimé · vie courante</p>
    <div class="grand num" class:negatif={s.estime.vie < 0}>{euros(s.estime.vie)}</div>
    <p class="petit">
      {#if s.tient && jours !== null}
        <span class="negatif">{jours === 0 ? "Sous le seuil aujourd'hui" : `Je tiens ${jours} jour${jours > 1 ? "s" : ""}`}</span> · dès le {court(s.tient)}
      {:else}
        Au-dessus du seuil jusqu'au {court(s.courbe.at(-1)?.jour ?? s.aujourdhui)}
      {/if}
    </p>
  {/if}
</div>

<style>
  .widget {
    height: 100vh;
    box-sizing: border-box;
    padding: 14px 16px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 4px;
  }
  .grand {
    font-size: 30px;
    font-weight: 600;
    line-height: 1.1;
  }
</style>
