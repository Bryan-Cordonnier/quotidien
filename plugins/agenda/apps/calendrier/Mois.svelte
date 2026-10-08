<script lang="ts">
  // Le mois : le nom entre deux flèches, au centre ; chaque jour est un rond avec son chiffre, une bordure sur aujourd'hui et la couleur
  // du contrat du jour. La légende ne montre que les contrats que vous avez.
  import { ajouterJours, decomposer, dernierDuMois, differenceJours, lundiDe, premierDuMois, type Jour } from "@etabli/ui/civil";
  import { occurrences } from "../../src/calculs";
  import type { Session } from "../../src/session.svelte";
  import { CONTRATS, type Contrat, type Occurrence } from "../../src/types";
  import { JOURS_COURTS, libelleMois } from "../../src/vue";

  interface Props {
    s: Session;
    choisi: Jour;
    reference: Jour;
    onchoisir: (jour: Jour) => void;
    onmois: (delta: number) => void;
  }

  let { s, choisi, reference, onchoisir, onmois }: Props = $props();

  const LIBELLES: Record<Contrat, string> = { interim: "Intérim", reserve: "Réserve", cdd: "CDD", cdi: "CDI" };
  const debut = $derived(lundiDe(premierDuMois(reference)));
  /** Les semaines pleines (lundi → dimanche) qui contiennent le mois : 4 à 6 lignes. */
  const jours = $derived.by(() => {
    const nb = Math.ceil((differenceJours(debut, dernierDuMois(reference)) + 1) / 7) * 7;
    return Array.from({ length: nb }, (_, i) => ajouterJours(debut, i));
  });
  const occ = $derived(s.carnet ? occurrences(s.carnet.evenements, jours[0]!, jours[jours.length - 1]!) : []);
  /** Le contrat d'un jour : celui de son événement de travail (un ancien événement « travail » sans contrat compte comme de l'intérim). */
  const contratDuJour = (j: Jour): Contrat | null => {
    const o = occ.find((x: Occurrence) => x.jour === j && (x.contrat !== null || x.type === "travail" || x.type === "retux"));
    return o ? (o.contrat ?? "interim") : null;
  };
  const presents = $derived(CONTRATS.filter((c) => s.carnet?.evenements.some((e) => (e.contrat ?? (e.type === "travail" || e.type === "retux" ? "interim" : null)) === c)));
</script>

<section class="bloc">
  <div class="nav">
    <button class="btn" onclick={() => onmois(-1)} aria-label="Mois précédent">‹</button>
    <h3>{libelleMois(reference)}</h3>
    <button class="btn" onclick={() => onmois(1)} aria-label="Mois suivant">›</button>
  </div>
  <div class="cal-zone">
  <div class="cal" role="grid" aria-label="Calendrier de {libelleMois(reference)}">
    {#each JOURS_COURTS as j (j)}<div class="jour-nom">{j}</div>{/each}
    {#each jours as j (j)}
      {@const c = contratDuJour(j)}
      <button
        class="rond {c ? 'k k-' + c : ''}"
        class:hors={decomposer(j).mois !== decomposer(reference).mois}
        class:auj={j === s.aujourdhui}
        aria-pressed={j === choisi}
        aria-label="{j}{c ? ', ' + LIBELLES[c] : ''}"
        onclick={() => onchoisir(j)}
      >{decomposer(j).jour}</button>
    {/each}
  </div>
  </div>
  {#if presents.length > 0}
    <div class="legende">
      {#each presents as c (c)}<span><i class="k-{c}"></i>{LIBELLES[c]}</span>{/each}
    </div>
  {/if}
</section>

<style>
  .nav {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
  }
  .nav h3 {
    min-width: 160px;
    margin: 0;
    font-size: 15px;
    text-align: center;
    text-transform: none;
  }
  .nav h3::first-letter {
    text-transform: uppercase;
  }
  /* Le bloc épouse le quadrillage : des ronds de 56 px au plus, avec le même écart entre colonnes et entre lignes, donc les mêmes marges tout autour. */
  .cal-zone {
    margin-top: 12px;
  }
  .cal {
    display: grid;
    grid-template-columns: repeat(7, minmax(0, 56px));
    gap: 10px;
    justify-content: center;
    justify-items: center;
  }
  .cal > * {
    width: 100%;
  }
  .jour-nom {
    color: var(--faint);
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.07em;
    text-transform: uppercase;
  }
  .rond {
    display: grid;
    place-items: center;
    aspect-ratio: 1;
    padding: 0;
    border: 3px solid transparent;
    border-radius: 50%;
    background: var(--surface-2);
    color: var(--text);
    font-family: var(--mono);
    font-size: 19px;
    font-weight: 600;
    cursor: pointer;
  }
  .rond.k {
    background: var(--kc);
    color: #fff;
  }
  .rond.hors {
    opacity: 0.4;
  }
  .rond.auj {
    border-color: var(--text);
  }
  .rond[aria-pressed="true"] {
    outline: 3px solid var(--accent-soft);
    box-shadow: 0 0 0 2px var(--accent);
  }
  .k-interim {
    --kc: var(--k-interim);
  }
  .k-reserve {
    --kc: var(--k-reserve);
  }
  .k-cdd {
    --kc: var(--k-cdd);
  }
  .k-cdi {
    --kc: var(--k-cdi);
  }
  .legende {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 16px;
    margin-top: 14px;
    color: var(--muted);
    font-size: 12.5px;
  }
  .legende span {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .legende i {
    width: 11px;
    height: 11px;
    border-radius: 50%;
    background: var(--kc);
  }
  @media (max-width: 640px) {
    .rond {
      font-size: 14px;
    }
  }
</style>