<script lang="ts">
  // Une liste en cours, dépliable : son nom et ses articles se modifient sur place (un clic sur le nom, Entrée ou « Valider »).
  // Chaque article a un gros bouton ✓ (« dans le caddie ») et une petite croix pour le retirer. « Régler la course » est tout en bas ;
  // un article non coché n'empêche jamais de régler.
  import { ajouterArticle, basculerPris, renommerArticle, renommerListe, retirerArticle } from "../../src/donnees";
  import type { Session } from "../../src/session.svelte";
  import type { Liste } from "../../src/types";

  interface Props {
    s: Session;
    liste: Liste;
    ouverte: boolean;
    onbasculer: () => void;
    onregler: () => void;
  }

  let { s, liste, ouverte, onbasculer, onregler }: Props = $props();

  let edition = $state<{ article: string | null } | null>(null);
  let nouvelArticle = $state("");
  const pris = $derived(liste.articles.filter((a) => a.pris).length);

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
    <button class="chevron" onclick={onbasculer} aria-expanded={ouverte} aria-label="{ouverte ? 'Replier' : 'Déplier'} {liste.nom}">{ouverte ? "▾" : "▸"}</button>
    {@render nom(liste.nom, null)}
    <span class="num petit compte">{pris}/{liste.articles.length}</span>
  </div>
  {#if ouverte}
    <div class="corps">
      {#each liste.articles as a (a.id)}
        <div class="article" class:fait={a.pris}>
          <button class="coche" aria-pressed={a.pris} aria-label="{a.pris ? 'Pris' : 'Marquer comme pris'} : {a.nom}" onclick={() => s.appliquer((d) => basculerPris(d, liste.id, a.id))}>✓</button>
          <span class="texte">{@render nom(a.nom, a.id)}</span>
          <button class="retrait" aria-label="Retirer {a.nom}" onclick={() => s.appliquer((d) => retirerArticle(d, liste.id, a.id))}>×</button>
        </div>
      {:else}
        <span class="petit">Liste vide.</span>
      {/each}
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
    font-size: 16px;
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
    font-size: 18px;
    font-weight: 800;
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
    font-size: 18px;
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
</style>