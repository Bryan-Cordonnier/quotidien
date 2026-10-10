<script lang="ts">
  // Régler la course : le montant payé et le magasin. La liste est alors verrouillée pour toujours et le ticket entre dans le budget de la semaine.
  import { Icon, Modal } from "@etabli/ui";
  import { parseEuros } from "@etabli/ui/money";
  import { magasinsConnus } from "../../src/calculs";
  import { baseDePrix, estimerListe } from "../../src/prix";
  import { reglerListe } from "../../src/donnees";
  import type { Session } from "../../src/session.svelte";
  import ScanTicket from "../courses/ScanTicket.svelte";

  let { s, listeId, onclose }: { s: Session; listeId: string; onclose: () => void } = $props();

  const liste = $derived(s.donnees?.listes.find((l) => l.id === listeId));
  const magasins = $derived(s.donnees ? magasinsConnus(s.donnees) : []);
  // svelte-ignore state_referenced_locally
  // Le magasin proposé d'abord : le moins cher d'après nos tickets pour cette liste, sinon le plus fréquent.
  const conseille = s.donnees && liste ? estimerListe(liste.articles.map((a) => a.nom), baseDePrix(s.donnees)).conseille?.magasin : undefined;
  // svelte-ignore state_referenced_locally
  let magasin = $state(conseille ?? (s.donnees ? (magasinsConnus(s.donnees)[0] ?? "") : ""));
  let montant = $state("");
  let erreur = $state("");
  let manuel = $state(false);
  /** Photo choisie (appareil photo ou galerie) : le ticket est lu puis vérifié avant de régler la liste. */
  let photo = $state<File | null>(null);
  function choisi(event: Event): void {
    const entree = event.currentTarget as HTMLInputElement;
    photo = entree.files?.[0] ?? null;
    entree.value = "";
  }

  function regler(): void {
    erreur = "";
    const cents = parseEuros(montant);
    if (cents === null || cents <= 0) {
      erreur = "Le montant payé s'écrit comme 41,20.";
      return;
    }
    if (s.appliquer((d) => reglerListe(d, listeId, { jour: s.aujourdhui, montantCents: cents, magasin }).donnees)) onclose();
    else erreur = s.message;
  }
</script>

{#if photo}
  <ScanTicket {s} {listeId} fichier={photo} onclose={onclose} />
{:else}
  <Modal open titre="Régler « {liste?.nom ?? ''} »" {onclose} largeur={460}>
    {#if !manuel}
      <p class="petit" style="margin: 0">Une fois réglée, la liste n'est plus modifiable. Elle reste consultable dans l'historique, et le ticket entre dans le budget de la semaine.</p>
      <div class="choix">
        <label class="btn primary gros">
          <Icon name="camera" size={20} /> Scanner avec l'appareil photo
          <input type="file" accept="image/*" capture="environment" onchange={choisi} hidden />
        </label>
        <label class="btn gros">
          <Icon name="image" size={20} /> Scanner depuis la galerie
          <input type="file" accept="image/*" onchange={choisi} hidden />
        </label>
        <button class="btn gros" onclick={() => (manuel = true)}><Icon name="pencil" size={20} /> Régler manuellement</button>
      </div>
    {:else}
      <div class="groupe">
        <label for="r-montant">Montant payé (€)</label>
        <input id="r-montant" class="saisie num" bind:value={montant} inputmode="decimal" autocomplete="off" onkeydown={(e) => e.key === "Enter" && regler()} />
      </div>
      <div class="groupe">
        <label for="r-mag">Magasin</label>
        <input id="r-mag" class="saisie" list="r-magasins" bind:value={magasin} placeholder="Leclerc Drive" autocomplete="off" />
        <datalist id="r-magasins">{#each magasins as m (m)}<option value={m}></option>{/each}</datalist>
      </div>
      {#if erreur}<p class="negatif" role="alert">{erreur}</p>{/if}
    {/if}
    {#snippet pied()}
      {#if manuel}
        <button class="btn" onclick={() => (manuel = false)}>Retour</button>
        <button class="btn primary" onclick={regler}>Régler la course</button>
      {/if}
    {/snippet}
  </Modal>
{/if}

<style>
  .choix {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-top: 6px;
  }
  .gros {
    height: 52px;
    justify-content: center;
    font-size: 15px;
    cursor: pointer;
  }
</style>