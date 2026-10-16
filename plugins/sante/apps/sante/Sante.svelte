<script lang="ts">
  // Santé : vos objectifs pour l'alimentation (calories, protéines, but, régime, allergies, goûts). Ils sont publiés pour Repas et recettes, qui en
  // tient compte pour concocter les repas. Rien n'est calculé ici pour l'instant : la suite (suivi, poids…) viendra plus tard.
  import { Entete, PluginSettings } from "@etabli/ui";
  import { BUTS, nettoyer, OBJECTIFS_DEFAUT, REGIMES } from "../../src/objectifs";

  const objectifs = new PluginSettings(OBJECTIFS_DEFAUT, nettoyer, "sante");
</script>

<div class="page-plugin">
  <Entete titre="Santé" />
  <section class="bloc">
    <p class="bloc-titre">Mes objectifs pour l'alimentation</p>
    <p class="petit">Repas et recettes en tient compte quand il concocte vos repas. Laissez 0 si vous ne savez pas.</p>
    <div class="deux">
      <div class="groupe"><label for="s-cal">Calories par jour</label><input id="s-cal" class="saisie num" type="number" min="0" max="10000" step="50" bind:value={objectifs.data.caloriesJour} /></div>
      <div class="groupe"><label for="s-pro">Protéines par jour (g)</label><input id="s-pro" class="saisie num" type="number" min="0" max="1000" step="5" bind:value={objectifs.data.proteinesJour} /></div>
    </div>
    <div class="deux">
      <div class="groupe">
        <label for="s-but">Mon but</label>
        <select id="s-but" class="saisie" bind:value={objectifs.data.but}>{#each BUTS as b (b)}<option value={b}>{b}</option>{/each}</select>
      </div>
      <div class="groupe">
        <label for="s-reg">Régime</label>
        <select id="s-reg" class="saisie" bind:value={objectifs.data.regime}>{#each REGIMES as r (r)}<option value={r}>{r}</option>{/each}</select>
      </div>
    </div>
    <div class="groupe"><label for="s-all">Allergies et intolérances</label><input id="s-all" class="saisie" bind:value={objectifs.data.allergies} placeholder="Ex. : arachides, lactose" /></div>
    <div class="groupe"><label for="s-evi">Ce que je préfère éviter</label><input id="s-evi" class="saisie" bind:value={objectifs.data.eviter} placeholder="Ex. : poisson, champignons" /></div>
    <div class="groupe"><label for="s-aim">Ce que j'aime</label><input id="s-aim" class="saisie" bind:value={objectifs.data.aime} placeholder="Ex. : pâtes, plats mijotés" /></div>
    <div class="groupe"><label for="s-not">Notes</label><textarea id="s-not" class="saisie" rows="3" bind:value={objectifs.data.notes}></textarea></div>
  </section>
</div>

<style>
  textarea.saisie {
    width: 100%;
    resize: vertical;
  }
</style>
