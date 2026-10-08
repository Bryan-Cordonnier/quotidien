<script lang="ts">
  // Les lignes d'un type de contrat : « Poste — Entreprise », période, statut, net estimé, net par mois, bulletin reçu.
  import { Pastille } from "@etabli/ui";
  import { formatEuros } from "@etabli/ui/money";
  import { periodeCourte } from "../../src/affichage";
  import type { Ligne } from "../../src/vue";

  interface Props {
    lignes: Ligne[];
    /** Ouvre la saisie du bulletin reçu (mission ou réserve). */
    onbulletin: (ref: string) => void;
    /** Ouvre la modification d'une mission d'intérim. */
    onmodifier: (id: string) => void;
    onsupprimer: (ref: string) => void;
  }

  let { lignes, onbulletin, onmodifier, onsupprimer }: Props = $props();

  /** Une suppression se confirme par un second clic (4 secondes pour changer d'avis). */
  let aConfirmer = $state<string | null>(null);
  let minuteur: ReturnType<typeof setTimeout> | undefined;
  function supprimer(ref: string): void {
    if (aConfirmer === ref) {
      clearTimeout(minuteur);
      aConfirmer = null;
      onsupprimer(ref);
      return;
    }
    aConfirmer = ref;
    clearTimeout(minuteur);
    minuteur = setTimeout(() => (aConfirmer = null), 4000);
  }
  const libelleStatut = { prevu: "Prévue", encours: "En cours", termine: "Terminée" } as const;
  const tonStatut = { prevu: "info", encours: "bon", termine: "neutre" } as const;
</script>

<div class="tableau">
  <table>
    <thead>
      <tr><th>Mission</th><th>Période</th><th>Statut</th><th class="droite">Net estimé</th><th class="droite">Par mois</th><th class="droite">Bulletin</th><th></th></tr>
    </thead>
    <tbody>
      {#each lignes as l (l.ref)}
        <tr>
          <td class="titre"><b>{l.titre}</b></td>
          <td class="num">{periodeCourte(l.debut, l.fin)}</td>
          <td><Pastille ton={tonStatut[l.statut]}>{libelleStatut[l.statut]}</Pastille></td>
          <td class="droite num">{l.netCents === null ? "—" : formatEuros(l.netCents)}</td>
          <td class="droite num">{formatEuros(l.parMoisCents)}</td>
          <td class="droite">
            {#if l.ref.startsWith("contrat:") || l.statut === "prevu"}
              <span class="petit">—</span>
            {:else if l.bulletin}
              <span class="num">{formatEuros(l.bulletin.netCents)}</span> <button class="btn sm" onclick={() => onbulletin(l.ref)}>Modifier</button>
            {:else}
              <button class="btn sm" onclick={() => onbulletin(l.ref)}>+ Bulletin</button>
            {/if}
          </td>
          <td class="droite actions-ligne">
            {#if l.ref.startsWith("mission:")}<button class="btn sm" onclick={() => onmodifier(l.ref.slice(8))} aria-label="Modifier {l.titre}">Modifier</button>{/if}
            <button class="btn sm danger" onclick={() => supprimer(l.ref)} aria-label="Supprimer {l.titre}">{aConfirmer === l.ref ? "Confirmer ?" : "Supprimer"}</button>
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>

<style>
  /* Une ligne reste sur une seule ligne, sauf le titre : sur une fenêtre étroite, le tableau défile au lieu de s'écraser. */
  .tableau :global(td) {
    white-space: nowrap;
  }
  .tableau :global(td.titre) {
    min-width: 200px;
    white-space: normal;
  }
  .actions-ligne {
    white-space: nowrap;
  }
  .actions-ligne :global(.btn) {
    margin-left: 4px;
  }
</style>