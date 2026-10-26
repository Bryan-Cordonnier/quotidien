<script lang="ts">
  // Repas : la semaine qui défile (aujourd'hui au milieu, trois jours avant et après), matin, midi et soir. Chaque case dit quoi manger,
  // à quelle heure, et quand commencer à cuisiner (d'après le temps de la recette ; posé aussi dans l'Agenda). En haut, les alertes
  // (rien de prévu, pas de liste de courses) ; en bas, les repas favoris. Tout se coupe tant qu'on ne gère pas ses repas soi-même.
  import { Bloc, Entete, Modal, SelectField } from "@etabli/ui";
  import { ajouterJours } from "@etabli/ui/civil";
  import { alertes, caseDe, grille, type Case } from "../../src/semaine";
  import { Session } from "../../src/session.svelte";
  import { LIBELLES_MOMENTS, MOMENTS, type Moment } from "../../src/types";

  const s = new Session();
  void s.demarrer();

  let decalage = $state(0);
  const centre = $derived(ajouterJours(s.aujourdhui, decalage));
  const cases = $derived(s.donnees ? grille(s.donnees, centre) : []);
  const maintenantMin = new Date().getHours() * 60 + new Date().getMinutes();
  const lesAlertes = $derived(s.donnees ? alertes(s.donnees, s.aujourdhui, s.courses.listes.length, maintenantMin) : []);
  const favoris = $derived((s.donnees?.recettes ?? []).filter((r) => r.favori));
  const reglages = $derived(s.donnees?.reglages);

  const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
  const enMinutes = (t: string): number | null => {
    const m = /^(\d{1,2}):(\d{2})$/.exec(t);
    return m ? Number(m[1]) * 60 + Number(m[2]) : null;
  };
  const jourCourt = (j: string) => new Date(`${j}T12:00:00`).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" });

  // Fenêtre d'une case : choisir une recette (favorite d'abord) ou écrire un plat, et l'heure visée.
  let edition = $state<{ jour: string; moment: Moment; plat: string; recetteId: string; heure: string } | null>(null);
  function ouvrir(c: Case): void {
    edition = { jour: c.jour, moment: c.moment, plat: c.plat, recetteId: c.recette?.id ?? "", heure: hhmm(c.heureMin) };
  }
  function enregistrer(): void {
    if (!edition) return;
    const recette = s.donnees?.recettes.find((r) => r.id === edition!.recetteId);
    const heure = enMinutes(edition.heure);
    const habituelle = reglages?.heures[edition.moment];
    if (s.prevoirRepas({ jour: edition.jour, moment: edition.moment, plat: edition.plat.trim() || recette?.nom || "", recetteId: recette?.id ?? null, heureMin: heure === habituelle ? null : heure })) edition = null;
  }
  function effacer(): void {
    if (edition && s.prevoirRepas({ jour: edition.jour, moment: edition.moment, plat: "", recetteId: null, heureMin: null })) edition = null;
  }
  let reglagesOuverts = $state(false);
</script>

<div class="page-plugin">
  <Entete titre="Repas" />

  {#if s.illisible}
    <section class="bloc"><p class="negatif">{s.illisible}</p></section>
  {:else if s.donnees && reglages}
    <div class="barre">
      <label class="interrupteur">
        <input type="checkbox" checked={reglages.actif} onchange={(e) => s.reglerRepas({ actif: e.currentTarget.checked })} />
        Je gère mes repas (semaine, heure de cuisine, alertes)
      </label>
      <button class="btn sm" onclick={() => (reglagesOuverts = true)}>Heures des repas</button>
    </div>

    {#if !reglages.actif}
      <section class="bloc">
        <p class="etiquette">Repas en pause</p>
        <p>Tu ne gères pas tes repas en ce moment : pas d'alertes, rien dans l'Agenda. Tu peux quand même noter ce que tu manges ci-dessous, et tes recettes restent dans « Recettes ».</p>
      </section>
    {/if}

    {#each lesAlertes as a (a.texte)}
      <p class="alerte" class:urgent={a.niveau === "urgent"} role="status">{a.niveau === "urgent" ? "⚠️" : "ℹ️"} {a.texte}</p>
    {/each}

    <Bloc titre="La semaine" sousTitre="Aujourd'hui au milieu · touche une case pour prévoir le repas" titreGrand="La semaine en grand" largeur={1200}>
      {@render semaine(false)}
      {#snippet grand()}{@render semaine(true)}{/snippet}
    </Bloc>

    <Bloc titre="Mes repas favoris" sousTitre="Les recettes étoilées dans « Recettes »">
      {#if favoris.length === 0}
        <p class="petit">Aucun favori : étoile une recette dans « Recettes ».</p>
      {:else}
        <div class="favoris">
          {#each favoris as r (r.id)}
            <article class="favori">
              {#if r.photo}<img src={r.photo} alt="" />{:else}<span class="sans-photo">🍽️</span>{/if}
              <b>{r.nom}</b>
              <span class="petit">{r.tempsMin ? `${r.tempsMin} min` : ""}{r.note ? ` · ${"★".repeat(r.note)}` : ""}</span>
            </article>
          {/each}
        </div>
      {/if}
    </Bloc>
  {:else}
    <p class="petit">Chargement…</p>
  {/if}
</div>

{#snippet semaine(large: boolean)}
  <div class="navigation">
    <button class="btn sm" onclick={() => (decalage -= 1)} aria-label="Jour précédent">‹</button>
    <button class="btn sm" onclick={() => (decalage = 0)} disabled={decalage === 0}>Aujourd'hui</button>
    <button class="btn sm" onclick={() => (decalage += 1)} aria-label="Jour suivant">›</button>
  </div>
  <div class="tableau" class:large>
    <div></div>
    {#each cases as jour, i (jour[0]!.jour)}
      <div class="tete" class:aujourdhui={jour[0]!.jour === s.aujourdhui} class:centre={i === 3}>{jourCourt(jour[0]!.jour)}</div>
    {/each}
    {#each MOMENTS as m, mi (m)}
      <div class="moment">{LIBELLES_MOMENTS[m]}</div>
      {#each cases as jour (jour[0]!.jour)}
        {@const c = jour[mi]!}
        <button class="case" class:vide={!c.plat} class:aujourdhui={c.jour === s.aujourdhui} onclick={() => ouvrir(c)}>
          {#if c.plat}
            <b>{c.plat}</b>
            <span class="petit">{hhmm(c.heureMin)}{c.cuisinerMin !== null ? ` · cuisiner à ${hhmm(c.cuisinerMin)}` : ""}</span>
          {:else}
            <span class="petit">+</span>
          {/if}
        </button>
      {/each}
    {/each}
  </div>
{/snippet}

<Modal open={edition !== null} titre="Prévoir le repas" largeur={480} onclose={() => (edition = null)}>
  {#if edition}
    <p class="petit">{new Date(`${edition.jour}T12:00:00`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })} · {LIBELLES_MOMENTS[edition.moment]}</p>
    <label class="champ">Recette
      <SelectField compact label="Recette" bind:value={edition.recetteId}
        options={[{ value: "", label: "Aucune (je l'écris)" }, ...[...(s.donnees?.recettes ?? [])].sort((a, b) => Number(b.favori) - Number(a.favori) || a.nom.localeCompare(b.nom)).map((r) => ({ value: r.id, label: `${r.favori ? "★ " : ""}${r.nom}${r.tempsMin ? ` (${r.tempsMin} min)` : ""}` }))]} />
    </label>
    <label class="champ">Plat (si pas de recette)<input class="saisie" bind:value={edition.plat} placeholder="Ex. : repas chez mamie" /></label>
    <label class="champ">Je veux manger à<input class="saisie" type="time" bind:value={edition.heure} /></label>
    {@const recette = s.donnees?.recettes.find((r) => r.id === edition!.recetteId)}
    {@const h = enMinutes(edition.heure)}
    {#if recette?.tempsMin && h !== null}<p class="petit">Commencer à cuisiner à <b>{hhmm(h - recette.tempsMin)}</b> (ajouté à l'Agenda).</p>{/if}
    <div class="actions">
      <button class="btn primary" onclick={enregistrer}>Enregistrer</button>
      {#if caseDe(s.donnees!, edition.jour, edition.moment).origine === "saisi"}<button class="btn" onclick={effacer}>Effacer</button>{/if}
    </div>
  {/if}
</Modal>

<Modal open={reglagesOuverts} titre="Heures des repas" largeur={420} onclose={() => (reglagesOuverts = false)}>
  {#if reglages}
    {#each MOMENTS as m (m)}
      <label class="champ">{LIBELLES_MOMENTS[m]}
        <input class="saisie" type="time" value={hhmm(reglages.heures[m])} onchange={(e) => {
          const v = enMinutes(e.currentTarget.value);
          if (v !== null) s.reglerRepas({ heures: { ...reglages.heures, [m]: v } });
        }} />
      </label>
    {/each}
    <label class="interrupteur"><input type="checkbox" checked={reglages.alertes} onchange={(e) => s.reglerRepas({ alertes: e.currentTarget.checked })} /> Alertes (rien de prévu, courses à faire)</label>
  {/if}
</Modal>

<style>
  .barre {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }
  .interrupteur {
    display: flex;
    gap: 8px;
    align-items: center;
  }
  .alerte {
    margin: 0;
    padding: 8px 12px;
    border-radius: 10px;
    background: var(--surface-2);
    border: 1px solid var(--border);
  }
  .alerte.urgent {
    border-color: var(--err);
  }
  .navigation {
    display: flex;
    gap: 6px;
    margin: 8px 0;
  }
  .tableau {
    display: grid;
    grid-template-columns: 90px repeat(7, minmax(0, 1fr));
    gap: 6px;
  }
  .tableau.large {
    grid-template-columns: 110px repeat(7, minmax(120px, 1fr));
  }
  .tete {
    text-align: center;
    font-size: 12px;
    font-weight: 700;
    color: var(--muted);
    padding: 4px;
    border-radius: 8px;
  }
  .tete.aujourdhui {
    background: var(--accent);
    color: var(--accent-text, #fff);
  }
  .moment {
    font-size: 12px;
    color: var(--muted);
    align-self: center;
  }
  .case {
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-height: 58px;
    padding: 6px 8px;
    border: 1px solid var(--border);
    border-radius: 10px;
    background: var(--surface-2);
    color: var(--text);
    text-align: left;
    cursor: pointer;
    font: inherit;
    font-size: 12.5px;
    overflow: hidden;
  }
  .case.vide {
    align-items: center;
    justify-content: center;
    border-style: dashed;
    background: none;
  }
  .case.aujourdhui {
    border-color: var(--accent);
  }
  .case b {
    font-weight: 600;
    overflow-wrap: anywhere;
  }
  @media (max-width: 760px) {
    .tableau,
    .tableau.large {
      grid-template-columns: 70px repeat(7, minmax(70px, 1fr));
      overflow-x: auto;
    }
  }
  .favoris {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 10px;
    margin-top: 8px;
  }
  .favori {
    display: grid;
    gap: 4px;
    padding: 8px;
    border: 1px solid var(--border);
    border-radius: 10px;
    background: var(--surface-2);
  }
  .favori img,
  .sans-photo {
    width: 100%;
    aspect-ratio: 4 / 3;
    object-fit: cover;
    border-radius: 8px;
    display: grid;
    place-items: center;
    background: var(--field);
    font-size: 28px;
  }
  .champ {
    display: grid;
    gap: 4px;
    font-size: 12px;
    color: var(--muted);
    margin-top: 8px;
  }
  .actions {
    display: flex;
    gap: 8px;
    margin-top: 12px;
  }
</style>
