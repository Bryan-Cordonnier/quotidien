<script lang="ts">
  // Santé : le profil (pour calculer le besoin calorique), le suivi du poids (courbe, IMC, progression vers le poids visé) et les objectifs pour
  // l'alimentation. Tout est publié pour Repas et recettes, qui en tient compte pour concocter les repas.
  import { DonutChart, Entete, Jauge, LineChart, PluginSettings, Segmented, Tabs } from "@etabli/ui";
  import { jourDeInstant } from "@etabli/ui/civil";
  import { ACTIVITES, besoinCalories, besoinProteines, BUTS, imc, nettoyer, OBJECTIFS_DEFAUT, peser, poidsActuel, REGIMES, SEXES } from "../../src/objectifs";

  const objectifs = new PluginSettings(OBJECTIFS_DEFAUT, nettoyer, "sante");
  const o = $derived(objectifs.data);

  type Onglet = "suivi" | "profil" | "gouts";
  let onglet = $state<Onglet>("suivi");
  let poids = $state("");
  let jour = $state(jourDeInstant(Date.now()));

  const kg = $derived(poidsActuel(o));
  const indice = $derived(imc(o));
  const calcule = $derived(besoinCalories(o));
  const proteinesConseillees = $derived(besoinProteines(o));
  const calories = $derived(o.caloriesJour || calcule || 0);
  const proteines = $derived(o.proteinesJour || proteinesConseillees || 0);
  const courbe = $derived(o.pesees.slice(-60).map((p) => ({ label: `${Number(p.jour.slice(8))}/${p.jour.slice(5, 7)}`, value: p.dixiemesKg / 10 })));
  const ecart30 = $derived.by(() => {
    if (o.pesees.length < 2) return null;
    const dernier = o.pesees[o.pesees.length - 1]!;
    const limite = new Date(Date.parse(dernier.jour) - 30 * 86_400_000).toISOString().slice(0, 10);
    const ref = o.pesees.find((p) => p.jour >= limite) ?? o.pesees[0]!;
    return ref === dernier ? null : (dernier.dixiemesKg - ref.dixiemesKg) / 10;
  });
  const progression = $derived.by(() => {
    if (!o.poidsViseDixiemes || o.pesees.length === 0) return null;
    const depart = o.pesees[0]!.dixiemesKg;
    const total = depart - o.poidsViseDixiemes;
    return total === 0 ? 100 : ((depart - o.pesees[o.pesees.length - 1]!.dixiemesKg) * 100) / total;
  });
  // Répartition indicative : protéines (4 kcal/g), lipides 30 %, le reste en glucides.
  const macros = $derived.by(() => {
    if (!calories) return [];
    const p = Math.min(calories, proteines * 4);
    const l = Math.round(calories * 0.3);
    return [
      { label: "Protéines", value: p },
      { label: "Lipides", value: l },
      { label: "Glucides", value: Math.max(0, calories - p - l) },
    ];
  });
  const zoneImc = (v: number) => (v < 18.5 ? "maigreur" : v < 25 ? "normal" : v < 30 ? "surpoids" : "obésité");

  function ajouterPesee(): void {
    const v = Number(poids.replace(",", "."));
    if (!(v >= 20 && v <= 500)) return;
    objectifs.data = peser(objectifs.data, jour, v);
    poids = "";
  }
  const retirer = (j: string) => (objectifs.data = { ...objectifs.data, pesees: objectifs.data.pesees.filter((p) => p.jour !== j) });
</script>

<div class="page-plugin">
  <Entete titre="Santé" />

  <section class="tuiles">
    <div><span class="petit">Poids</span><b class="num">{kg ? `${kg.toLocaleString("fr-FR")} kg` : "—"}</b><span class="petit">{ecart30 === null ? "pesez-vous pour suivre" : `${ecart30 > 0 ? "+" : ""}${ecart30.toLocaleString("fr-FR")} kg sur 30 j`}</span></div>
    <div><span class="petit">IMC</span><b class="num">{indice?.toLocaleString("fr-FR") ?? "—"}</b><span class="petit">{indice ? zoneImc(indice) : "taille et poids requis"}</span></div>
    <div class="cle"><span class="petit">Calories / jour</span><b class="num">{calories ? calories.toLocaleString("fr-FR") : "—"}</b><span class="petit">{o.caloriesJour ? "votre objectif" : calcule ? "calculé (profil)" : "complétez le profil"}</span></div>
    <div><span class="petit">Protéines / jour</span><b class="num">{proteines ? `${proteines} g` : "—"}</b><span class="petit">{o.proteinesJour ? "votre objectif" : proteinesConseillees ? "conseillé" : "—"}</span></div>
  </section>

  <Tabs items={[{ id: "suivi", label: "Suivi" }, { id: "profil", label: "Profil et objectifs" }, { id: "gouts", label: "Régime et goûts" }]} bind:value={onglet} label="Rubrique" />

  {#if onglet === "suivi"}
    <div class="grille-2-1">
      <section class="bloc">
        <p class="bloc-titre">Mon poids</p>
        {#if courbe.length > 1}
          <LineChart points={courbe} format={(v) => `${v.toLocaleString("fr-FR")} kg`} title="Évolution du poids" />
        {:else}
          <p class="petit vide">Ajoutez au moins deux pesées pour voir la courbe.</p>
        {/if}
        <div class="actions">
          <input class="saisie" style="width: auto" type="date" bind:value={jour} aria-label="Jour de la pesée" />
          <input class="saisie num" style="width: 110px" bind:value={poids} placeholder="kg" inputmode="decimal" aria-label="Poids en kg" onkeydown={(e) => e.key === "Enter" && ajouterPesee()} />
          <button class="btn primary" onclick={ajouterPesee}>Ajouter la pesée</button>
        </div>
        {#if progression !== null}
          <Jauge pourcent={progression} gauche="Vers {(o.poidsViseDixiemes / 10).toLocaleString('fr-FR')} kg" droite="{Math.round(Math.max(0, Math.min(100, progression)))} %" label="Progression vers le poids visé" />
        {/if}
      </section>
      <section class="bloc">
        <p class="bloc-titre">Répartition conseillée</p>
        {#if macros.length}
          <DonutChart parts={macros} format={(v) => `${v} kcal`} title="Répartition des calories" centre="kcal / jour" />
        {:else}
          <p class="petit">Renseignez votre profil (âge, taille) et une pesée, ou un objectif de calories.</p>
        {/if}
      </section>
    </div>
    {#if o.pesees.length > 0}
      <section class="bloc">
        <p class="bloc-titre">Pesées</p>
        <div class="pesees">
          {#each [...o.pesees].reverse().slice(0, 30) as p (p.jour)}
            <span class="pesee">{p.jour.split("-").reverse().join("/")} · <b>{(p.dixiemesKg / 10).toLocaleString("fr-FR")} kg</b><button onclick={() => retirer(p.jour)} aria-label="Supprimer la pesée du {p.jour}">✕</button></span>
          {/each}
        </div>
      </section>
    {/if}
  {:else if onglet === "profil"}
    <section class="bloc">
      <p class="bloc-titre">Profil</p>
      <div class="groupe"><span class="etiquette">Sexe</span><Segmented options={SEXES.map((x) => ({ value: x, label: x === "homme" ? "Homme" : "Femme" }))} bind:value={objectifs.data.sexe} label="Sexe" /></div>
      <div class="trois">
        <div class="groupe"><label for="s-age">Âge</label><input id="s-age" class="saisie num" type="number" min="0" max="120" bind:value={objectifs.data.age} /></div>
        <div class="groupe"><label for="s-tai">Taille (cm)</label><input id="s-tai" class="saisie num" type="number" min="0" max="250" bind:value={objectifs.data.tailleCm} /></div>
        <div class="groupe">
          <label for="s-vis">Poids visé (kg)</label>
          <input id="s-vis" class="saisie num" type="number" min="0" max="500" step="0.5" value={o.poidsViseDixiemes / 10} onchange={(e) => (objectifs.data.poidsViseDixiemes = Math.round(Number(e.currentTarget.value) * 10) || 0)} />
        </div>
      </div>
      <div class="groupe"><span class="etiquette">Activité</span><Segmented options={ACTIVITES.map((x) => ({ value: x, label: x[0]!.toUpperCase() + x.slice(1) }))} bind:value={objectifs.data.activite} label="Activité" /></div>
      <div class="groupe">
        <label for="s-but">Mon but</label>
        <select id="s-but" class="saisie" bind:value={objectifs.data.but}>{#each BUTS as b (b)}<option value={b}>{b}</option>{/each}</select>
      </div>
    </section>
    <section class="bloc">
      <p class="bloc-titre">Objectifs du jour</p>
      <p class="petit">Laissez 0 pour utiliser le calcul{calcule ? ` (${calcule.toLocaleString("fr-FR")} kcal, ${proteinesConseillees} g de protéines)` : ""}.</p>
      <div class="deux">
        <div class="groupe"><label for="s-cal">Calories par jour</label><input id="s-cal" class="saisie num" type="number" min="0" max="10000" step="50" bind:value={objectifs.data.caloriesJour} /></div>
        <div class="groupe"><label for="s-pro">Protéines par jour (g)</label><input id="s-pro" class="saisie num" type="number" min="0" max="1000" step="5" bind:value={objectifs.data.proteinesJour} /></div>
      </div>
    </section>
  {:else}
    <section class="bloc">
      <p class="petit">Repas et recettes respecte strictement le régime et les allergies, et s'inspire de vos goûts.</p>
      <div class="groupe"><span class="etiquette">Régime</span>
        <div class="puces">{#each REGIMES as r (r)}<button class="btn sm {o.regime === r ? 'primary' : ''}" onclick={() => (objectifs.data.regime = r)}>{r}</button>{/each}</div>
      </div>
      <div class="groupe"><label for="s-all">Allergies et intolérances</label><input id="s-all" class="saisie" bind:value={objectifs.data.allergies} placeholder="Ex. : arachides, lactose" /></div>
      <div class="deux">
        <div class="groupe"><label for="s-aim">J'aime</label><input id="s-aim" class="saisie" bind:value={objectifs.data.aime} placeholder="Ex. : pâtes, plats mijotés" /></div>
        <div class="groupe"><label for="s-evi">J'évite</label><input id="s-evi" class="saisie" bind:value={objectifs.data.eviter} placeholder="Ex. : poisson, champignons" /></div>
      </div>
      <div class="groupe"><label for="s-not">Notes</label><textarea id="s-not" class="saisie" rows="3" bind:value={objectifs.data.notes}></textarea></div>
    </section>
  {/if}
</div>

<style>
  .tuiles {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 10px;
    margin-bottom: 12px;
  }
  .tuiles div {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 14px;
    border-radius: var(--r-md);
    background: var(--surface);
    border: 1px solid var(--border);
  }
  .tuiles b {
    font-size: 22px;
  }
  .tuiles .cle {
    background: var(--accent-soft);
    border-color: var(--accent);
  }
  .vide {
    padding: 30px 0;
    text-align: center;
  }
  .pesees,
  .puces {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .pesee {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 6px 4px 10px;
    border-radius: 999px;
    background: var(--field);
    font-size: 13px;
  }
  .pesee button {
    border: 0;
    background: none;
    cursor: pointer;
    color: var(--muted);
  }
  textarea.saisie {
    width: 100%;
    resize: vertical;
  }
</style>
