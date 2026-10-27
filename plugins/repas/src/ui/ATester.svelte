<script lang="ts">
  // « Tu as fait … ? » : les recettes mises dans une liste de courses réglée, dont le repas est passé. Une note (1 à 5) la marque
  // « Testée » ; « Pas faite » ne redemande plus. Une carte discrète, jamais une fenêtre qui bloque.
  import type { Session } from "../session.svelte";

  let { s }: { s: Session } = $props();
  const maintenant = new Date();
  const recettes = $derived(s.aDemander(maintenant.getHours() * 60 + maintenant.getMinutes()));
</script>

{#each recettes as r (r.id)}
  <section class="bloc a-tester" aria-label="Recette à noter">
    {#if r.photo}<img src={r.photo} alt="" />{/if}
    <div class="texte">
      <b>Tu as fait « {r.nom} » ?</b>
      <span class="petit">Note-la : tu sauras ce que tu aimes.</span>
      <div class="actions">
        <span class="etoiles" role="group" aria-label="Ma note">
          {#each [1, 2, 3, 4, 5] as n (n)}
            <button class="etoile" onclick={() => s.repondreTeste(r.id, n)} aria-label="Faite, {n} étoile{n > 1 ? 's' : ''}">★</button>
          {/each}
        </span>
        <button class="btn sm" onclick={() => s.repondreTeste(r.id, null)}>Pas faite</button>
      </div>
    </div>
  </section>
{/each}

<style>
  .a-tester {
    display: flex;
    gap: 12px;
    align-items: center;
  }
  .a-tester img {
    width: 64px;
    height: 64px;
    object-fit: cover;
    border-radius: var(--r-md, 8px);
  }
  .texte {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .actions {
    display: flex;
    gap: 10px;
    align-items: center;
    flex-wrap: wrap;
  }
  .etoile {
    border: 0;
    background: none;
    font-size: 24px;
    color: var(--border);
    cursor: pointer;
    padding: 0 2px;
  }
  /* survoler une étoile allume aussi celles d'avant */
  .etoiles:hover .etoile {
    color: #f2c14e;
  }
  .etoile:hover ~ .etoile {
    color: var(--border);
  }
</style>
