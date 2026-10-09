<script lang="ts">
  import { Icon } from "@etabli/ui";
  // Les agences : un nom, leurs cotisations et leur rythme de paie. Le taux horaire, le panier et le déplacement changent à chaque mission.
  import type { Session } from "../../src/session.svelte";

  interface Props {
    s: Session;
    onajouter: () => void;
    onmodifier: (id: string) => void;
  }

  let { s, onajouter, onmodifier }: Props = $props();
  const rythme = { fin: "paie à la fin de la mission", mois: "paie chaque mois", semaine: "paie chaque semaine" } as const;
  const taux = (bp: number | null) => (bp === null ? "cotisations des paramètres" : `cotisations ${(bp / 100).toFixed(1).replace(".", ",")} %`);
</script>

<section class="bloc">
  <div class="bloc-titre">
    <h3>Agences</h3>
    <button class="btn" onclick={onajouter}><Icon name="plus" size={16} /> Agence</button>
  </div>
  {#if s.donnees && s.donnees.agences.length > 0}
    <div class="puces">
      {#each s.donnees.agences as a (a.id)}
        <button class="puce" onclick={() => onmodifier(a.id)} aria-label="Modifier l'agence {a.nom}">
          <b>{a.nom}</b>
          <span>{taux(a.cotisationsBp)} · {rythme[a.rythme]}</span>
        </button>
      {/each}
    </div>
  {:else}
    <p class="petit" style="margin: 8px 0 0">Aucune agence. Une agence se résume à un nom et à son taux de cotisations ; ajoutez-en pour que ses missions utilisent ses cotisations et son rythme de paie.</p>
  {/if}
</section>

<style>
  .puces {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 10px;
  }
  .puce {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    padding: 7px 12px;
    border: 1px solid var(--border);
    border-radius: 10px;
    background: var(--surface-2);
    text-align: left;
    cursor: pointer;
  }
  .puce span {
    color: var(--muted);
    font-size: 12px;
  }
</style>