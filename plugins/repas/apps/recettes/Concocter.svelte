<script lang="ts">
  // Concocter (onglet de Recettes) : créer plusieurs recettes d'un coup à partir de réglages. Questionnaire pas à pas (quand, chaque repas avec
  // ses invités, la manière de cuisiner, le budget, les envies), puis l'IA propose les plats et la liste de courses ; les prix et le magasin le
  // moins cher sont recalculés avec nos prix. Le plan est gardé, ses recettes rejoignent la bibliothèque, la liste part dans Courses d'un clic.
  import { Segmented } from "@etabli/ui";
  import { jourDeSemaine, type Jour } from "@etabli/ui/civil";
  import { formatEuros, parseEuros } from "@etabli/ui/money";
  import {
    budget,
    casesParDefaut,
    debutConseille,
    joursDe,
    LIBELLES_TEMPS,
    nomJour,
    PREFERENCES_DEFAUT,
    repasVoulus,
    TEMPS,
    type Cases,
    type Niveau,
    type Preferences,
    type PropositionPlan,
    type Questionnaire,
  } from "../../src/concocter";
  import { ajouterPlan, ajouterRecette, marquerEnvoye, supprimerPlan } from "../../src/donnees";
  import { chiffrer, type Chiffrage } from "../../src/prix";
  import { mettreATester } from "../../src/teste";
  import type { Session } from "../../src/session.svelte";
  import { LIBELLES_MOMENTS, MOMENTS, type Moment, type Plan } from "../../src/types";
  import ListeChiffree from "../../src/ui/ListeChiffree.svelte";

  let { s }: { s: Session } = $props();

  const ETAPES = ["Quand", "Repas et invités", "En cuisine", "Budget", "Envies"] as const;
  const DERNIERE = ETAPES.length;
  let etape = $state(0); // 0 : accueil ; 1-5 : questionnaire ; 6 : résultat
  // svelte-ignore state_referenced_locally
  let debut = $state<Jour>(s.aujourdhui);
  let jours = $state(7);
  let foyer = $state(1);
  let cases = $state<Cases>({});
  let economie = $state("");
  let envies = $state("");
  let preferences = $state<Preferences>({ ...PREFERENCES_DEFAUT });
  let occupe = $state(false);
  let erreur = $state("");
  let info = $state("");
  let proposition = $state<PropositionPlan | null>(null);
  let chiffrage = $state<Chiffrage | null>(null);
  let planOuvert = $state<Plan | null>(null);
  let planId = $state<string | null>(null);

  const q = $derived<Questionnaire>({ debut, jours, foyer, cases, economieCents: Math.max(0, parseEuros(economie) ?? 0), envies, preferences });
  const b = $derived(budget(q, s.courses.budgetSemaineCents));
  const voulus = $derived(repasVoulus(q));
  const nbInvites = $derived(voulus.reduce((t, r) => t + Math.max(0, r.personnes - foyer), 0));
  const libelleJour = (j: Jour) => `${nomJour(j)} ${Number(j.slice(8))}`;
  const weekend = (j: Jour) => jourDeSemaine(j) % 7 === 0 || jourDeSemaine(j) % 7 === 6;

  function commencer(): void {
    foyer = s.foyer;
    debut = debutConseille(s.aujourdhui, s.courses.jourCourses);
    jours = 7;
    cases = casesParDefaut(debut, jours, foyer);
    economie = envies = "";
    preferences = { ...PREFERENCES_DEFAUT };
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

  /** Le foyer change : chaque repas prévu garde ses invités. */
  function changerFoyer(n: number): void {
    const ancien = foyer;
    foyer = Math.min(20, Math.max(1, n));
    cases = Object.fromEntries(Object.entries(cases).map(([j, c]) => [j, Object.fromEntries(MOMENTS.map((m) => [m, c[m] > 0 ? Math.max(foyer, c[m] - ancien + foyer) : 0]))])) as Cases;
  }

  const fixer = (j: Jour, m: Moment, n: number) => (cases = { ...cases, [j]: { ...cases[j]!, [m]: Math.min(60, Math.max(0, n)) } });
  const invitesDe = (j: Jour, m: Moment) => Math.max(0, (cases[j]?.[m] ?? 0) - foyer);

  /** Un moment (tous les midis…) pour tout le monde ou pour personne. */
  function colonne(m: Moment, oui: boolean): void {
    cases = Object.fromEntries(Object.entries(cases).map(([j, c]) => [j, { ...c, [m]: oui ? Math.max(foyer, c[m]) : 0 }])) as Cases;
  }
  /** Un jour entier : absent (aucun repas) ou midi et soir. */
  function journee(j: Jour, oui: boolean): void {
    cases = { ...cases, [j]: oui ? { matin: cases[j]!.matin, midi: Math.max(foyer, cases[j]!.midi), soir: Math.max(foyer, cases[j]!.soir) } : { matin: 0, midi: 0, soir: 0 } };
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
    etape = DERNIERE + 1;
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
    // les recettes du plan : une fois la liste réglée et chaque repas passé, on demandera si je les ai faites
    const recettes = new Set((s.donnees?.plans.find((p) => p.id === id)?.repas ?? []).flatMap((x) => (x.recetteId ? [x.recetteId] : [])));
    if (r.ok && r.id) s.appliquer((d) => [...recettes].reduce((x, rid) => mettreATester(x, rid, r.id!, s.aujourdhui), d));
  }

  function ouvrir(p: Plan): void {
    planOuvert = p;
    proposition = null;
    erreur = info = "";
    etape = DERNIERE + 1;
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
  const OPTIONS_TEMPS = TEMPS.map((t) => ({ value: t, label: LIBELLES_TEMPS[t] }));
  const OPTIONS_NIVEAU: { value: Niveau; label: string }[] = [
    { value: "facile", label: "Facile" },
    { value: "moyen", label: "Moyen" },
    { value: "chef", label: "Je sais cuisiner" },
  ];
</script>

{#if etape === 0}
  <section class="bloc accueil">
    <h2>Qu'est-ce qu'on mange ?</h2>
    <p class="petit">Réglez les repas (invités compris), votre manière de cuisiner et le budget : l'IA crée les recettes et la liste de courses la moins chère.</p>
    <button class="btn primary grand" onclick={commencer}>Concocter des recettes</button>
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
          {#if p.envoye}<span class="pastille">envoyé</span>{/if}
          <button class="btn sm" onclick={() => s.appliquer((d) => supprimerPlan(d, p.id))} aria-label="Supprimer ce plan">✕</button>
        </div>
      {/each}
    </section>
  {/if}
{:else if etape <= DERNIERE}
  <ol class="etapes" aria-label="Étapes">
    {#each ETAPES as nom, i (nom)}
      <li class:faite={i + 1 < etape} class:active={i + 1 === etape}><button onclick={() => (etape = i + 1)} disabled={occupe}>{i + 1}. {nom}</button></li>
    {/each}
  </ol>

  <section class="bloc">
    {#if etape === 1}
      <p class="bloc-titre">Pour quand, pour qui ?</p>
      <div class="trois">
        <div class="groupe">
          <label for="c-debut">Premier jour</label>
          <input id="c-debut" class="saisie" type="date" bind:value={debut} onchange={recadrer} />
        </div>
        <div class="groupe">
          <span class="etiquette">Personnes au foyer</span>
          <div class="pas">
            <button class="btn" onclick={() => changerFoyer(foyer - 1)} aria-label="Une personne de moins">−</button><b class="num">{foyer}</b><button class="btn" onclick={() => changerFoyer(foyer + 1)} aria-label="Une personne de plus">+</button>
          </div>
        </div>
      </div>
      <div class="groupe">
        <span class="etiquette">Combien de jours</span>
        <div class="actions">
          {#each [1, 2, 3, 5, 7, 10, 14] as n (n)}<button class="btn sm {jours === n ? 'primary' : ''}" onclick={() => ((jours = n), recadrer())}>{n} jour{n > 1 ? "s" : ""}</button>{/each}
        </div>
      </div>
      <p class="petit">Proposé : à partir du lendemain de vos courses ({["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"][s.courses.jourCourses]}). Les invités se règlent repas par repas à l'étape suivante.</p>
    {:else if etape === 2}
      <p class="bloc-titre">Chaque repas, et qui vient</p>
      <div class="raccourcis">
        {#each MOMENTS as m (m)}
          <span class="petit">{LIBELLES_MOMENTS[m]} :</span>
          <button class="btn sm" onclick={() => colonne(m, true)}>tous</button>
          <button class="btn sm" onclick={() => colonne(m, false)}>aucun</button>
        {/each}
      </div>
      <div class="jours">
        {#each joursDe(debut, jours) as j (j)}
          {@const total = MOMENTS.reduce((t, m) => t + (cases[j]?.[m] ?? 0), 0)}
          <div class="jour-carte" class:we={weekend(j)} class:absent={total === 0}>
            <div class="jour-tete">
              <b>{libelleJour(j)}</b>
              <button class="btn sm" onclick={() => journee(j, total === 0)}>{total === 0 ? "Je mange là" : "Absent"}</button>
            </div>
            {#each MOMENTS as m (m)}
              {@const n = cases[j]?.[m] ?? 0}
              {@const inv = invitesDe(j, m)}
              <div class="repas-ligne" class:off={n === 0}>
                <label class="interrupteur">
                  <input type="checkbox" checked={n > 0} onchange={() => fixer(j, m, n > 0 ? 0 : foyer)} />
                  {LIBELLES_MOMENTS[m]}
                </label>
                {#if n > 0}
                  <span class="petit qui">{foyer}{inv > 0 ? ` + ${inv} invité${inv > 1 ? "s" : ""}` : ""}</span>
                  <span class="pas petitpas">
                    <button onclick={() => fixer(j, m, Math.max(foyer, n - 1))} disabled={inv === 0} aria-label="Un invité de moins, {libelleJour(j)} {LIBELLES_MOMENTS[m]}">−</button>
                    <button onclick={() => fixer(j, m, n + 1)} aria-label="Un invité de plus, {libelleJour(j)} {LIBELLES_MOMENTS[m]}">+ invité</button>
                  </span>
                {/if}
              </div>
            {/each}
          </div>
        {/each}
      </div>
      <p class="resume">{voulus.length} repas · {b.parts} parts{nbInvites > 0 ? ` · ${nbInvites} part${nbInvites > 1 ? "s" : ""} d'invités` : ""}</p>
    {:else if etape === 3}
      <p class="bloc-titre">En cuisine</p>
      <div class="groupe"><span class="etiquette">Temps pour cuisiner en semaine</span><Segmented options={OPTIONS_TEMPS} bind:value={preferences.tempsSemaine} label="Temps en semaine" /></div>
      <div class="groupe"><span class="etiquette">Le week-end</span><Segmented options={OPTIONS_TEMPS} bind:value={preferences.tempsWeekend} label="Temps le week-end" /></div>
      <div class="groupe"><span class="etiquette">Niveau</span><Segmented options={OPTIONS_NIVEAU} bind:value={preferences.niveau} label="Niveau" /></div>
      <label class="option"><input type="checkbox" bind:checked={preferences.restes} /> <span><b>Restes bienvenus</b><span class="petit"> — cuisiner en double pour un autre repas</span></span></label>
      <label class="option"><input type="checkbox" bind:checked={preferences.gamelles} /> <span><b>Gamelle les midis de semaine</b><span class="petit"> — plats qui se transportent</span></span></label>
      <label class="option"><input type="checkbox" bind:checked={preferences.batch} /> <span><b>Tout préparer le week-end</b><span class="petit"> — plats qui se gardent 3-4 jours</span></span></label>
    {:else if etape === 4}
      <p class="bloc-titre">Le budget</p>
      <div class="chiffres">
        <div><span class="petit">Budget Courses</span><b class="num">{formatEuros(s.courses.budgetSemaineCents)}</b><span class="petit">par semaine</span></div>
        <div><span class="petit">Pour {jours} jours</span><b class="num">{formatEuros(b.habituelCents)}</b><span class="petit">{b.partsHabituelles} parts d'habitude</span></div>
        <div class="vise"><span class="petit">Visé</span><b class="num">{formatEuros(b.viseCents)}</b><span class="petit">{b.parts} parts · {formatEuros(b.parts ? Math.round(b.viseCents / b.parts) : 0)}/part</span></div>
      </div>
      {#if b.exceptionnel}<p class="exception">Semaine exceptionnelle (beaucoup d'invités) : le budget suit le nombre de parts, au même prix par part.</p>{/if}
      <div class="groupe">
        <label for="c-eco">Économiser (facultatif)</label>
        <input id="c-eco" class="saisie num" style="width: 140px" bind:value={economie} placeholder="0 €" inputmode="decimal" />
      </div>
    {:else}
      <p class="bloc-titre">Vos envies</p>
      <textarea class="saisie" rows="4" bind:value={envies} placeholder="Ex. : une pizza maison vendredi avec les invités, des pâtes carbo un soir. Pas de poisson."></textarea>
      <p class="petit">
        L'IA tient compte de vos {s.ustensiles.length ? `${s.ustensiles.length} ustensiles` : "ustensiles (à renseigner dans Paramètres)"}, de vos {s.donnees?.recettes.length ?? 0} recettes{s.sante ? ", de vos objectifs Santé" : ""} et de
        {s.courses.prix.length + (s.donnees?.prix.length ?? 0)} prix connus.
      </p>
    {/if}
    {#if erreur}<p class="negatif" role="alert">{erreur}</p>{/if}
  </section>

  <div class="navigation">
    <button class="btn" onclick={() => (etape = etape > 1 ? etape - 1 : 0)} disabled={occupe}>{etape > 1 ? "Précédent" : "Annuler"}</button>
    {#if etape < DERNIERE}
      <button class="btn primary" onclick={() => etape++} disabled={etape === 2 && voulus.length === 0}>Suivant</button>
    {:else}
      <button class="btn primary" onclick={lancer} disabled={occupe || voulus.length === 0}>{occupe ? "L'IA concocte… (quelques minutes)" : `Concocter ${voulus.length} repas`}</button>
    {/if}
  </div>
{:else}
  <div class="actions"><button class="btn" onclick={() => (etape = 0)}>← Plans</button></div>
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
        <button class="btn primary" onclick={garderRecettes}>Garder les {nouvelles.length} nouvelles recettes</button>
      {/if}
    </section>
    <section class="bloc">
      <p class="bloc-titre">Les courses</p>
      {#if chiffrageAffiche}
        <ListeChiffree chiffrage={chiffrageAffiche} budgetCents={proposition ? b.viseCents : (planOuvert?.budgetCents ?? null)} />
        <div class="actions">
          <button class="btn primary" onclick={() => envoyer(chiffrageAffiche!.lignes, proposition ? debut : planOuvert!.debut, proposition ? planId : planOuvert!.id)}>Envoyer à Courses</button>
          {#if proposition}<button class="btn" onclick={lancer} disabled={occupe}>{occupe ? "…" : "Refaire"}</button>{/if}
        </div>
      {/if}
    </section>
  </div>
  {#if info}<p class="petit" role="status">{info}</p>{/if}
  {#if erreur}<p class="negatif" role="alert">{erreur}</p>{/if}
{/if}

<style>
  .accueil {
    text-align: center;
    padding: 28px 16px;
    background: linear-gradient(135deg, var(--accent-soft), transparent);
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
  .etapes button {
    padding: 5px 10px;
    border: 0;
    border-radius: 999px;
    background: var(--field);
    color: var(--muted);
    font: inherit;
    font-size: 12.5px;
    cursor: pointer;
  }
  .etapes li.active button {
    background: var(--accent);
    color: var(--accent-text);
  }
  .etapes li.faite button {
    color: var(--text);
  }
  .pas {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .raccourcis {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
    margin-bottom: 10px;
  }
  .raccourcis .petit:not(:first-child) {
    margin-left: 10px;
  }
  .jours {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
    gap: 8px;
  }
  .jour-carte {
    padding: 10px;
    border-radius: var(--r-md);
    background: var(--field);
  }
  .jour-carte.we {
    outline: 1px dashed var(--border);
  }
  .jour-carte.absent {
    opacity: 0.6;
  }
  .jour-tete {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 6px;
  }
  .jour-tete b {
    text-transform: capitalize;
  }
  .repas-ligne {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 6px;
    border-radius: var(--r-sm);
    background: var(--accent-soft);
    margin-top: 4px;
    min-height: 32px;
  }
  .repas-ligne.off {
    background: transparent;
    color: var(--muted);
  }
  .interrupteur {
    display: flex;
    gap: 6px;
    align-items: center;
    flex: 1;
    font-size: 13px;
  }
  .qui {
    white-space: nowrap;
  }
  .petitpas {
    gap: 4px;
  }
  .petitpas button {
    border: 0;
    border-radius: 6px;
    background: var(--surface);
    cursor: pointer;
    font: inherit;
    font-size: 12px;
    padding: 3px 7px;
  }
  .resume {
    margin: 12px 0 0;
    font-weight: 600;
  }
  .option {
    display: flex;
    gap: 10px;
    align-items: flex-start;
    padding: 10px;
    border-radius: var(--r-md);
    background: var(--field);
    margin-top: 8px;
    cursor: pointer;
  }
  .chiffres {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 8px;
    margin-bottom: 12px;
  }
  .chiffres div {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 12px;
    border-radius: var(--r-md);
    background: var(--field);
  }
  .chiffres b {
    font-size: 20px;
  }
  .chiffres .vise {
    background: var(--accent-soft);
    outline: 1.5px solid var(--accent);
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
  .pastille {
    font-size: 11.5px;
    padding: 2px 8px;
    border-radius: 999px;
    background: var(--accent-soft);
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
