<script lang="ts">
  // Un onglet : les trois derniers contrats du type, « Voir tout l'historique » pour les autres, et la précision moyenne des estimations.
  import { supprimerContrat, supprimerMission, supprimerReserve } from "../../src/donnees";
  import type { Session } from "../../src/session.svelte";
  import { lignes as lignesDe, ONGLETS, type Onglet } from "../../src/vue";
  import TableauLignes from "./TableauLignes.svelte";

  interface Props {
    s: Session;
    onglet: Onglet;
    precision: number | null;
    titreBouton: string;
    onnouveau: () => void;
    onhistorique: () => void;
    onbulletin: (ref: string) => void;
    onmodifier: (id: string) => void;
  }

  let { s, onglet, precision, titreBouton, onnouveau, onhistorique, onbulletin, onmodifier }: Props = $props();

  const toutes = $derived(s.donnees ? lignesDe(s.donnees, s.reglages, onglet, s.aujourdhui) : []);
  const titre = $derived(ONGLETS.find((o) => o.id === onglet)?.label ?? "");

  function supprimer(ref: string): void {
    const [type, id = ""] = ref.split(":");
    s.appliquer((d) => (type === "mission" ? supprimerMission(d, id) : type === "reserve" ? supprimerReserve(d, id) : supprimerContrat(d, id)));
  }
</script>

<section class="bloc">
  <div class="bloc-titre">
    <h3>{titre}</h3>
    <div class="actions">
      {#if toutes.length > 3}<button class="btn" onclick={onhistorique}>Voir tout l'historique ({toutes.length})</button>{/if}
      <button class="btn primary" onclick={onnouveau}>{titreBouton}</button>
    </div>
  </div>
  {#if toutes.length === 0}
    <div class="vide" style="margin-top: 10px">
      <b>Aucun contrat {titre}</b>
      <span>N'ajoutez que des contrats signés : leur statut suit les dates.</span>
    </div>
  {:else}
    <div style="margin-top: 8px">
      <TableauLignes lignes={toutes.slice(0, 3)} {onbulletin} {onmodifier} onsupprimer={supprimer} />
    </div>
  {/if}
  {#if precision !== null}
    <p class="petit" style="margin: 10px 0 0">
      Précision moyenne de vos estimations : <b class="num">{(precision * 100).toFixed(1).replace(".", ",")} %</b>
    </p>
  {/if}
</section>