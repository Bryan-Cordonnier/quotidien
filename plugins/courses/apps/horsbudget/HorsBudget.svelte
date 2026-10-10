<script lang="ts">
  // Réglages du plugin → « Tickets hors budget » : on scanne à la chaîne des tickets (les siens ou ceux d'amis) uniquement pour garder
  // les articles et leurs prix. Rien ne compte dans le budget. Chaque ticket est vérifié avant d'être gardé.
  import { Entete, Icon } from "@etabli/ui";
  import { Session } from "../../src/session.svelte";
  import ScanTicket from "../courses/ScanTicket.svelte";

  const s = new Session();
  void s.demarrer();

  let photo = $state<File | null>(null);
  let gardes = $state(0);
  const horsBudget = $derived(s.donnees ? s.donnees.tickets.filter((t) => t.horsBudget) : []);
  const lignes = $derived(horsBudget.reduce((n, t) => n + t.articles.length, 0));

  function choisi(event: Event): void {
    const entree = event.currentTarget as HTMLInputElement;
    photo = entree.files?.[0] ?? null;
    entree.value = "";
  }
</script>

<div class="page-plugin">
  <Entete titre="Tickets hors budget" />
  <section class="bloc">
    <p class="etiquette">Agrandir la base de prix</p>
    <p class="petit" style="margin: 0 0 14px">
      Scannez des tickets qui ne sont pas les vôtres ou que vous ne voulez pas compter : seuls les articles et leurs prix sont gardés, pour estimer le magasin le moins cher. Vérifiez chaque ticket avant de le garder.
    </p>
    <div class="actions">
      <label class="btn primary gros"><Icon name="camera" size={20} /> Scanner avec l'appareil photo<input type="file" accept="image/*" capture="environment" onchange={choisi} hidden /></label>
      <label class="btn gros"><Icon name="image" size={20} /> Scanner depuis la galerie<input type="file" accept="image/*" onchange={choisi} hidden /></label>
    </div>
    {#if gardes > 0}<p class="positif" role="status" style="margin: 12px 0 0">{gardes} ticket{gardes > 1 ? "s" : ""} gardé{gardes > 1 ? "s" : ""} pendant cette séance.</p>{/if}
  </section>
  <section class="bloc">
    <p class="etiquette">Déjà gardés</p>
    <p style="margin: 0">{horsBudget.length} ticket{horsBudget.length > 1 ? "s" : ""} hors budget, {lignes} article{lignes > 1 ? "s" : ""} pour les prix.</p>
  </section>
  {#if s.message}<p class="negatif" role="alert">{s.message}</p>{/if}
  {#if photo}
    <ScanTicket {s} horsBudget fichier={photo} onclose={() => (photo = null)} onenregistre={() => ((photo = null), (gardes += 1))} />
  {/if}
</div>

<style>
  .actions {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .gros {
    height: 52px;
    justify-content: center;
    font-size: 15px;
    cursor: pointer;
  }
  @media (min-width: 640px) {
    .actions {
      flex-direction: row;
    }
  }
</style>