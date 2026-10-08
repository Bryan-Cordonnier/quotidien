<script lang="ts">
  // Un CDD ou un CDI signé : le brut mensuel, les dates et le jour de la paie.
  import { Modal } from "@etabli/ui";
  import { ajouterJours, jourDeInstant } from "@etabli/ui/civil";
  import { apresPrelevement, formatEuros, parseEuros } from "@etabli/ui/money";
  import { ajouterContrat } from "../../src/donnees";
  import type { Session } from "../../src/session.svelte";

  let { s, type, onclose }: { s: Session; type: "cdd" | "cdi"; onclose: () => void } = $props();

  const aujourdhui = jourDeInstant(Date.now());
  let poste = $state("");
  let entreprise = $state("");
  let brut = $state("");
  let debut = $state(aujourdhui);
  let fin = $state(ajouterJours(aujourdhui, 180));
  let jourDePaie = $state("28");
  let erreur = $state("");

  const mensuel = $derived.by(() => {
    const b = parseEuros(brut);
    return b !== null && b > 0 ? apresPrelevement(b, s.reglages.cotisationsBp) : null;
  });

  function enregistrer(): void {
    erreur = "";
    const b = parseEuros(brut);
    if (b === null || b <= 0) {
      erreur = "Le brut mensuel s'écrit comme 2 000 ou 2000,00.";
      return;
    }
    const donnees = { libelle: poste, entreprise, type, brutMensuelCents: b, debut, jourDePaie: Number(jourDePaie) || 28, ...(type === "cdd" ? { fin } : {}) };
    if (s.appliquer((d) => ajouterContrat(d, donnees).donnees)) onclose();
    else erreur = s.message;
  }
</script>

<Modal open titre="Nouveau {type.toUpperCase()}" {onclose} largeur={520}>
  <div class="deux">
    <div class="groupe"><label for="c-poste">Poste</label><input id="c-poste" class="saisie" bind:value={poste} autocomplete="off" /></div>
    <div class="groupe"><label for="c-ent">Entreprise</label><input id="c-ent" class="saisie" bind:value={entreprise} autocomplete="off" /></div>
  </div>
  <div class="deux">
    <div class="groupe"><label for="c-brut">Brut mensuel (€)</label><input id="c-brut" class="saisie num" bind:value={brut} placeholder="2000" inputmode="decimal" autocomplete="off" /></div>
    <div class="groupe"><label for="c-jp">Jour de paie dans le mois</label><input id="c-jp" class="saisie num" bind:value={jourDePaie} inputmode="numeric" autocomplete="off" /></div>
  </div>
  <div class="deux">
    <div class="groupe"><label for="c-deb">Début</label><input id="c-deb" class="saisie" type="date" bind:value={debut} /></div>
    {#if type === "cdd"}<div class="groupe"><label for="c-fin">Fin</label><input id="c-fin" class="saisie" type="date" bind:value={fin} /></div>{/if}
  </div>
  {#if mensuel !== null}<p style="margin: 0">Net estimé par mois : <b class="num">{formatEuros(mensuel)}</b></p>{/if}
  {#if erreur}<p class="negatif" role="alert">{erreur}</p>{/if}
  {#snippet pied()}<button class="btn primary" onclick={enregistrer}>Ajouter le contrat</button>{/snippet}
</Modal>