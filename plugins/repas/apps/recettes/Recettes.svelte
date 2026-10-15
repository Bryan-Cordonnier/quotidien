<script lang="ts">
  // Recettes : la bibliothèque (recherche, rayons, fiches), les ustensiles de la maison et les prix relevés. On coche des recettes, on règle pour
  // combien de personnes, et l'IA en fait la liste de courses ; les prix et le magasin le moins cher sont calculés avec nos prix.
  import { Entete, Modal, Tabs } from "@etabli/ui";
  import { formatEuros } from "@etabli/ui/money";
  import { definirUstensiles, supprimerRecette } from "../../src/donnees";
  import { chiffrer, normaliser, type Chiffrage } from "../../src/prix";
  import { Session } from "../../src/session.svelte";
  import { CATEGORIES, type Recette } from "../../src/types";
  import ListeChiffree from "../../src/ui/ListeChiffree.svelte";
  import FormRecette from "./FormRecette.svelte";

  const s = new Session();
  void s.demarrer();

  type Onglet = "recettes" | "ustensiles" | "prix";
  let onglet = $state<Onglet>("recettes");
  let recherche = $state("");
  let rayon = $state<string>("");
  let fiche = $state<Recette | null>(null);
  let formulaire = $state<{ id?: string } | null>(null);
  let confirmer = $state(false);
  /** Recettes cochées pour la liste de courses → nombre de personnes. */
  let choisies = $state<Record<string, number>>({});
  let occupe = $state(false);
  let erreur = $state("");
  let info = $state("");
  let liste = $state<{ chiffrage: Chiffrage; remarques: string } | null>(null);
  let nouvelUstensile = $state("");

  const filtre = $derived(normaliser(recherche));
  const trouvees = $derived(
    (s.donnees?.recettes ?? []).filter(
      (r) => (rayon === "" || r.categorie === rayon) && (filtre === "" || normaliser(`${r.nom} ${r.ingredients.map((i) => i.nom).join(" ")} ${r.notes}`).includes(filtre)),
    ),
  );
  const parRayon = $derived(CATEGORIES.map((c) => [c, trouvees.filter((r) => r.categorie === c).sort((a, b) => a.nom.localeCompare(b.nom))] as const).filter(([, l]) => l.length > 0));
  const rayonsUtilises = $derived(CATEGORIES.filter((c) => (s.donnees?.recettes ?? []).some((r) => r.categorie === c)));
  const nbChoisies = $derived(Object.keys(choisies).length);

  function cocher(r: Recette): void {
    if (choisies[r.id] !== undefined) {
      const { [r.id]: _retire, ...reste } = choisies;
      choisies = reste;
    } else choisies = { ...choisies, [r.id]: r.portions };
  }

  async function faireListe(): Promise<void> {
    erreur = info = "";
    occupe = true;
    const choix = Object.entries(choisies)
      .map(([id, personnes]) => ({ recette: s.donnees!.recettes.find((r) => r.id === id)!, personnes: Math.max(1, Number(personnes) || 1) }))
      .filter((c) => c.recette);
    const r = await s.listePourRecettes(choix, null);
    occupe = false;
    if (typeof r === "string") {
      erreur = r;
      return;
    }
    liste = { chiffrage: chiffrer(r.courses.map((c) => ({ nom: c.nom, pour: c.pour, unites: c.unites, estimeCents: c.estimeCents })), s.base), remarques: r.remarques };
  }

  async function envoyer(): Promise<void> {
    if (!liste) return;
    const noms = Object.keys(choisies).map((id) => s.donnees?.recettes.find((r) => r.id === id)?.nom).filter(Boolean);
    const r = await s.envoyerACourses(noms.length <= 2 ? noms.join(" et ") : `${noms.length} recettes`, liste.chiffrage.lignes.map((l) => (l.unites > 1 ? `${l.unites} × ${l.nom}` : l.nom)));
    info = r.message;
    if (r.ok) {
      liste = null;
      choisies = {};
    }
  }

  function ajouterUstensile(): void {
    const u = nouvelUstensile.trim();
    if (u === "" || !s.donnees) return;
    if (s.appliquer((d) => definirUstensiles(d, [...d.ustensiles, u]))) nouvelUstensile = "";
  }
  const USUELS = ["Poêle", "Casserole", "Faitout", "Four", "Micro-ondes", "Plaque de cuisson", "Mixeur", "Robot pâtissier", "Batteur", "Cocotte-minute", "Friteuse à air", "Grille-pain", "Moule à gâteau", "Plaque à pâtisserie", "Saladier", "Fouet", "Rouleau à pâtisserie", "Wok", "Barbecue", "Blender"];
</script>

<div class="page-plugin">
  <Entete titre="Recettes">
    {#snippet actions()}
      {#if onglet === "recettes"}<button class="btn primary" onclick={() => (formulaire = {})}>+ Recette</button>{/if}
    {/snippet}
  </Entete>

  {#if s.illisible}
    <section class="bloc"><p class="negatif">{s.illisible}</p></section>
  {:else if s.donnees}
    <Tabs items={[{ id: "recettes", label: `Recettes (${s.donnees.recettes.length})` }, { id: "ustensiles", label: "Mes ustensiles" }, { id: "prix", label: "Prix relevés" }]} bind:value={onglet} label="Rubrique" />

    {#if onglet === "recettes"}
      <section class="bloc">
        <input class="saisie recherche" type="search" bind:value={recherche} placeholder="Chercher une recette ou un ingrédient…" aria-label="Chercher" />
        {#if rayonsUtilises.length > 1}
          <div class="rayons" role="group" aria-label="Rayons">
            <button class="btn sm {rayon === '' ? 'primary' : ''}" onclick={() => (rayon = "")}>Tout</button>
            {#each rayonsUtilises as c (c)}<button class="btn sm {rayon === c ? 'primary' : ''}" onclick={() => (rayon = rayon === c ? "" : c)}>{c}</button>{/each}
          </div>
        {/if}
      </section>

      {#if nbChoisies > 0}
        <section class="bloc choix">
          <p class="bloc-titre">Liste de courses pour {nbChoisies} recette{nbChoisies > 1 ? "s" : ""}</p>
          {#each Object.keys(choisies) as id (id)}
            {@const r = s.donnees.recettes.find((x) => x.id === id)}
            {#if r}
              <div class="ligne-choix">
                <span>{r.nom}</span>
                <label class="petit">pour <input class="saisie num" style="width: 64px" type="number" min="1" max="50" bind:value={choisies[id]} /> pers.</label>
                <button class="btn sm" onclick={() => cocher(r)} aria-label="Retirer {r.nom}">✕</button>
              </div>
            {/if}
          {/each}
          <div class="actions">
            <button class="btn primary" onclick={faireListe} disabled={occupe}>{occupe ? "L'IA prépare la liste…" : "Faire la liste de courses"}</button>
            <button class="btn" onclick={() => ((choisies = {}), (liste = null))}>Tout décocher</button>
          </div>
          {#if liste}
            {#if liste.remarques}<p class="petit">{liste.remarques}</p>{/if}
            <ListeChiffree chiffrage={liste.chiffrage} />
            <button class="btn primary" onclick={envoyer}>Envoyer la liste à Courses</button>
          {/if}
          {#if erreur}<p class="negatif" role="alert">{erreur}</p>{/if}
        </section>
      {/if}
      {#if info}<p class="petit" role="status">{info}</p>{/if}

      {#if s.donnees.recettes.length === 0}
        <section class="bloc vide-biblio">
          <p>Aucune recette pour l'instant.</p>
          <p class="petit">Ajoutez-en avec « + Recette », gardez celles que propose Concocter, ou dites à Max : « ajoute ma recette de… ».</p>
        </section>
      {:else if trouvees.length === 0}
        <p class="petit">Aucune recette ne correspond.</p>
      {/if}
      {#each parRayon as [c, recettes] (c)}
        <section class="bloc">
          <p class="bloc-titre">{c}</p>
          <div class="cartes">
            {#each recettes as r (r.id)}
              <div class="carte" class:cochee={choisies[r.id] !== undefined}>
                <button class="ouvrir" onclick={() => ((fiche = r), (confirmer = false))}>
                  <b>{r.nom}</b>
                  <span class="petit">{r.portions} pers.{r.tempsMin ? ` · ${r.tempsMin} min` : ""} · {r.ingredients.length} ingrédients{r.source !== "moi" ? ` · ${r.source === "ia" ? "IA" : "Max"}` : ""}</span>
                </button>
                <label class="cocher"><input type="checkbox" checked={choisies[r.id] !== undefined} onchange={() => cocher(r)} /> <span class="petit">courses</span></label>
              </div>
            {/each}
          </div>
        </section>
      {/each}
    {:else if onglet === "ustensiles"}
      <section class="bloc">
        <p class="petit">L'IA ne propose que des recettes faisables avec ce que vous avez.</p>
        <div class="rayons">
          {#each s.donnees.ustensiles as u (u)}
            <button class="btn sm" onclick={() => s.appliquer((d) => definirUstensiles(d, d.ustensiles.filter((x) => x !== u)))} aria-label="Retirer {u}">{u} ✕</button>
          {/each}
          {#if s.donnees.ustensiles.length === 0}<span class="petit">Aucun ustensile renseigné.</span>{/if}
        </div>
        <div class="actions">
          <input class="saisie" bind:value={nouvelUstensile} placeholder="Ajouter un ustensile" onkeydown={(e) => e.key === "Enter" && ajouterUstensile()} />
          <button class="btn" onclick={ajouterUstensile}>Ajouter</button>
        </div>
        <p class="petit">Courants :</p>
        <div class="rayons">
          {#each USUELS.filter((u) => !s.donnees!.ustensiles.some((x) => x.toLowerCase() === u.toLowerCase())) as u (u)}
            <button class="btn sm" onclick={() => s.appliquer((d) => definirUstensiles(d, [...d.ustensiles, u]))}>+ {u}</button>
          {/each}
        </div>
      </section>
    {:else}
      <section class="bloc">
        <p class="petit">
          Les prix des tickets restent dans Courses ({s.courses.prix.length} connus). Ici, les prix relevés ailleurs : par Max (« relève les prix de… ») ou par recherche.
        </p>
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
      </section>
    {/if}
    {#if s.message}<p class="negatif" role="alert">{s.message}</p>{/if}
  {/if}
</div>

{#if fiche}
  <Modal open titre={fiche.nom} onclose={() => (fiche = null)} largeur={620}>
    <p class="petit">{fiche.categorie} · {fiche.portions} personne{fiche.portions > 1 ? "s" : ""}{fiche.tempsMin ? ` · ${fiche.tempsMin} min` : ""}</p>
    <p class="etiquette">Ingrédients</p>
    <ul>{#each fiche.ingredients as i (i.nom + i.quantite)}<li>{i.quantite ? `${i.quantite} ` : ""}{i.nom}</li>{/each}</ul>
    {#if fiche.ustensiles.length}<p class="etiquette">Ustensiles</p><p>{fiche.ustensiles.join(", ")}</p>{/if}
    {#if fiche.etapes.length}<p class="etiquette">Préparation</p><ol>{#each fiche.etapes as e, n (n)}<li>{e}</li>{/each}</ol>{/if}
    {#if fiche.notes}<p class="etiquette">Notes</p><p>{fiche.notes}</p>{/if}
    {#snippet pied()}
      <button class="btn danger" onclick={() => {
        if (!confirmer) return void (confirmer = true);
        if (s.appliquer((d) => supprimerRecette(d, fiche!.id))) fiche = null;
      }}>{confirmer ? "Confirmer la suppression" : "Supprimer"}</button>
      <button class="btn primary" onclick={() => ((formulaire = { id: fiche!.id }), (fiche = null))}>Modifier</button>
    {/snippet}
  </Modal>
{/if}

{#if formulaire}<FormRecette {s} id={formulaire.id} onclose={() => (formulaire = null)} />{/if}

<style>
  .recherche {
    width: 100%;
  }
  .rayons {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 10px;
  }
  .cartes {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 8px;
  }
  .carte {
    display: flex;
    flex-direction: column;
    border-radius: var(--r-md);
    background: var(--field);
    overflow: hidden;
  }
  .carte.cochee {
    outline: 1.5px solid var(--accent);
  }
  .ouvrir {
    display: flex;
    flex-direction: column;
    gap: 3px;
    align-items: flex-start;
    text-align: left;
    padding: 10px 12px 6px;
    border: 0;
    background: none;
    font: inherit;
    color: var(--text);
    cursor: pointer;
  }
  .cocher {
    display: flex;
    gap: 6px;
    align-items: center;
    padding: 4px 12px 8px;
  }
  .ligne-choix {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 4px 0;
  }
  .ligne-choix span {
    flex: 1;
  }
  .vide-biblio {
    text-align: center;
  }
</style>
