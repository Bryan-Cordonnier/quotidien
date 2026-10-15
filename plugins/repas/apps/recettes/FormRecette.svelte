<script lang="ts">
  // Ajouter ou modifier une recette : nom, rayon, personnes, temps, ingrédients (un par ligne : « 200 g spaghetti » ou « spaghetti : 200 g »),
  // étapes (une par ligne), ustensiles (séparés par des virgules) et notes.
  import { Modal } from "@etabli/ui";
  import { ajouterRecette, modifierRecette } from "../../src/donnees";
  import type { Session } from "../../src/session.svelte";
  import { CATEGORIES, type Categorie } from "../../src/types";

  let { s, id, onclose }: { s: Session; id?: string; onclose: () => void } = $props();

  // svelte-ignore state_referenced_locally
  const r = id ? s.donnees?.recettes.find((x) => x.id === id) : undefined;
  let nom = $state(r?.nom ?? "");
  let categorie = $state<Categorie>(r?.categorie ?? "Plats chauds");
  let portions = $state(r?.portions ?? 2);
  let temps = $state(r?.tempsMin != null ? String(r.tempsMin) : "");
  let ingredients = $state(r ? r.ingredients.map((i) => (i.quantite ? `${i.quantite} ${i.nom}` : i.nom)).join("\n") : "");
  let etapes = $state(r ? r.etapes.join("\n") : "");
  let ustensiles = $state(r ? r.ustensiles.join(", ") : "");
  let notes = $state(r?.notes ?? "");
  let erreur = $state("");

  /** « 200 g spaghetti », « 2 œufs », « sel » ou « spaghetti : 200 g » → nom et quantité. */
  function lireIngredient(ligne: string): { nom: string; quantite: string } {
    const deuxPoints = /^(.+?)\s*:\s*(.+)$/.exec(ligne);
    if (deuxPoints) return { nom: deuxPoints[1]!.trim(), quantite: deuxPoints[2]!.trim() };
    const m = /^(\d+([.,]\d+)?\s*(g|kg|mg|l|cl|ml|dl|c\.\s*à\s*(soupe|café)|cuillères?\s+à\s+(soupe|café)|pincées?|tranches?|gousses?|boîtes?|sachets?)?\.?)\s+(de\s+|d')?(.+)$/i.exec(ligne);
    return m ? { nom: m[7]!.trim(), quantite: m[1]!.trim() } : { nom: ligne.trim(), quantite: "" };
  }

  function enregistrer(): void {
    erreur = "";
    const brut = {
      nom,
      categorie,
      portions: Number(portions) || 2,
      tempsMin: temps.trim() === "" ? null : Number(temps),
      ingredients: ingredients.split("\n").map((l) => l.trim()).filter((l) => l !== "").map(lireIngredient),
      etapes: etapes.split("\n").map((l) => l.trim()).filter((l) => l !== ""),
      ustensiles: ustensiles.split(",").map((u) => u.trim()).filter((u) => u !== ""),
      notes,
      source: r?.source ?? "moi",
    };
    const ok = id ? s.appliquer((d) => modifierRecette(d, id, brut)) : s.appliquer((d) => ajouterRecette(d, brut).donnees);
    if (ok) onclose();
    else erreur = s.message;
  }
</script>

<Modal open titre={id ? "Modifier la recette" : "Nouvelle recette"} {onclose} largeur={600}>
  <div class="groupe"><label for="f-nom">Nom</label><input id="f-nom" class="saisie" bind:value={nom} autocomplete="off" /></div>
  <div class="trois">
    <div class="groupe">
      <label for="f-cat">Rayon</label>
      <select id="f-cat" class="saisie" bind:value={categorie}>{#each CATEGORIES as c (c)}<option value={c}>{c}</option>{/each}</select>
    </div>
    <div class="groupe"><label for="f-por">Personnes</label><input id="f-por" class="saisie num" type="number" min="1" max="50" bind:value={portions} /></div>
    <div class="groupe"><label for="f-tps">Temps (min)</label><input id="f-tps" class="saisie num" bind:value={temps} inputmode="numeric" placeholder="—" /></div>
  </div>
  <div class="groupe">
    <label for="f-ing">Ingrédients (un par ligne)</label>
    <textarea id="f-ing" class="saisie" rows="6" bind:value={ingredients} placeholder={"200 g spaghetti\n150 g lardons\n2 œufs\nparmesan"}></textarea>
  </div>
  <div class="groupe">
    <label for="f-eta">Étapes (une par ligne)</label>
    <textarea id="f-eta" class="saisie" rows="5" bind:value={etapes}></textarea>
  </div>
  <div class="groupe"><label for="f-ust">Ustensiles (séparés par des virgules)</label><input id="f-ust" class="saisie" bind:value={ustensiles} placeholder="casserole, poêle" /></div>
  <div class="groupe"><label for="f-not">Notes</label><textarea id="f-not" class="saisie" rows="2" bind:value={notes}></textarea></div>
  {#if erreur}<p class="negatif" role="alert">{erreur}</p>{/if}
  {#snippet pied()}<button class="btn primary" onclick={enregistrer}>{id ? "Enregistrer" : "Ajouter la recette"}</button>{/snippet}
</Modal>

<style>
  textarea.saisie {
    width: 100%;
    resize: vertical;
  }
</style>
