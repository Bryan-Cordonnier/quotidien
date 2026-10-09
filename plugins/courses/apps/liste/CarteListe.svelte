<script lang="ts">
  // Une liste en cours, dépliable : son nom et ses articles se modifient sur place (un clic sur le nom, Entrée ou « Valider »).
  // Chaque article a un gros bouton ✓ (« dans le caddie ») et une petite croix pour le retirer. « Régler la course » est tout en bas ;
  // un article non coché n'empêche jamais de régler.
  import { Icon } from "@etabli/ui";
  import { formatEuros } from "@etabli/ui/money";
  import { baseDePrix, estimerListe } from "../../src/prix";
  import { ajouterArticle, basculerPris, renommerArticle, renommerListe, retirerArticle } from "../../src/donnees";
  import type { Session } from "../../src/session.svelte";
  import type { Liste } from "../../src/types";

  interface Props {
    s: Session;
    liste: Liste;
    ouverte: boolean;
    /** Affichée en grand (fenêtre) : pas de flèche pour replier, le nom est déjà le titre. */
    plein?: boolean;
    onbasculer: () => void;
    onregler: () => void;
  }

  let { s, liste, ouverte, plein = false, onbasculer, onregler }: Props = $props();

  let edition = $state<{ article: string | null } | null>(null);
  let nouvelArticle = $state("");
  const pris = $derived(liste.articles.filter((a) => a.pris).length);
  /** Le prix de chaque article d'après nos tickets, et le magasin le moins cher pour toute la liste. */
  const base = $derived(s.donnees ? baseDePrix(s.donnees) : []);
  const estimation = $derived(estimerListe(liste.articles.map((a) => a.nom), base));
  const autres = $derived(estimation.magasins.slice(1, 4));

  /** Met le curseur dans le champ qui vient d'apparaître et sélectionne son texte. */
  function focaliser(noeud: HTMLInputElement): void {
    noeud.focus();
    noeud.select();
  }

  function terminer(valeur: string, enregistrer: boolean): void {
    const courante = edition;
    edition = null;
    if (!enregistrer || !courante || valeur.trim() === "") return;
    s.appliquer((d) => (courante.article ? renommerArticle(d, liste.id, courante.article, valeur) : renommerListe(d, liste.id, valeur)));
  }

  function ajouter(): void {
    if (nouvelArticle.trim() === "") return;
    if (s.appliquer((d) => ajouterArticle(d, liste.id, nouvelArticle))) nouvelArticle = "";
  }
</script>

{#snippet nom(texte: string, article: string | null)}
  {#if edition && edition.article === article}
    <input
      class="saisie edition"
      value={texte}
      aria-label="Modifier le nom"
      use:focaliser
      onkeydown={(e) => {
        if (e.key === "Enter") terminer(e.currentTarget.value, true);
        else if (e.key === "Escape") terminer("", false);
      }}
      onblur={(e) => terminer(e.currentTarget.value, true)}
    />
    <button class="btn sm" onmousedown={(e) => e.preventDefault()}>Valider</button>
  {:else}
    <button class="nom" class:article={article !== null} title="Cliquer pour modifier" onclick={() => (edition = { article })}>{texte}</button>
  {/if}
{/snippet}

<div class="carte">
  <div class="tete">
    {#if !plein}<button class="chevron" onclick={onbasculer} aria-expanded={ouverte} aria-label="{ouverte ? 'Replier' : 'Déplier'} {liste.nom}"><Icon name={ouverte ? "chevron-down" : "chevron-right"} size={18} /></button>{/if}
    {@render nom(liste.nom, null)}
    <span class="num petit compte">{pris}/{liste.articles.length}</span>
  </div>
  {#if ouverte}
    <div class="corps">
      {#each liste.articles as a, i (a.id)}
        <div class="article" class:fait={a.pris}>
          <button class="coche" aria-pressed={a.pris} aria-label="{a.pris ? 'Pris' : 'Marquer comme pris'} : {a.nom}" onclick={() => s.appliquer((d) => basculerPris(d, liste.id, a.id))}><Icon name="check" size={22} strokeWidth={3} /></button>
          <span class="texte">{@render nom(a.nom, a.id)}</span>
          {#if estimation.lignes[i]?.prixCents != null}<span class="est num petit" title="Estimé d'après « {estimation.lignes[i]?.connu} » dans {estimation.conseille?.magasin}">≈ {formatEuros(estimation.lignes[i]!.prixCents!)}</span>{/if}
          <button class="retrait" aria-label="Retirer {a.nom}" onclick={() => s.appliquer((d) => retirerArticle(d, liste.id, a.id))}><Icon name="x" size={16} /></button>
        </div>
      {:else}
        <span class="petit">Liste vide.</span>
      {/each}
      {#if estimation.conseille}
        <div class="conseil">
          <div class="haut">
            <span>Magasin conseillé</span>
            <b>{estimation.conseille.magasin}</b>
            <span class="num total">≈ {formatEuros(estimation.conseille.totalCents)}</span>
          </div>
          <p class="petit">
            {estimation.connus} article{estimation.connus > 1 ? "s" : ""} sur {estimation.total} chiffré{estimation.connus > 1 ? "s" : ""} d'après vos tickets{estimation.conseille.vusIci < estimation.connus ? ` (${estimation.conseille.vusIci} vus dans ce magasin, les autres complétés)` : ""}.
            {#each autres as m (m.magasin)}<span class="autre">{m.magasin} ≈ {formatEuros(m.totalCents)}</span>{/each}
          </p>
        </div>
      {:else if base.length === 0 && liste.articles.length > 0}
        <p class="petit conseil-vide">Scannez des tickets pour estimer cette liste et trouver le magasin le moins cher.</p>
      {/if}
      <div class="ajout">
        <input class="saisie" bind:value={nouvelArticle} placeholder="Ajouter un article" aria-label="Nouvel article" autocomplete="off" onkeydown={(e) => e.key === "Enter" && ajouter()} />
        <button class="btn" onclick={ajouter}>Ajouter</button>
      </div>
      <p class="petit" style="margin: 8px 0 0">Un article non coché n'empêche pas de régler : vous ne l'avez peut-être pas pris ou pas trouvé.</p>
      <button class="btn primary regler" onclick={onregler}>Régler la course</button>
    </div>
  {/if}
</div>

<style>
  .carte {
    padding: 10px 14px;
    border: 1px solid var(--border);
    border-radius: 12px;
    background: var(--surface-2);
  }
  .tete {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .compte {
    margin-left: auto;
  }
  .chevron {
    width: 26px;
    border: 0;
    background: none;
    color: var(--muted);
    display: grid;
    place-items: center;
    cursor: pointer;
  }
  .nom {
    padding: 2px 4px;
    border: 0;
    border-radius: 6px;
    background: none;
    font-size: 15px;
    font-weight: 700;
    text-align: left;
    cursor: text;
  }
  .nom.article {
    font-size: 14px;
    font-weight: 500;
  }
  .nom:hover {
    background: var(--surface);
    text-decoration: underline dotted;
  }
  .edition {
    flex: 1;
    min-width: 0;
    height: 32px;
  }
  .corps {
    display: flex;
    flex-direction: column;
    margin-top: 8px;
  }
  .article {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 7px 0;
    border-bottom: 1px solid var(--border);
  }
  .texte {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .fait .nom {
    color: var(--faint);
    text-decoration: line-through;
  }
  .coche {
    flex: none;
    width: 40px;
    height: 40px;
    border: 2px solid var(--border);
    border-radius: 10px;
    background: var(--surface);
    color: var(--faint);
    display: grid;
    place-items: center;
    padding: 0;
    cursor: pointer;
  }
  .coche[aria-pressed="true"] {
    border-color: var(--accent);
    background: var(--accent);
    color: var(--accent-text);
  }
  .retrait {
    width: 28px;
    height: 28px;
    border: 0;
    border-radius: 6px;
    background: none;
    color: var(--faint);
    display: grid;
    place-items: center;
    padding: 0;
    cursor: pointer;
  }
  .retrait:hover {
    color: var(--err);
    background: var(--surface);
  }
  .ajout {
    display: flex;
    gap: 8px;
    margin-top: 10px;
  }
  .regler {
    align-self: flex-start;
    margin-top: 12px;
  }
  .est {
    flex: none;
    color: var(--muted);
  }
  .conseil {
    margin-top: 12px;
    padding: 10px 12px;
    border-radius: 10px;
    background: var(--accent-soft);
  }
  .conseil .haut {
    display: flex;
    align-items: baseline;
    gap: 8px;
    flex-wrap: wrap;
  }
  .conseil .haut b {
    font-size: 15px;
  }
  .conseil .total {
    margin-left: auto;
    font-weight: 700;
  }
  .conseil p {
    margin: 4px 0 0;
  }
  .autre {
    margin-left: 10px;
    white-space: nowrap;
  }
  .conseil-vide {
    margin: 10px 0 0;
  }</style>