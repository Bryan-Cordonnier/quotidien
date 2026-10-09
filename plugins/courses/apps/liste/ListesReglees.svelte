<script lang="ts">
  // Les listes réglées : les trois dernières, « Voir tout l'historique », « Consulter » (lecture seule, la liste ne change plus).
  import { Modal, Icon } from "@etabli/ui";
  import { formatEuros } from "@etabli/ui/money";
  import { jourMois } from "../../src/affichage";
  import type { Session } from "../../src/session.svelte";
  import type { Liste } from "../../src/types";

  let { s: _s, listes }: { s: Session; listes: Liste[] } = $props();

  let historique = $state(false);
  let vue = $state<string | null>(null);
  const consultee = $derived(listes.find((l) => l.id === vue));
</script>

{#snippet tableau(liste: Liste[])}
  <div class="tableau">
    <table>
      <thead><tr><th>Date</th><th>Liste</th><th>Magasin</th><th class="droite">Articles</th><th class="droite">Payé</th><th></th></tr></thead>
      <tbody>
        {#each liste as l (l.id)}
          <tr>
            <td class="num">{jourMois(l.reglement!.jour)}</td>
            <td><b>{l.nom}</b></td>
            <td>{l.reglement!.magasin}</td>
            <td class="droite num">{l.articles.length}</td>
            <td class="droite num">{formatEuros(l.reglement!.montantCents)}</td>
            <td class="droite"><button class="btn sm" onclick={() => (vue = l.id)}>Consulter</button></td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{/snippet}

<section class="bloc">
  <div class="bloc-titre">
    <h3>Listes réglées</h3>
    {#if listes.length > 3}<button class="btn" onclick={() => (historique = true)}>Voir tout l'historique ({listes.length})</button>{/if}
  </div>
  {#if listes.length === 0}
    <div class="vide" style="margin-top: 10px">Aucune liste réglée pour l'instant.</div>
  {:else}
    <div style="margin-top: 8px">{@render tableau(listes.slice(0, 3))}</div>
  {/if}
</section>

<Modal open={historique && vue === null} titre="Listes réglées" onclose={() => (historique = false)} largeur={860}>
  {@render tableau(listes)}
</Modal>

<Modal open={consultee !== undefined} titre={consultee?.nom ?? ""} onclose={() => (vue = null)} largeur={520}>
  {#if consultee?.reglement}
    <p class="petit num" style="margin: 0">Réglée le {jourMois(consultee.reglement.jour)} · {consultee.reglement.magasin} · {formatEuros(consultee.reglement.montantCents)} · {consultee.articles.length} articles. Elle n'est plus modifiable.</p>
    <ul class="articles">
      {#each consultee.articles as a (a.id)}<li class:pris={a.pris}><span class="puce" aria-hidden="true">{#if a.pris}<Icon name="check" size={14} />{:else}·{/if}</span>{a.nom}</li>{/each}
    </ul>
  {/if}
</Modal>

<style>
  .articles {
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .articles li {
    display: flex;
    gap: 10px;
    padding: 6px 2px;
    border-bottom: 1px solid var(--border);
    color: var(--muted);
  }
  .articles li.pris {
    color: var(--text);
  }
  .puce {
    display: inline-grid;
    place-items: center;
    width: 16px;
    color: var(--ok);
  }
</style>