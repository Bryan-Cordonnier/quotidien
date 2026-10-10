<script lang="ts">
  // Liste de courses : un pense-bête par course. À gauche, on crée une liste (un nom, des articles) ; elle apparaît à droite dans « Mes listes »,
  // la liste des listes en cours. Un clic sur une liste l'ouvre en grand pour la consulter et la modifier ; « Régler la course » la verrouille et
  // ajoute le ticket au budget. En bas, les listes réglées.
  import { Entete, Icon, Modal } from "@etabli/ui";
  import { creerListe, listesEnCours, listesReglees } from "../../src/donnees";
  import { Session } from "../../src/session.svelte";
  import CarteListe from "./CarteListe.svelte";
  import ListesReglees from "./ListesReglees.svelte";
  import { formatEuros } from "@etabli/ui/money";
  import { baseDePrix, estimerListe } from "../../src/prix";
  import ProposerRepas from "./ProposerRepas.svelte";
  import Regler from "./Regler.svelte";

  const s = new Session();
  void s.demarrer();

  let ouverte = $state<string | null>(null);
  let reglage = $state<string | null>(null);
  let repas = $state(false);
  let nom = $state("");
  let article = $state("");
  let articles = $state<string[]>([]);
  let erreur = $state("");

  const enCours = $derived(s.donnees ? listesEnCours(s.donnees) : []);
  const reglees = $derived(s.donnees ? listesReglees(s.donnees) : []);
  const consultee = $derived(enCours.find((l) => l.id === ouverte));
  const base = $derived(s.donnees ? baseDePrix(s.donnees) : []);
  const estimeDe = (l: (typeof enCours)[number]) => estimerListe(l.articles.map((a) => a.nom), base).conseille;

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
      ouverte = nouvelle;
      nom = "";
      articles = [];
    } else erreur = s.message;
  }
</script>

<div class="page-plugin">
  <Entete titre="Liste de courses">
    {#snippet actions()}<button class="btn primary" onclick={() => (repas = true)}><Icon name="plus" size={16} /> Proposer des repas (IA)</button>{/snippet}
  </Entete>

  {#if s.illisible}
    <section class="bloc">
      <p class="etiquette">Données illisibles</p>
      <p class="negatif">{s.illisible}</p>
    </section>
  {:else if s.donnees}
    <!-- À gauche on crée, à droite on retrouve ses listes : toujours dans cet ordre. -->
    <div class="grille-2">
      <section class="bloc">
        <div class="bloc-titre"><h3>Nouvelle liste</h3></div>
        <div class="groupe" style="margin-top: 10px">
          <label for="l-nom">Nom de la liste</label>
          <input id="l-nom" class="saisie" bind:value={nom} placeholder="Courses de samedi" autocomplete="off" />
        </div>
        <div class="ajout">
          <input class="saisie" bind:value={article} placeholder="Ajouter un article" aria-label="Article" autocomplete="off" onkeydown={(e) => e.key === "Enter" && ajouterBrouillon()} />
          <button class="btn" onclick={ajouterBrouillon}><Icon name="plus" size={16} /> Ajouter</button>
        </div>
        {#if articles.length > 0}
          <ul class="brouillon">
            {#each articles as a, i (i)}
              <li><span>{a}</span><button class="retrait" onclick={() => (articles = articles.filter((_, k) => k !== i))} aria-label="Retirer {a}"><Icon name="x" size={16} /></button></li>
            {/each}
          </ul>
        {/if}
        {#if erreur}<p class="negatif" role="alert" style="margin: 8px 0 0">{erreur}</p>{/if}
        <button class="btn primary" style="margin-top: 12px" onclick={creer}><Icon name="check" size={16} /> Créer la liste</button>
      </section>

      <section class="bloc">
        <div class="bloc-titre">
          <h3>Mes listes</h3>
          <span class="petit">{enCours.length} liste{enCours.length > 1 ? "s" : ""}</span>
        </div>
        {#if enCours.length === 0}
          <p class="petit" style="margin-top: 10px">Aucune liste en cours. Créez-en une pour commencer.</p>
        {:else}
          <ul class="listes">
            {#each enCours as l (l.id)}
              {@const pris = l.articles.filter((a) => a.pris).length}
              <li>
                <button class="ligne" onclick={() => (ouverte = l.id)} aria-label="Ouvrir {l.nom}">
                  <span class="intitule">{l.nom}</span>
                  {#if estimeDe(l)}{@const e = estimeDe(l)!}<span class="num petit estime" title="Magasin le moins cher d'après vos tickets">≈ {formatEuros(e.totalCents)} · {e.magasin}</span>{/if}
                  <span class="num petit">{pris}/{l.articles.length}</span>
                  <Icon name="expand" size={16} />
                </button>
              </li>
            {/each}
          </ul>
        {/if}
      </section>
    </div>

    <ListesReglees {s} listes={reglees} />

    {#if repas}<ProposerRepas {s} onclose={() => (repas = false)} />{/if}

    <Modal open={consultee !== undefined} titre={consultee?.nom ?? "Liste"} largeur={900} onclose={() => (ouverte = null)}>
      {#if consultee}
        <CarteListe {s} liste={consultee} plein ouverte onbasculer={() => {}} onregler={() => (reglage = consultee.id)} />
      {/if}
    </Modal>

    {#if reglage}<Regler {s} listeId={reglage} onclose={() => ((reglage = null), (ouverte = null))} />{/if}
    {#if s.message && !erreur}<p class="negatif" role="alert">{s.message}</p>{/if}
  {:else}
    <p class="petit">Chargement…</p>
  {/if}
</div>

<style>
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
    display: grid;
    place-items: center;
    padding: 0;
    border: 0;
    border-radius: 6px;
    background: none;
    color: var(--faint);
    cursor: pointer;
  }
  .retrait:hover {
    color: var(--err);
    background: var(--surface-2);
  }
  .listes {
    margin: 10px 0 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .ligne {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 14px;
    border: 1px solid var(--border);
    border-radius: 12px;
    background: var(--surface-2);
    color: var(--text);
    text-align: left;
    cursor: pointer;
  }
  .ligne:hover {
    border-color: var(--accent);
  }
  .intitule {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-weight: 700;
  }
  .estime {
    white-space: nowrap;
  }
</style>
