<script lang="ts">
  // Tout l'historique d'un type de contrat, dans une fenêtre sur voile (comme l'aperçu rapide).
  import { Modal } from "@etabli/ui";
  import { supprimerContrat, supprimerMission, supprimerReserve } from "../../src/donnees";
  import type { Session } from "../../src/session.svelte";
  import { lignes as lignesDe, ONGLETS, type Onglet } from "../../src/vue";
  import TableauLignes from "./TableauLignes.svelte";

  interface Props {
    s: Session;
    onglet: Onglet;
    onclose: () => void;
    onbulletin: (ref: string) => void;
    onmodifier: (id: string) => void;
  }

  let { s, onglet, onclose, onbulletin, onmodifier }: Props = $props();

  const toutes = $derived(s.donnees ? lignesDe(s.donnees, s.reglages, onglet, s.aujourdhui) : []);
  const titre = $derived(ONGLETS.find((o) => o.id === onglet)?.label ?? "");

  function supprimer(ref: string): void {
    const [type, id = ""] = ref.split(":");
    s.appliquer((d) => (type === "mission" ? supprimerMission(d, id) : type === "reserve" ? supprimerReserve(d, id) : supprimerContrat(d, id)));
  }
</script>

<Modal open titre="Historique — {titre}" {onclose} largeur={960}>
  <TableauLignes lignes={toutes} {onbulletin} {onmodifier} onsupprimer={supprimer} />
</Modal>