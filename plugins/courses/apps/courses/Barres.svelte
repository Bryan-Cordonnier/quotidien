<script lang="ts">
  // Les semaines en colonnes : le total au sommet de chaque colonne (dedans, pour ne pas être coupé par la ligne du budget), la ligne
  // pointillée du budget, la semaine en cours en couleur d'accent et les semaines au-dessus du budget en rouge.
  import { jourMois } from "../../src/affichage";
  import type { SemaineTotal } from "../../src/calculs";

  interface Props {
    semaines: SemaineTotal[];
    budgetCents: number;
    /** Hauteur de la zone des colonnes, en pixels. */
    hauteur?: number;
  }

  let { semaines, budgetCents, hauteur = 190 }: Props = $props();
  const max = $derived(Math.max(budgetCents * 1.25, ...semaines.map((x) => x.totalCents), 1));
</script>

<div class="barres" style:height={hauteur ? `${hauteur}px` : undefined} role="img" aria-label="Dépenses par semaine, budget {Math.round(budgetCents / 100)} euros">
  {#each semaines as x, i (x.lundi)}
    <div class="colonne">
      <i class:cour={i === semaines.length - 1} class:depasse={i !== semaines.length - 1 && x.totalCents > budgetCents} style:height="{(x.totalCents / max) * 100}%">
        {#if x.totalCents > 0}{Math.round(x.totalCents / 100)}{/if}
      </i>
      <small>{i === semaines.length - 1 ? "cette sem." : `du ${jourMois(x.lundi)}`}</small>
    </div>
  {/each}
  <div class="limite" style:bottom="calc(22px + (100% - 22px) * {budgetCents / max})"><span>budget {Math.round(budgetCents / 100)} €</span></div>
</div>

<style>
  .barres {
    position: relative;
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: minmax(0, 1fr);
    align-items: end;
    gap: 10px;
    min-height: 170px;
    padding-bottom: 22px;
  }
  .colonne {
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    align-items: center;
    height: 100%;
  }
  i {
    display: flex;
    align-items: flex-start;
    justify-content: center;
    width: min(46px, 70%);
    padding-top: 5px;
    border-radius: 6px 6px 2px 2px;
    background: var(--warn);
    color: #fff;
    font-family: var(--mono);
    font-size: 11px;
    font-style: normal;
    font-weight: 600;
  }
  i.cour {
    background: var(--accent);
  }
  i.depasse {
    background: var(--err);
  }
  small {
    position: absolute;
    bottom: -20px;
    color: var(--muted);
    font-size: 11px;
    white-space: nowrap;
  }
  .limite {
    position: absolute;
    left: 0;
    right: 0;
    border-top: 2px dashed var(--border);
    pointer-events: none;
  }
  .limite span {
    position: absolute;
    right: 0;
    top: -18px;
    padding: 0 4px;
    background: var(--surface);
    color: var(--muted);
    font-size: 11px;
  }
</style>