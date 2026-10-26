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
  let jourPaie = $state(existante?.jourPaie != null ? String(existante.jourPaie) : "");
  let erreur = $state("");

  function enregistrer(): void {
    erreur = "";
    const bp = cotisations.trim() === "" ? null : parseTaux(cotisations);
    if (cotisations.trim() !== "" && (bp === null || bp < 0 || bp > 6000)) {
      erreur = "Les cotisations s'écrivent comme 22 ou 21,5 (entre 0 et 60 %), ou restent vides.";
      return;
    }
    const jp = jourPaie.trim() === "" ? null : Number(jourPaie);
    if (jp !== null && (!Number.isInteger(jp) || jp < 1 || jp > 28)) {
      erreur = "Le jour de paie est un jour du mois entre 1 et 28 (ou vide).";
      return;
    }
    const brut = { nom, cotisationsBp: bp, rythme, jourPaie: jp };
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
  <div class="groupe">
    <label for="ag-jour">Jour de paie (du mois)</label>
    <input id="ag-jour" class="saisie num" bind:value={jourPaie} placeholder="12 (vide : quelques jours après la fin)" inputmode="numeric" autocomplete="off" />
    <span class="petit">Le jour où l'agence paie, le mois qui suit le travail. Règle-le à ta première paie.</span>
  </div>
  {#if erreur}<p class="negatif" role="alert">{erreur}</p>{/if}
  {#snippet pied()}
    <button class="btn primary" onclick={enregistrer}>{id ? "Enregistrer" : "Ajouter l'agence"}</button>
    {#if id}<button class="btn danger" onclick={supprimer}>Supprimer l'agence</button>{/if}
  {/snippet}
</Modal>