<script lang="ts">
  import { addDays, aujourdhui } from '../lib/dates';
  import { genererIcs } from '../lib/ics';
  import { store } from '../lib/store.svelte';

  function exporterIcs() {
    const debut = aujourdhui();
    const ics = genererIcs(store.donnees, debut, addDays(debut, 365));
    const lien = document.createElement('a');
    lien.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
    lien.download = 'budget-planning.ics';
    lien.click();
    URL.revokeObjectURL(lien.href);
  }

  const r = store.donnees.reglages;
  const champs: { cle: keyof typeof r; label: string; unite: string; pas?: number }[] = [
    { cle: 'margeArriveeMissionMin', label: 'Marge d’avance à l’arrivée (mission)', unite: 'min' },
    { cle: 'miseEnRouteMin', label: 'Mise en route (chaussures, clés, voiture, GPS)', unite: 'min' },
    { cle: 'preparationMin', label: 'Préparation (douche, habillage, petit-déjeuner)', unite: 'min' },
    { cle: 'sommeilMin', label: 'Durée de sommeil cible', unite: 'min', pas: 15 },
    { cle: 'endormissementMin', label: 'Temps d’endormissement', unite: 'min' },
    { cle: 'majorationTrajetPct', label: 'Majoration des trajets (heures de pointe)', unite: '%' },
    { cle: 'preAlerteMin', label: 'Pré-alerte avant de partir', unite: 'min' },
    { cle: 'rappelCoucherMin', label: 'Rappel avant l’heure de coucher', unite: 'min' },
    { cle: 'cotisationsPct', label: 'Cotisations salariales estimées', unite: '%' },
  ];
</script>

<section class="vue anim">
  <h1>Réglages</h1>
  <form class="card form" onsubmit={(e) => e.preventDefault()} data-testid="form-reglages">
    {#each champs as c (c.cle)}
      <label class="champ">
        {c.label} ({c.unite})
        <input type="number" min="0" step={c.pas ?? 1} bind:value={store.donnees.reglages[c.cle]} onchange={() => store.sauver()} />
      </label>
    {/each}
  </form>
  <div class="card export">
    <h3>Rappels sur le téléphone</h3>
    <p class="muted">Exporte tes événements et leurs alarmes (coucher, réveil, départ) vers l’app Calendrier du téléphone. Filet de sécurité en attendant les alarmes natives.</p>
    <button class="btn" onclick={exporterIcs} data-testid="export-ics">Exporter le calendrier (.ics)</button>
  </div>
  <p class="muted note">Le taux de cotisations est une estimation standard (22 %) à remplacer après ton premier bulletin de paie.</p>
</section>

<style>
  h1 { margin-bottom: 16px; }
  .form { display: grid; gap: 14px; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); }
  .note { margin-top: 12px; }
  .export { margin-top: 16px; display: grid; gap: 10px; justify-items: start; }
</style>
