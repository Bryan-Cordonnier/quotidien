<script lang="ts">
  // Proposer des repas : l'IA part de nos prix connus (tickets scannés), puis d'internet si on l'autorise, et propose des plats avec la liste
  // de courses qui va avec, dans le budget. On garde ou retire des plats, le total se recalcule, puis on crée la liste de courses.
  import { Icon, Jauge, Modal } from "@etabli/ui";
  import { formatEuros, parseEuros } from "@etabli/ui/money";
  import { budgetDisponible } from "../../src/calculs";
  import { creerListe } from "../../src/donnees";
  import { listeDepuisPlats, texteArticle, type Plat } from "../../src/menu";
  import type { Session } from "../../src/session.svelte";

  let { s, onclose, onfini }: { s: Session; onclose: () => void; onfini?: () => void } = $props();

  type Etape = "formulaire" | "attente" | "resultat";
  let etape = $state<Etape>("formulaire");
  let message = $state("");

  // Le budget proposé : ce qu'il reste cette semaine, ou le budget entier s'il ne reste presque rien.
  const reste = $derived(s.donnees ? budgetDisponible(s.donnees, s.reglages, s.aujourdhui).disponibleCents : 0);
  // Fixé à l'ouverture : le champ reste ce que l'utilisateur écrit ensuite.
  // svelte-ignore state_referenced_locally
  const budgetDepart = reste >= 2000 ? reste : s.reglages.budgetCents;
  let personnes = $state(2);
  let repas = $state(5);
  let budget = $state(formatEuros(budgetDepart).replace(/\s?€/, "").replace(/\u202f|\u00a0/g, ""));
  let envies = $state("");
  let internet = $state(true);

  let plats = $state<Plat[]>([]);
  let dejaVus = $state<string[]>([]);
  let nom = $state("");

  const budgetCents = $derived(parseEuros(budget) ?? 0);
  const liste = $derived(listeDepuisPlats(plats));
  const depassement = $derived(Math.max(0, liste.totalCents - budgetCents));
  const pourcent = $derived(budgetCents > 0 ? Math.min(100, (liste.totalCents / budgetCents) * 100) : 0);

  async function proposer(plusEconomique = false): Promise<void> {
    if (budgetCents <= 0) {
      message = "Le budget s'écrit comme 45 ou 45,50.";
      return;
    }
    const avant = depassement;
    message = "";
    etape = "attente";
    const r = await s.proposerRepas({
      personnes: Math.min(12, Math.max(1, Math.round(personnes) || 1)),
      repas: Math.min(14, Math.max(1, Math.round(repas) || 1)),
      budgetCents,
      envies,
      internet,
      aEviter: dejaVus,
      ...(plusEconomique && avant > 0 ? { depassementCents: avant } : {}),
    });
    if (!r.ok) {
      message = r.message;
      etape = plats.length > 0 ? "resultat" : "formulaire";
      return;
    }
    plats = r.plats;
    dejaVus = [...new Set([...dejaVus, ...r.plats.map((p) => p.nom)])].slice(-30);
    nom = nom || `Repas du ${new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}`;
    etape = "resultat";
  }

  const retirer = (i: number): void => void (plats = plats.filter((_, k) => k !== i));

  function creer(): void {
    if (liste.lignes.length === 0) {
      message = "Gardez au moins un plat.";
      return;
    }
    const intitule = nom.trim() || "Repas de la semaine";
    if (s.appliquer((d) => creerListe(d, intitule, liste.lignes.map(texteArticle)).donnees)) {
      onfini?.();
      onclose();
    } else message = s.message;
  }
</script>

<Modal open titre="Proposer des repas" {onclose} largeur={860}>
  {#if etape === "resultat"}
    <div class="synthese">
      <div class="totaux">
        <span class="grand num" class:negatif={depassement > 0}>{formatEuros(liste.totalCents)}</span>
        <span class="petit">pour {plats.length} plat{plats.length > 1 ? "s" : ""}, budget {formatEuros(budgetCents)}</span>
      </div>
      <Jauge pourcent={pourcent} niveau={depassement > 0 ? "alerte" : pourcent > 85 ? "attention" : "normal"} gauche={depassement > 0 ? `Dépasse de ${formatEuros(depassement)}` : `Reste ${formatEuros(budgetCents - liste.totalCents)}`} droite="{Math.round(pourcent)} %" label="Part du budget" />
    </div>
    {#if message}<p class="negatif" role="alert" style="margin: 8px 0 0">{message}</p>{/if}

    <div class="plats">
      {#each plats as p, i (p.nom)}
        <article class="plat">
          <header>
            <b>{p.nom}</b>
            <span class="num cout">{formatEuros(p.coutCents)}</span>
            <button class="retrait" onclick={() => retirer(i)} aria-label="Retirer {p.nom}" title="Retirer ce plat"><Icon name="x" size={16} /></button>
          </header>
          {#if p.resume}<p class="petit resume">{p.resume}</p>{/if}
          <ul>
            {#each p.ingredients as ing (ing.nom)}<li><span>{ing.nom}{ing.quantite ? ` · ${ing.quantite}` : ""}</span><span class="num petit">{formatEuros(ing.prixCents)}</span></li>{/each}
          </ul>
        </article>
      {/each}
    </div>

    <div class="liste">
      <p class="etiquette">Liste de courses ({liste.lignes.length} article{liste.lignes.length > 1 ? "s" : ""})</p>
      <ul class="articles">
        {#each liste.lignes as l (l.nom)}<li><span>{texteArticle(l)}</span><span class="num petit">{formatEuros(l.prixCents)}</span></li>{/each}
      </ul>
      <div class="groupe" style="margin-top: 10px">
        <label for="m-nom">Nom de la liste</label>
        <input id="m-nom" class="saisie" bind:value={nom} autocomplete="off" />
      </div>
    </div>
  {:else if etape === "attente"}
    <p class="attente" role="status">L'IA prépare vos repas{internet ? " (elle cherche aussi sur internet)" : ""}… environ 10 à 30 secondes.</p>
  {:else}
    <p class="petit" style="margin: 0 0 14px">
      L'IA part de vos prix déjà vus sur vos tickets ({s.nbPrixConnus} article{s.nbPrixConnus > 1 ? "s" : ""} connu{s.nbPrixConnus > 1 ? "s" : ""}){internet ? ", puis cherche sur internet ce qui manque" : ""}, et propose des plats avec leur liste de courses dans le budget.
    </p>
    <div class="grille-2">
      <div class="groupe"><label for="m-pers">Personnes</label><input id="m-pers" class="saisie num" type="number" min="1" max="12" bind:value={personnes} /></div>
      <div class="groupe"><label for="m-repas">Repas à prévoir</label><input id="m-repas" class="saisie num" type="number" min="1" max="14" bind:value={repas} /></div>
    </div>
    <div class="groupe" style="margin-top: 10px">
      <label for="m-budget">Budget (€)</label>
      <input id="m-budget" class="saisie num" bind:value={budget} inputmode="decimal" autocomplete="off" />
      <span class="petit">Proposé : {reste >= 2000 ? "ce qu'il reste cette semaine" : "le budget de la semaine"}.</span>
    </div>
    <div class="groupe" style="margin-top: 10px">
      <label for="m-envies">Envies et contraintes (facultatif)</label>
      <input id="m-envies" class="saisie" bind:value={envies} placeholder="sans poisson, rapide, plutôt végétarien…" autocomplete="off" />
    </div>
    <label class="internet"><input type="checkbox" bind:checked={internet} /> Chercher aussi sur internet (recettes, prix qui manquent)</label>
    {#if message}<p class="negatif" role="alert" style="margin: 10px 0 0">{message}</p>{/if}
  {/if}

  {#snippet pied()}
    {#if etape === "resultat"}
      <button class="btn" onclick={() => proposer(false)}>Autre proposition</button>
      {#if depassement > 0}<button class="btn" onclick={() => proposer(true)}>Moins cher</button>{/if}
      <button class="btn primary" onclick={creer}><Icon name="check" size={16} /> Créer la liste de courses</button>
    {:else if etape === "formulaire"}
      <button class="btn" onclick={onclose}>Annuler</button>
      <button class="btn primary" onclick={() => proposer(false)}>Proposer des repas</button>
    {:else}
      <button class="btn" onclick={onclose}>Fermer</button>
    {/if}
  {/snippet}
</Modal>

<style>
  .synthese {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .totaux {
    display: flex;
    align-items: baseline;
    gap: 12px;
  }
  .grand {
    font-size: 30px;
    font-weight: 600;
  }
  .plats {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 10px;
    margin-top: 14px;
  }
  .plat {
    padding: 12px 14px;
    border: 1px solid var(--border);
    border-radius: 12px;
    background: var(--surface-2);
  }
  .plat header {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .plat header b {
    flex: 1;
    min-width: 0;
  }
  .cout {
    font-weight: 700;
  }
  .resume {
    margin: 4px 0 6px;
  }
  .plat ul,
  .articles {
    margin: 6px 0 0;
    padding: 0;
    list-style: none;
    font-size: 13px;
  }
  .plat li,
  .articles li {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    padding: 2px 0;
  }
  .liste {
    margin-top: 16px;
  }
  .articles {
    max-height: 200px;
    overflow: auto;
    columns: 2 220px;
  }
  .attente {
    margin: 30px 0;
    text-align: center;
    color: var(--muted);
  }
  .internet {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 14px 0 0;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
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
    background: var(--surface);
  }
</style>