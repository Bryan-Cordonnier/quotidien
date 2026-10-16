<script lang="ts">
  // Repas : la page d'accueil est la bibliothèque de recettes. En haut, Concocter (l'IA crée les repas de plusieurs jours après quelques
  // questions), puis la recherche, les favoris, ce que je mange en moyenne (assiette) et toutes les recettes par rayon. Une fiche s'ouvre
  // d'un clic ; « Ajouter aux courses » fait fusionner la recette à la liste ouverte de Courses par l'IA, et montre ce qui change avant
  // d'écrire. Les ustensiles se règlent dans Paramètres.
  import { Entete, LineChart, Modal } from "@etabli/ui";
  import { formatEuros } from "@etabli/ui/money";
  import { basculerFavori, supprimerRecette } from "../../src/donnees";
  import { moyenneMangee } from "../../src/nutrition";
  import { normaliser } from "../../src/prix";
  import { Session } from "../../src/session.svelte";
  import { CATEGORIES, type Recette } from "../../src/types";
  import Assiette from "./Assiette.svelte";
  import Concocter from "./Concocter.svelte";
  import FormRecette from "./FormRecette.svelte";

  const s = new Session();
  void s.demarrer();

  let concocter = $state(false);
  let recherche = $state("");
  let rayon = $state<string>("");
  let ficheId = $state<string | null>(null);
  let formulaire = $state<{ id?: string } | null>(null);
  let prixOuverts = $state(false);
  let confirmer = $state(false);
  let info = $state("");
  let occupe = $state(false);
  // Ajout aux courses depuis la fiche : le nombre de parts, puis la proposition de l'IA à valider.
  let parts = $state(2);
  type Fusion = Exclude<Awaited<ReturnType<Session["preparerFusion"]>>, string>;
  let fusion = $state<Fusion | null>(null);
  let erreur = $state("");

  const recettes = $derived(s.donnees?.recettes ?? []);
  const fiche = $derived(ficheId ? (recettes.find((r) => r.id === ficheId) ?? null) : null);
  const filtre = $derived(normaliser(recherche));
  const trouvees = $derived(
    recettes.filter((r) => (rayon === "" || r.categorie === rayon) && (filtre === "" || normaliser(`${r.nom} ${r.ingredients.map((i) => i.nom).join(" ")} ${r.notes}`).includes(filtre))),
  );
  const parRayon = $derived(CATEGORIES.map((c) => [c, trouvees.filter((r) => r.categorie === c).sort((a, b) => a.nom.localeCompare(b.nom))] as const).filter(([, l]) => l.length > 0));
  const rayonsUtilises = $derived(CATEGORIES.filter((c) => recettes.some((r) => r.categorie === c)));
  const favoris = $derived(recettes.filter((r) => r.favori).sort((a, b) => a.nom.localeCompare(b.nom)));
  const moyenne = $derived(s.donnees ? moyenneMangee(s.donnees) : null);
  const sansValeurs = $derived(recettes.filter((r) => r.nutrition === null).length);
  const tempsMoyen = $derived.by(() => {
    const t = recettes.map((r) => r.tempsMin).filter((x): x is number => x !== null);
    return t.length ? Math.round(t.reduce((a, x) => a + x, 0) / t.length) : null;
  });
  const coutPlans = $derived(
    [...(s.donnees?.plans ?? [])]
      .sort((a, b) => a.debut.localeCompare(b.debut))
      .slice(-12)
      .map((p) => {
        const n = p.repas.reduce((x, r) => x + r.personnes, 0);
        return { label: `${p.debut.slice(8)}/${p.debut.slice(5, 7)}`, value: n ? Math.round(p.totalCents / n) : 0 };
      }),
  );
  const proteinesVisees = $derived(Number(s.sante?.proteinesJour) || 0);

  function ouvrir(r: Recette): void {
    ficheId = r.id;
    parts = r.portions;
    fusion = null;
    erreur = "";
    confirmer = false;
  }

  async function preparer(): Promise<void> {
    if (!fiche) return;
    erreur = "";
    occupe = true;
    const r = await s.preparerFusion(fiche, Math.max(1, Math.min(50, Number(parts) || 1)));
    occupe = false;
    if (typeof r === "string") erreur = r;
    else fusion = r;
  }

  async function valider(): Promise<void> {
    if (!fusion) return;
    const r = await s.ecrireFusion(fusion.listeId, fusion.nomListe, fusion.articles);
    if (r.ok) {
      info = r.message;
      fusion = null;
      ficheId = null;
    } else erreur = r.message;
  }

  async function estimer(): Promise<void> {
    occupe = true;
    info = await s.estimerNutrition();
    occupe = false;
  }

  function supprimer(): void {
    if (!fiche) return;
    if (!confirmer) {
      confirmer = true;
      return;
    }
    const id = fiche.id;
    if (s.appliquer((d) => supprimerRecette(d, id))) ficheId = null;
  }
</script>

{#snippet carte(r: Recette)}
  <div class="carte">
    <button class="ouvrir" onclick={() => ouvrir(r)}>
      <b>{r.nom}</b>
      <span class="petit">{r.portions} pers.{r.tempsMin ? ` · ${r.tempsMin} min` : ""}{r.nutrition ? ` · ${r.nutrition.kcal} kcal` : ""}</span>
    </button>
    <button class="etoile" class:allumee={r.favori} onclick={() => s.appliquer((d) => basculerFavori(d, r.id))} aria-pressed={r.favori} aria-label={r.favori ? `Retirer ${r.nom} des favoris` : `Mettre ${r.nom} en favori`}>{r.favori ? "★" : "☆"}</button>
  </div>
{/snippet}

<div class="page-plugin">
  <Entete titre="Repas">
    {#snippet actions()}
      {#if !concocter}
        <button class="btn" onclick={() => (prixOuverts = true)}>Prix relevés</button>
        <button class="btn" onclick={() => (formulaire = {})}>+ Recette</button>
      {/if}
    {/snippet}
  </Entete>

  {#if s.illisible}
    <section class="bloc"><p class="negatif">{s.illisible}</p></section>
  {:else if s.donnees && concocter}
    <button class="btn retour" onclick={() => (concocter = false)}>← Retour aux recettes</button>
    <Concocter {s} />
  {:else if s.donnees}
    <button class="concocter" onclick={() => (concocter = true)}>
      <span class="icone" aria-hidden="true">✨</span>
      <span class="texte"><b>Concocter mes repas</b><span>Quelques questions (jours, invités, temps, budget, envies), et l'IA crée les recettes et la liste de courses.</span></span>
      <span class="fleche" aria-hidden="true">→</span>
    </button>

    <input class="saisie recherche" type="search" bind:value={recherche} placeholder="Chercher une recette ou un ingrédient…" aria-label="Chercher une recette" />

    {#if filtre === ""}
      <section class="bloc">
        <p class="bloc-titre">★ Favoris</p>
        {#if favoris.length}
          <div class="rangee">{#each favoris as r (r.id)}{@render carte(r)}{/each}</div>
        {:else}
          <p class="petit">Touche l'étoile d'une recette pour l'épingler ici.</p>
        {/if}
      </section>

      {#if recettes.length > 0}
        <div class="grille-2-1">
          <section class="bloc">
            <p class="bloc-titre">Ce que je mange, par portion</p>
            {#if moyenne}
              <Assiette m={moyenne} />
              <p class="petit">
                Moyenne de {moyenne.nombre} {moyenne.base === "repas" ? "parts des repas concoctés" : "recettes de la bibliothèque"}{proteinesVisees ? ` · objectif Santé : ${proteinesVisees} g de protéines par jour` : ""}.
              </p>
            {:else}
              <p class="petit">Les valeurs nutritionnelles de tes recettes ne sont pas encore estimées.</p>
            {/if}
            {#if sansValeurs > 0}
              <button class="btn sm" onclick={estimer} disabled={occupe}>{occupe ? "L'IA calcule…" : `Estimer les valeurs (${sansValeurs} recette${sansValeurs > 1 ? "s" : ""})`}</button>
            {/if}
          </section>
          <section class="bloc tuiles">
            <div><b class="num">{recettes.length}</b><span class="petit">recettes</span></div>
            <div><b class="num">{tempsMoyen ?? "—"}</b><span class="petit">min en moyenne</span></div>
            <div><b class="num">{favoris.length}</b><span class="petit">favoris</span></div>
            <div><b class="num">{s.donnees.plans.length}</b><span class="petit">plans concoctés</span></div>
          </section>
        </div>
        {#if coutPlans.length > 1}
          <section class="bloc"><p class="bloc-titre">Coût par part des plans</p><LineChart points={coutPlans} format={formatEuros} title="Coût par part des derniers plans" height={140} /></section>
        {/if}
      {/if}
    {/if}

    {#if info}<p class="petit" role="status">{info}</p>{/if}

    {#if recettes.length === 0}
      <section class="bloc vide-biblio">
        <p>Aucune recette pour l'instant.</p>
        <p class="petit">Ajoute-en avec « + Recette », fais-en créer plusieurs d'un coup avec Concocter, ou dis à Max : « ajoute ma recette de… ».</p>
      </section>
    {:else}
      {#if rayonsUtilises.length > 1}
        <div class="rayons" role="group" aria-label="Rayons">
          <button class="btn sm {rayon === '' ? 'primary' : ''}" onclick={() => (rayon = "")}>Tout</button>
          {#each rayonsUtilises as c (c)}<button class="btn sm {rayon === c ? 'primary' : ''}" onclick={() => (rayon = rayon === c ? "" : c)}>{c}</button>{/each}
        </div>
      {/if}
      {#if trouvees.length === 0}<p class="petit">Aucune recette ne correspond.</p>{/if}
      {#each parRayon as [c, liste] (c)}
        <section class="bloc">
          <p class="bloc-titre">{c}</p>
          <div class="cartes">{#each liste as r (r.id)}{@render carte(r)}{/each}</div>
        </section>
      {/each}
    {/if}
    {#if s.message}<p class="negatif" role="alert">{s.message}</p>{/if}
  {:else}
    <p class="petit">Chargement…</p>
  {/if}
</div>

{#if fiche}
  <Modal open titre={fiche.nom} onclose={() => (ficheId = null)} largeur={620}>
    <p class="petit">
      {fiche.categorie} · {fiche.portions} personne{fiche.portions > 1 ? "s" : ""}{fiche.tempsMin ? ` · ${fiche.tempsMin} min` : ""}
      {#if fiche.nutrition}· par portion : {fiche.nutrition.kcal} kcal, {fiche.nutrition.proteines} g de protéines, {fiche.nutrition.glucides} g de glucides, {fiche.nutrition.lipides} g de lipides{/if}
    </p>

    <section class="courses">
      {#if fusion}
        <p class="etiquette">{fusion.listeId ? `Liste « ${fusion.nomListe} »` : "Nouvelle liste"} : ce qui change</p>
        {#if fusion.remarques}<p class="petit">{fusion.remarques}</p>{/if}
        {#if fusion.ajoutes.length}<p><b class="positif">Ajouté ou modifié :</b> {fusion.ajoutes.join(", ")}</p>{/if}
        {#if fusion.retires.length}<p><b class="negatif">Remplacé ou retiré :</b> {fusion.retires.join(", ")}</p>{/if}
        {#if !fusion.ajoutes.length && !fusion.retires.length}<p class="petit">Tout était déjà dans la liste : rien à changer.</p>{/if}
        <div class="actions">
          <button class="btn primary" onclick={valider} disabled={!fusion.ajoutes.length && !fusion.retires.length}>Valider</button>
          <button class="btn" onclick={() => (fusion = null)}>Annuler</button>
        </div>
      {:else}
        <div class="actions">
          <label class="petit">pour <input class="saisie num" style="width: 64px" type="number" min="1" max="50" bind:value={parts} /> pers.</label>
          <button class="btn primary" onclick={preparer} disabled={occupe}>{occupe ? "L'IA compare avec la liste…" : "🛒 Ajouter cette recette aux courses"}</button>
        </div>
      {/if}
      {#if erreur}<p class="negatif" role="alert">{erreur}</p>{/if}
    </section>

    <p class="etiquette">Ingrédients</p>
    <ul>{#each fiche.ingredients as i (i.nom + i.quantite)}<li>{i.quantite ? `${i.quantite} ` : ""}{i.nom}</li>{/each}</ul>
    {#if fiche.ustensiles.length}<p class="etiquette">Ustensiles</p><p>{fiche.ustensiles.join(", ")}</p>{/if}
    {#if fiche.etapes.length}<p class="etiquette">Préparation</p><ol>{#each fiche.etapes as e, n (n)}<li>{e}</li>{/each}</ol>{/if}
    {#if fiche.notes}<p class="etiquette">Notes</p><p>{fiche.notes}</p>{/if}
    {#snippet pied()}
      <button class="btn" onclick={() => fiche && s.appliquer((d) => basculerFavori(d, fiche.id))}>{fiche?.favori ? "★ Favori" : "☆ Favori"}</button>
      <button class="btn danger" onclick={supprimer}>{confirmer ? "Confirmer la suppression" : "Supprimer"}</button>
      <button class="btn primary" onclick={() => fiche && ((formulaire = { id: fiche.id }), (ficheId = null))}>Modifier</button>
    {/snippet}
  </Modal>
{/if}

{#if prixOuverts && s.donnees}
  <Modal open titre="Prix relevés" onclose={() => (prixOuverts = false)} largeur={620}>
    <p class="petit">Les prix des tickets restent dans Courses ({s.courses.prix.length} connus). Ici, ceux relevés ailleurs : par Max (« relève les prix de… ») ou par recherche.</p>
    {#if s.donnees.prix.length === 0}
      <p class="petit">Aucun prix relevé.</p>
    {:else}
      <table class="tableau">
        <thead><tr><th>Article</th><th>Magasin</th><th class="num">Prix</th><th>Relevé</th></tr></thead>
        <tbody>
          {#each [...s.donnees.prix].reverse().slice(0, 300) as p (p.nom + p.magasin)}
            <tr><td>{p.nom}{#if p.unite}<span class="petit"> ({p.unite})</span>{/if}</td><td>{p.magasin}</td><td class="num">{formatEuros(p.prixCents)}</td><td class="petit">{p.jour.split("-").reverse().join("/")}</td></tr>
          {/each}
        </tbody>
      </table>
    {/if}
  </Modal>
{/if}

{#if formulaire}<FormRecette {s} id={formulaire.id} onclose={() => (formulaire = null)} />{/if}

<style>
  .concocter {
    display: flex;
    align-items: center;
    gap: 14px;
    width: 100%;
    padding: 18px 20px;
    border: 1px solid var(--accent);
    border-radius: var(--r-md);
    background: var(--accent-soft);
    color: var(--text);
    font: inherit;
    text-align: left;
    cursor: pointer;
  }
  .concocter:hover {
    filter: brightness(0.97);
  }
  .concocter .icone {
    font-size: 30px;
  }
  .concocter .texte {
    display: flex;
    flex-direction: column;
    gap: 2px;
    flex: 1;
  }
  .concocter b {
    font-size: 18px;
  }
  .concocter .texte span {
    color: var(--muted);
    font-size: 13px;
  }
  .concocter .fleche {
    font-size: 22px;
    color: var(--accent);
  }
  .retour {
    margin-bottom: 10px;
  }
  .recherche {
    width: 100%;
    font-size: 16px;
    padding: 12px 14px;
    margin: 12px 0;
  }
  .rayons {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 10px;
  }
  .rangee {
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: minmax(200px, 240px);
    gap: 8px;
    overflow-x: auto;
    padding-bottom: 4px;
  }
  .cartes {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 8px;
  }
  .carte {
    position: relative;
    display: flex;
    flex-direction: column;
    border-radius: var(--r-md);
    background: var(--field);
    overflow: hidden;
  }
  .ouvrir {
    display: flex;
    flex-direction: column;
    gap: 3px;
    align-items: flex-start;
    text-align: left;
    padding: 10px 34px 10px 12px;
    border: 0;
    background: none;
    font: inherit;
    color: var(--text);
    cursor: pointer;
  }
  .etoile {
    position: absolute;
    top: 6px;
    right: 6px;
    border: 0;
    background: none;
    font-size: 18px;
    color: var(--muted);
    cursor: pointer;
  }
  .etoile.allumee {
    color: #e3a33b;
  }
  .courses {
    padding: 12px;
    margin-bottom: 10px;
    border-radius: var(--r-md);
    background: var(--field);
  }
  .tuiles {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    align-content: start;
  }
  .tuiles div {
    display: flex;
    flex-direction: column;
    padding: 10px 12px;
    border-radius: var(--r-md);
    background: var(--field);
  }
  .tuiles b {
    font-size: 22px;
  }
  .vide-biblio {
    text-align: center;
  }
</style>
