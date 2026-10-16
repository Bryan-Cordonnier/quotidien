<script lang="ts">
  // Concocter : un questionnaire pas à pas (quand, quels repas et pour combien, le budget, les envies), puis l'IA propose les plats et la liste de
  // courses ; les prix et le magasin le moins cher sont recalculés avec nos prix (tickets et relevés). Le plan est gardé, ses nouvelles recettes
  // peuvent rejoindre la bibliothèque, et la liste part dans Courses d'un clic.
  import { Entete } from "@etabli/ui";
  import { ajouterJours, type Jour } from "@etabli/ui/civil";
  import { formatEuros, parseEuros } from "@etabli/ui/money";
  import { budget, casesParDefaut, debutConseille, joursDe, nomJour, repasVoulus, type Cases, type PropositionPlan, type Questionnaire } from "../../src/concocter";
  import { ajouterPlan, ajouterRecette, marquerEnvoye, supprimerPlan } from "../../src/donnees";
  import { chiffrer, type Chiffrage } from "../../src/prix";
  import { Session } from "../../src/session.svelte";
  import { LIBELLES_MOMENTS, MOMENTS, type Moment, type Plan } from "../../src/types";
  import ListeChiffree from "../../src/ui/ListeChiffree.svelte";

  const s = new Session();
  void s.demarrer();

  const ETAPES = ["Quand", "Les repas", "Le budget", "Vos envies"] as const;
  let etape = $state(0); // 0 : accueil ; 1-4 : questionnaire ; 5 : résultat
  let debut = $state<Jour>(s.aujourdhui);
  let jours = $state(7);
  let foyer = $state(1);
  let cases = $state<Cases>({});
  let economie = $state("");
  let envies = $state("");
  let occupe = $state(false);
  let erreur = $state("");
  let info = $state("");
  let proposition = $state<PropositionPlan | null>(null);
  let chiffrage = $state<Chiffrage | null>(null);
  let planOuvert = $state<Plan | null>(null);
  let planId = $state<string | null>(null);

  const q = $derived<Questionnaire>({ debut, jours, foyer, cases, economieCents: Math.max(0, parseEuros(economie) ?? 0), envies });
  const b = $derived(budget(q, s.courses.budgetSemaineCents));
  const nbRepas = $derived(repasVoulus(q).length);
  const libelleJour = (j: Jour) => `${nomJour(j)} ${Number(j.slice(8))}`;

  function commencer(): void {
    foyer = s.foyer;
    debut = debutConseille(s.aujourdhui, s.courses.jourCourses);
    jours = 7;
    cases = casesParDefaut(debut, jours, foyer);
    economie = "";
    envies = "";
    erreur = info = "";
    proposition = null;
    planOuvert = null;
    etape = 1;
  }

  /** Garde les réglages déjà faits quand on change le premier jour ou le nombre de jours. */
  function recadrer(): void {
    const neuf = casesParDefaut(debut, jours, foyer);
    for (const j of Object.keys(neuf)) if (cases[j]) neuf[j] = { ...cases[j]! };
    cases = neuf;
  }

  function regler(j: Jour, m: Moment, delta: number): void {
    const v = Math.min(60, Math.max(0, (cases[j]?.[m] ?? 0) + delta));
    cases = { ...cases, [j]: { ...cases[j]!, [m]: v } };
  }
  const basculer = (j: Jour, m: Moment) => regler(j, m, (cases[j]?.[m] ?? 0) > 0 ? -(cases[j]![m]) : foyer);

  function partout(moments: readonly Moment[], personnes: number): void {
    cases = Object.fromEntries(Object.entries(cases).map(([j, c]) => [j, { ...c, ...Object.fromEntries(moments.map((m) => [m, personnes])) }]));
  }

  async function lancer(): Promise<void> {
    erreur = info = "";
    occupe = true;
    const r = await s.concocter(q);
    occupe = false;
    if (typeof r === "string") {
      erreur = r;
      return;
    }
    proposition = r;
    chiffrage = chiffrer(r.courses.map((c) => ({ nom: c.nom, pour: c.pour, unites: c.unites, estimeCents: c.estimeCents })), s.base);
    // le plan est gardé aussitôt (historique) ; les nouvelles recettes attendent l'accord
    const c = chiffrage;
    let id: string | null = null;
    s.appliquer((d) => {
      const a = ajouterPlan(d, {
        cree: s.aujourdhui,
        debut,
        jours,
        budgetCents: b.viseCents,
        exceptionnel: b.exceptionnel,
        envies,
        repas: r.repas.map((x) => ({ jour: x.jour, moment: x.moment, personnes: x.personnes, plat: x.plat, recetteId: x.recetteId })),
        courses: c.lignes,
        magasinConseille: c.magasin,
        totaux: c.totaux,
        totalCents: c.totalCents,
        remarques: r.remarques,
        envoye: false,
      });
      id = a.id;
      return a.donnees;
    });
    planId = id;
    etape = 5;
  }

  const nouvelles = $derived(proposition ? proposition.repas.filter((r) => r.nouvelle !== null).filter((r, i, t) => t.findIndex((x) => x.nouvelle!.nom === r.nouvelle!.nom) === i) : []);

  function garderRecettes(): void {
    let n = 0;
    s.appliquer((d) => {
      let x = d;
      for (const r of nouvelles) {
        if (x.recettes.some((e) => e.nom.toLowerCase() === r.nouvelle!.nom.toLowerCase())) continue;
        x = ajouterRecette(x, { ...r.nouvelle!, source: "ia" }).donnees;
        n++;
      }
      return x;
    });
    info = n > 0 ? `${n} recette${n > 1 ? "s" : ""} ajoutée${n > 1 ? "s" : ""} à la bibliothèque.` : "Ces recettes sont déjà dans la bibliothèque.";
  }

  async function envoyer(lignes: { nom: string; unites: number }[], du: Jour, id: string | null): Promise<void> {
    const articles = lignes.map((l) => (l.unites > 1 ? `${l.unites} × ${l.nom}` : l.nom));
    const r = await s.envoyerACourses(`Repas du ${libelleJour(du)}`, articles);
    info = r.message;
    if (r.ok && id) s.appliquer((d) => marquerEnvoye(d, id));
  }

  function ouvrir(p: Plan): void {
    planOuvert = p;
    proposition = null;
    erreur = info = "";
    etape = 5;
  }

  const repasAffiches = $derived(
    proposition ? proposition.repas.map((r) => ({ jour: r.jour, moment: r.moment, personnes: r.personnes, plat: r.plat, recetteId: r.recetteId })) : (planOuvert?.repas ?? []),
  );
  const chiffrageAffiche = $derived<Chiffrage | null>(
    proposition ? chiffrage : planOuvert ? { totaux: planOuvert.totaux, magasin: planOuvert.magasinConseille, lignes: planOuvert.courses, totalCents: planOuvert.totalCents, inconnues: 0 } : null,
  );
  const parJour = $derived.by(() => {
    const m = new Map<Jour, typeof repasAffiches>();
    for (const r of repasAffiches) m.set(r.jour, [...(m.get(r.jour) ?? []), r]);
    return [...m];
  });
  const nomRecette = (id: string | null) => (id ? s.donnees?.recettes.find((r) => r.id === id)?.nom : undefined);
</script>

<div class="page-plugin">
  <Entete titre="Concocter">
    {#snippet actions()}
      {#if etape > 0}<button class="btn" onclick={() => (etape = 0)}>Retour</button>{/if}
    {/snippet}
  </Entete>

  {#if s.illisible}
    <section class="bloc"><p class="negatif">{s.illisible}</p></section>
  {:else if etape === 0}
    <section class="bloc accueil">
      <h2>Qu'est-ce qu'on mange ?</h2>
      <p class="petit">Quelques questions, puis l'IA prépare vos repas et la liste de courses la moins chère, dans votre budget.</p>
      <button class="btn primary grand" onclick={commencer}>Concocter mes repas</button>
      {#if !s.courses.disponible}<p class="petit">Courses ne répond pas : budget de 70 € par semaine et aucun prix de ticket.</p>{/if}
    </section>
    {#if s.donnees && s.donnees.plans.length > 0}
      <section class="bloc">
        <p class="bloc-titre">Derniers plans</p>
        {#each s.donnees.plans as p (p.id)}
          <div class="ligne-plan">
            <button class="lien" onclick={() => ouvrir(p)}>
              <b>{libelleJour(p.debut)}</b> · {p.jours} jours · {p.repas.length} repas · {formatEuros(p.totalCents)}{p.magasinConseille ? ` chez ${p.magasinConseille}` : ""}
            </button>
            {#if p.envoye}<span class="petit">envoyé à Courses</span>{/if}
            <button class="btn sm" onclick={() => s.appliquer((d) => supprimerPlan(d, p.id))} aria-label="Supprimer ce plan">✕</button>
          </div>
        {/each}
      </section>
    {/if}
  {:else if etape <= 4}
    <ol class="etapes" aria-label="Étapes">
      {#each ETAPES as nom, i (nom)}<li class:faite={i + 1 < etape} class:active={i + 1 === etape}>{i + 1}. {nom}</li>{/each}
    </ol>

    <section class="bloc">
      {#if etape === 1}
        <p class="bloc-titre">Pour quand ?</p>
        <div class="groupe">
          <label for="c-debut">Premier jour</label>
          <input id="c-debut" class="saisie" style="width: auto" type="date" bind:value={debut} onchange={recadrer} />
          <span class="petit">Proposé : le lendemain de vos courses ({["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"][s.courses.jourCourses]}).</span>
        </div>
        <div class="groupe">
          <span class="etiquette">Combien de jours</span>
          <div class="actions">
            {#each [3, 5, 7, 10, 14] as n (n)}<button class="btn {jours === n ? 'primary' : ''}" onclick={() => ((jours = n), recadrer())}>{n} jours</button>{/each}
          </div>
        </div>
        <div class="groupe">
          <label for="c-foyer">Personnes au foyer</label>
          <input id="c-foyer" class="saisie num" style="width: 90px" type="number" min="1" max="20" bind:value={foyer} />
        </div>
      {:else if etape === 2}
        <p class="bloc-titre">Quels repas, pour combien ?</p>
        <p class="petit">Touchez une case pour l'ajouter ou l'enlever ; + et − pour les invités.</p>
        <div class="actions">
          <button class="btn sm" onclick={() => partout(["midi", "soir"], foyer)}>Midi et soir partout</button>
          <button class="btn sm" onclick={() => partout(["matin"], foyer)}>Ajouter les petits-déjeuners</button>
          <button class="btn sm" onclick={() => partout(["matin", "midi", "soir"], 0)}>Tout enlever</button>
        </div>
        <div class="grille" style="--colonnes: {MOMENTS.length}">
          <span></span>
          {#each MOMENTS as m (m)}<span class="petit entete">{LIBELLES_MOMENTS[m]}</span>{/each}
          {#each joursDe(debut, jours) as j (j)}
            <span class="jour">{libelleJour(j)}</span>
            {#each MOMENTS as m (m)}
              {@const n = cases[j]?.[m] ?? 0}
              <div class="case" class:vide={n === 0}>
                <button class="bascule" onclick={() => basculer(j, m)} aria-label="{libelleJour(j)} {LIBELLES_MOMENTS[m]} : {n === 0 ? 'pas de repas' : `${n} personnes`}">{n === 0 ? "—" : `${n} pers.`}</button>
                {#if n > 0}<span class="plusmoins"><button onclick={() => regler(j, m, -1)} aria-label="Une personne de moins">−</button><button onclick={() => regler(j, m, 1)} aria-label="Une personne de plus">+</button></span>{/if}
              </div>
            {/each}
          {/each}
        </div>
        <p class="petit">{nbRepas} repas, {b.parts} parts.</p>
      {:else if etape === 3}
        <p class="bloc-titre">Le budget</p>
        <p>Budget de Courses : <b>{formatEuros(s.courses.budgetSemaineCents)}</b> par semaine, soit <b>{formatEuros(b.habituelCents)}</b> pour ces {jours} jours.</p>
        {#if b.exceptionnel}
          <p class="exception">
            Semaine exceptionnelle : {b.parts} parts au lieu de {b.partsHabituelles} d'habitude. Le budget suit le nombre de parts, au même prix par part :
            <b>{formatEuros(b.viseCents + q.economieCents)}</b>.
          </p>
        {/if}
        <div class="groupe">
          <label for="c-eco">Économiser (facultatif)</label>
          <input id="c-eco" class="saisie num" style="width: 140px" bind:value={economie} placeholder="0" inputmode="decimal" />
          <span class="petit">Budget visé : <b>{formatEuros(b.viseCents)}</b></span>
        </div>
      {:else}
        <p class="bloc-titre">Vos envies</p>
        <textarea class="saisie" rows="4" bind:value={envies} placeholder="Ex. : j'ai envie d'une pizza cette semaine, et un autre jour des pâtes carbo. Pas de poisson."></textarea>
        <p class="petit">
          L'IA tient compte de vos {s.donnees?.ustensiles.length ? `${s.donnees.ustensiles.length} ustensiles` : "ustensiles (à renseigner dans Recettes)"}, de vos {s.donnees?.recettes.length ?? 0} recettes{s.sante ? ", de vos objectifs de santé" : ""} et
          de {s.courses.prix.length + (s.donnees?.prix.length ?? 0)} prix connus.
        </p>
      {/if}
      {#if erreur}<p class="negatif" role="alert">{erreur}</p>{/if}
    </section>

    <div class="navigation">
      {#if etape > 1}<button class="btn" onclick={() => etape--} disabled={occupe}>Précédent</button>{:else}<span></span>{/if}
      {#if etape < 4}
        <button class="btn primary" onclick={() => etape++} disabled={etape === 2 && nbRepas === 0}>Suivant</button>
      {:else}
        <button class="btn primary" onclick={lancer} disabled={occupe || nbRepas === 0}>{occupe ? "L'IA concocte… (jusqu'à quelques minutes)" : "Concocter"}</button>
      {/if}
    </div>
  {:else}
    {#if proposition && proposition.remarques}<section class="bloc"><p style="margin: 0">{proposition.remarques}</p>{#if proposition.oublies > 0}<p class="petit">{proposition.oublies} repas n'ont pas été proposés : relancez si besoin.</p>{/if}</section>{/if}
    <div class="grille-2-1">
      <section class="bloc">
        <p class="bloc-titre">Les repas</p>
        {#each parJour as [jour, liste] (jour)}
          <div class="jour-plan">
            <b>{libelleJour(jour)}</b>
            {#each liste as r (r.moment)}
              <div class="repas"><span class="petit moment">{LIBELLES_MOMENTS[r.moment]}</span> {r.plat}{#if r.personnes > 1}<span class="petit"> · {r.personnes} pers.</span>{/if}{#if nomRecette(r.recetteId)}<span class="petit"> · recette</span>{/if}</div>
            {/each}
          </div>
        {/each}
        {#if nouvelles.length > 0}
          <button class="btn" onclick={garderRecettes}>Ajouter les {nouvelles.length} nouvelles recettes à ma bibliothèque</button>
        {/if}
      </section>
      <section class="bloc">
        <p class="bloc-titre">Les courses</p>
        {#if chiffrageAffiche}
          <ListeChiffree chiffrage={chiffrageAffiche} budgetCents={proposition ? b.viseCents : (planOuvert?.budgetCents ?? null)} />
          <div class="actions">
            <button class="btn primary" onclick={() => envoyer(chiffrageAffiche!.lignes, proposition ? debut : planOuvert!.debut, proposition ? planId : planOuvert!.id)}>Envoyer la liste à Courses</button>
            {#if proposition}<button class="btn" onclick={lancer} disabled={occupe}>{occupe ? "…" : "Refaire"}</button>{/if}
          </div>
        {/if}
      </section>
    </div>
    {#if info}<p class="petit" role="status">{info}</p>{/if}
    {#if erreur}<p class="negatif" role="alert">{erreur}</p>{/if}
  {/if}
  {#if s.message}<p class="negatif" role="alert">{s.message}</p>{/if}
</div>

<style>
  .accueil {
    text-align: center;
    padding: 28px 16px;
  }
  .accueil h2 {
    margin: 0 0 6px;
  }
  .grand {
    margin-top: 12px;
    padding: 12px 22px;
    font-size: 15px;
  }
  .etapes {
    display: flex;
    gap: 6px;
    list-style: none;
    padding: 0;
    margin: 0 0 12px;
    flex-wrap: wrap;
  }
  .etapes li {
    padding: 5px 10px;
    border-radius: 999px;
    background: var(--field);
    color: var(--muted);
    font-size: 12.5px;
  }
  .etapes li.active {
    background: var(--accent);
    color: var(--accent-text);
  }
  .etapes li.faite {
    color: var(--text);
  }
  .grille {
    display: grid;
    grid-template-columns: minmax(80px, auto) repeat(var(--colonnes), 1fr);
    gap: 6px;
    align-items: center;
    margin: 12px 0;
  }
  .entete {
    text-align: center;
  }
  .jour {
    text-transform: capitalize;
    font-weight: 600;
    font-size: 13px;
  }
  .case {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px;
    border-radius: var(--r-sm);
    background: var(--accent-soft);
  }
  .case.vide {
    background: var(--field);
  }
  .bascule {
    flex: 1;
    border: 0;
    background: none;
    font: inherit;
    font-size: 13px;
    color: var(--text);
    cursor: pointer;
    padding: 6px 2px;
  }
  .plusmoins button {
    width: 24px;
    height: 24px;
    border: 0;
    border-radius: 6px;
    background: var(--surface);
    cursor: pointer;
    font: inherit;
  }
  .exception {
    padding: 10px 12px;
    border-radius: var(--r-md);
    background: var(--accent-soft);
  }
  .navigation {
    display: flex;
    justify-content: space-between;
    margin-top: 12px;
  }
  .ligne-plan {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 0;
  }
  .lien {
    flex: 1;
    text-align: left;
    border: 0;
    background: none;
    font: inherit;
    color: var(--text);
    cursor: pointer;
    padding: 0;
  }
  .jour-plan {
    padding: 8px 0;
    border-bottom: 1px solid var(--border);
  }
  .jour-plan b {
    text-transform: capitalize;
  }
  .repas {
    padding: 2px 0;
  }
  .moment {
    display: inline-block;
    min-width: 92px;
  }
  textarea.saisie {
    width: 100%;
    resize: vertical;
  }
</style>
