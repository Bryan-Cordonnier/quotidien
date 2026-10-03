<script lang="ts">
  import ChevronLeft from '@lucide/svelte/icons/chevron-left';
  import ChevronRight from '@lucide/svelte/icons/chevron-right';
  import { aujourdhui, grilleMois, JOURS_COURTS, MOIS } from '../lib/dates';
  import type { ISODate } from '../lib/types';

  interface Props {
    annee: number;
    mois: number;
    /** couleurs (variables CSS) des points affichés sous chaque date */
    marqueurs?: (date: ISODate) => string[];
    selectionnes?: ISODate[];
    actif?: ISODate | null;
    onclic: (date: ISODate) => void;
    onmois: (annee: number, mois: number) => void;
  }
  let { annee, mois, marqueurs = () => [], selectionnes = [], actif = null, onclic, onmois }: Props = $props();

  const jours = $derived(grilleMois(annee, mois));
  const auj = aujourdhui();

  function decaler(n: number) {
    const d = new Date(Date.UTC(annee, mois + n, 1));
    onmois(d.getUTCFullYear(), d.getUTCMonth());
  }
</script>

<div class="cal">
  <div class="ligne espace entete">
    <h2>{MOIS[mois]} {annee}</h2>
    <div class="ligne">
      <button class="btn icon ghost" aria-label="Mois précédent" onclick={() => decaler(-1)}><ChevronLeft size={18} /></button>
      <button class="btn ghost" onclick={() => onmois(Number(auj.slice(0, 4)), Number(auj.slice(5, 7)) - 1)}>Aujourd’hui</button>
      <button class="btn icon ghost" aria-label="Mois suivant" onclick={() => decaler(1)}><ChevronRight size={18} /></button>
    </div>
  </div>
  <div class="semaine">
    {#each JOURS_COURTS as j, i (i)}<span>{j}</span>{/each}
  </div>
  <div class="jours">
    {#each jours as d (d)}
      {@const hors = Number(d.slice(5, 7)) - 1 !== mois}
      <button
        class="jour"
        class:hors
        class:auj={d === auj}
        class:sel={selectionnes.includes(d)}
        class:actif={d === actif}
        data-date={d}
        aria-label={d}
        aria-pressed={selectionnes.includes(d) || d === actif}
        onclick={() => onclic(d)}
      >
        <span class="num">{Number(d.slice(8, 10))}</span>
        <span class="points">
          {#each marqueurs(d) as c, i (i)}<i style:background={c}></i>{/each}
        </span>
      </button>
    {/each}
  </div>
</div>

<style>
  .entete { margin-bottom: 12px; flex-wrap: wrap; gap: 6px; }
  h2 { text-transform: capitalize; font-size: 1.15rem; }
  .semaine, .jours { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 4px; }
  .semaine span { text-align: center; font-size: .75rem; color: var(--muted); padding: 4px 0; }
  .jour {
    position: relative; min-width: 0; padding: 0; aspect-ratio: 1 / 0.9; min-height: 44px;
    background: var(--surface-2); border: 1px solid transparent; border-radius: 10px;
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px;
    transition: transform .12s ease, background .15s ease, border-color .15s ease;
  }
  .jour:hover { background: var(--surface-3); }
  .jour:active { transform: scale(.94); }
  .jour.hors { opacity: .35; }
  .jour.auj .num { color: var(--accent); font-weight: 700; }
  .jour.sel { background: color-mix(in srgb, var(--accent) 28%, var(--surface-2)); border-color: var(--accent); }
  .jour.actif { border-color: var(--text); }
  .num { font-size: .95rem; font-variant-numeric: tabular-nums; }
  .points { display: flex; gap: 3px; height: 6px; }
  .points i { width: 6px; height: 6px; border-radius: 50%; display: block; }
</style>
