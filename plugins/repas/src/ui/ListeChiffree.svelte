<script lang="ts">
  // Une liste de courses chiffrée : le total dans chaque magasin (le moins cher pour toute la liste est conseillé), puis les articles avec leur prix
  // dans ce magasin. Un prix « estimé » n'a été vu nulle part : c'est l'estimation de l'IA.
  import { formatEuros } from "@etabli/ui/money";
  import type { Chiffrage } from "../prix";

  let { chiffrage, budgetCents = null }: { chiffrage: Chiffrage; budgetCents?: number | null } = $props();
  const depasse = $derived(budgetCents !== null && chiffrage.totalCents > budgetCents);
</script>

{#if chiffrage.totaux.length > 0}
  <div class="magasins" aria-label="Total par magasin">
    {#each chiffrage.totaux.slice(0, 4) as t, i (t.magasin)}
      <div class="magasin" class:conseille={i === 0}>
        <span class="petit">{i === 0 ? "Conseillé" : `${i + 1}e`}</span>
        <b>{t.magasin}</b>
        <span class="num">{formatEuros(t.totalCents)}</span>
        <span class="petit">{t.connues} prix vus sur {chiffrage.lignes.length}</span>
      </div>
    {/each}
  </div>
{:else}
  <p class="petit">Aucun prix connu pour ces articles : les montants sont des estimations. Scannez vos tickets (Courses) ou demandez à Max de relever des prix.</p>
{/if}

<table class="tableau">
  <thead><tr><th>Article</th><th class="num">Qté</th><th class="num">Prix</th></tr></thead>
  <tbody>
    {#each chiffrage.lignes as l (l.nom)}
      <tr>
        <td>{l.nom}{#if l.pour}<span class="petit pour">{l.pour}</span>{/if}</td>
        <td class="num">{l.unites}</td>
        <td class="num">
          {#if l.prixUnitaireCents === null}<span class="petit">?</span>{:else}{formatEuros(l.prixUnitaireCents * l.unites)}{#if l.estime}<span class="petit"> estimé</span>{/if}{/if}
        </td>
      </tr>
    {/each}
  </tbody>
</table>
<p class="total">
  Total {chiffrage.magasin ? `chez ${chiffrage.magasin}` : "estimé"} : <b class="num" class:negatif={depasse}>{formatEuros(chiffrage.totalCents)}</b>
  {#if budgetCents !== null}<span class="petit"> · budget {formatEuros(budgetCents)}{depasse ? " (dépassé)" : ""}</span>{/if}
</p>

<style>
  .magasins {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
    gap: 8px;
    margin-bottom: 12px;
  }
  .magasin {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 10px 12px;
    border-radius: var(--r-md);
    background: var(--field);
  }
  .magasin.conseille {
    background: var(--accent-soft);
    outline: 1.5px solid var(--accent);
  }
  .pour {
    display: block;
  }
  .total {
    margin: 10px 0 0;
    text-align: right;
  }
</style>
