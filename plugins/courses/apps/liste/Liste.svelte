<script lang="ts">
  // Liste de courses : un pense-bête par course. On crée une liste (un nom, des articles), elle apparaît dans « Listes en cours » où on
  // la consulte et la modifie en quelques clics pour faire ses courses ; « Régler la course » la verrouille et ajoute le ticket au budget.
  import { Entete } from "@etabli/ui";
  import { creerListe, listesEnCours, listesReglees } from "../../src/donnees";
  import { Session } from "../../src/session.svelte";
  import CarteListe from "./CarteListe.svelte";
  import ListesReglees from "./ListesReglees.svelte";
  import Regler from "./Regler.svelte";

  const s = new Session();
  void s.demarrer();

  let ouvertes = $state<Record<string, boolean>>({});
  let reglage = $state<string | null>(null);
  let nom = $state("");
  let article = $state("");
  let articles = $state<string[]>([]);
  let erreur = $state("");

  const enCours = $derived(s.donnees ? listesEnCours(s.donnees) : []);
  const reglees = $derived(s.donnees ? listesReglees(s.donnees) : []);

  function ajouterBrouillon(): void {
    const a = article.trim();
    if (a === "") return;
    articles = [...articles, a];
    article = "";
  }

  function creer(): void {
    erreur = "";
    if (article.trim() !== "") ajouterBrouillon();
    const noms = articles;
    const intitule = nom;
    let nouvelle = "";
    if (
      s.appliquer((d) => {
        const r = creerListe(d, intitule, noms);
        nouvelle = r.id;
        return r.donnees;
      })
    ) {
      ouvertes = { ...ouvertes, [nouvelle]: true };
      nom = "";
      articles = [];
    } else erreur = s.message;
  }
</script>

<div class="page-plugin">
  <Entete titre="Liste de courses" />

  {#if s.illisible}
    <section class="bloc">
      <p class="etiquette">Données illisibles</p>
      <p class="negatif">{s.illisible}</p>
    </section>
  {:else if s.donnees}
    {#if enCours.length > 0}
      <section class="bloc">
        <div class="bloc-titre">
          <h3>Listes en cours</h3>
          <span class="petit">{enCours.length} liste{enCours.length > 1 ? "s" : ""}</span>
        </div>
        <div class="cartes">
          {#each enCours as l, i (l.id)}
            <CarteListe {s} liste={l} ouverte={ouvertes[l.id] ?? i === 0} onbasculer={() => (ouvertes = { ...ouvertes, [l.id]: !(ouvertes[l.id] ?? i === 0) })} onregler={() => (reglage = l.id)} />
          {/each}
        </div>
      </section>
    {/if}

    <section class="bloc">
      <div class="bloc-titre"><h3>Nouvelle liste</h3></div>
      <div class="groupe" style="margin-top: 10px">
        <label for="l-nom">Nom de la liste</label>
        <input id="l-nom" class="saisie" bind:value={nom} placeholder="Courses de samedi" autocomplete="off" />
      </div>
      <div class="ajout">
        <input class="saisie" bind:value={article} placeholder="Ajouter un article" aria-label="Article" autocomplete="off" onkeydown={(e) => e.key === "Enter" && ajouterBrouillon()} />
        <button class="btn" onclick={ajouterBrouillon}>Ajouter</button>
      </div>
      {#if articles.length > 0}
        <ul class="brouillon">
          {#each articles as a, i (i)}
            <li><span>{a}</span><button class="retrait" onclick={() => (articles = articles.filter((_, k) => k !== i))} aria-label="Retirer {a}">×</button></li>
          {/each}
        </ul>
      {/if}
      {#if erreur}<p class="negatif" role="alert" style="margin: 8px 0 0">{erreur}</p>{/if}
      <button class="btn primary" style="margin-top: 12px" onclick={creer}>Créer la liste</button>
    </section>

    <ListesReglees {s} listes={reglees} />

    {#if reglage}<Regler {s} listeId={reglage} onclose={() => (reglage = null)} />{/if}
    {#if s.message && !erreur}<p class="negatif" role="alert">{s.message}</p>{/if}
  {:else}
    <p class="petit">Chargement…</p>
  {/if}
</div>

<style>
  .cartes {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-top: 10px;
  }
  .ajout {
    display: flex;
    gap: 8px;
    margin-top: 8px;
  }
  .brouillon {
    margin: 8px 0 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
  }
  .brouillon li {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 4px;
    border-bottom: 1px solid var(--border);
  }
  .retrait {
    width: 28px;
    height: 28px;
    border: 0;
    border-radius: 6px;
    background: none;
    color: var(--faint);
    font-size: 18px;
    cursor: pointer;
  }
  .retrait:hover {
    color: var(--err);
    background: var(--surface-2);
  }
</style>