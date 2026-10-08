<script lang="ts">
  // Une agence : son nom, ses cotisations (vide : celles des paramètres) et son rythme de paie.
  import { Modal, Segmented } from "@etabli/ui";
  import { parseTaux } from "@etabli/ui/money";
  import { ajouterAgence, modifierAgence, supprimerAgence } from "../../src/donnees";
  import type { Session } from "../../src/session.svelte";
  import type { RythmePaie } from "../../src/types";

  interface Props {
    s: Session;
    /** Absent : nouvelle agence. */
    id?: string;
    onclose: () => void;
  }

  let { s, id, onclose }: Props = $props();

  // svelte-ignore state_referenced_locally
  const existante = id ? s.donnees?.agences.find((a) => a.id === id) : undefined;
  let nom = $state(existante?.nom ?? "");
  let cotisations = $state(existante?.cotisationsBp != null ? String(existante.cotisationsBp / 100).replace(".", ",") : "");
  let rythme = $state<RythmePaie>(existante?.rythme ?? "fin");
  let erreur = $state("");

  function enregistrer(): void {
    erreur = "";
    const bp = cotisations.trim() === "" ? null : parseTaux(cotisations);
    if (cotisations.trim() !== "" && (bp === null || bp < 0 || bp > 6000)) {
      erreur = "Les cotisations s'écrivent comme 22 ou 21,5 (entre 0 et 60 %), ou restent vides.";
      return;
    }
    const brut = { nom, cotisationsBp: bp, rythme };
    if (s.appliquer((d) => (id ? modifierAgence(d, id, brut) : ajouterAgence(d, brut).donnees))) onclose();
    else erreur = s.message;
  }

  function supprimer(): void {
    if (id && s.appliquer((d) => supprimerAgence(d, id))) onclose();
  }
</script>

<Modal open titre={id ? "Modifier l'agence" : "Nouvelle agence"} {onclose} largeur={460}>
  <div class="groupe">
    <label for="ag-nom">Nom</label>
    <input id="ag-nom" class="saisie" bind:value={nom} placeholder="Interim Plus" autocomplete="off" />
  </div>
  <div class="groupe">
    <label for="ag-cot">Cotisations salariales (%)</label>
    <input id="ag-cot" class="saisie num" bind:value={cotisations} placeholder="vide : celles des paramètres" autocomplete="off" inputmode="decimal" />
  </div>
  <div class="groupe">
    <span class="petit" id="ag-rythme">Rythme de paie</span>
    <Segmented
      label="Rythme de paie"
      options={[{ value: "fin", label: "À la fin de la mission" }, { value: "mois", label: "Chaque mois" }, { value: "semaine", label: "Chaque semaine" }]}
      bind:value={rythme}
    />
  </div>
  {#if erreur}<p class="negatif" role="alert">{erreur}</p>{/if}
  {#snippet pied()}
    <button class="btn primary" onclick={enregistrer}>{id ? "Enregistrer" : "Ajouter l'agence"}</button>
    {#if id}<button class="btn danger" onclick={supprimer}>Supprimer l'agence</button>{/if}
  {/snippet}
</Modal>