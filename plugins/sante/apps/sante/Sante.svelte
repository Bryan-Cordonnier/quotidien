<script lang="ts">
  // Santé : le suivi du poids (pesée en un geste, courbe, IMC en cadran, progression vers le poids visé) et le besoin du jour. Le profil
  // (taille, âge, poids visé, régime, goûts…) se règle dans Paramètres → Santé ; tout est publié pour Repas, qui en tient compte.
  import { connect } from "@etabli/sdk";
  import { DonutChart, Entete, Jauge, LineChart, PluginParameters, PluginSettings } from "@etabli/ui";
  import { jourDeInstant } from "@etabli/ui/civil";
  import { appliquerParametres, besoinCalories, conseils, type Mange, besoinProteines, imc, imcIlYa30Jours, nettoyer, OBJECTIFS_DEFAUT, PARAMS_DEFAUT, peser, poidsActuel } from "../../src/objectifs";
  import Cadran from "./Cadran.svelte";

  const objectifs = new PluginSettings(OBJECTIFS_DEFAUT, nettoyer, "sante");
  const params = new PluginParameters(PARAMS_DEFAUT);
  const o = $derived(objectifs.data);

  // Les Paramètres font foi : recopiés dans les objectifs publiés dès qu'ils changent.
  $effect(() => {
    if (!objectifs.ready || !params.ready) return;
    const fusion = appliquerParametres(objectifs.data, params.values);
    if (JSON.stringify(fusion) !== JSON.stringify(objectifs.data)) objectifs.data = fusion;
  });

  let poids = $state("");
  // Ce que je mange en moyenne par portion, publié par Repas (s'il est installé) : sert aux conseils.
  let mange = $state<Mange | null>(null);
  void connect().then((h) => {
    const lire = () => {
      const d = h.services.get("repas")?.data as { moyenne?: Mange | null } | null | undefined;
      mange = d?.moyenne ?? null;
    };
    lire();
    h.services.onChange(lire);
  });

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
  const profilIncomplet = $derived(!o.tailleCm || !o.age);

  // La pesée du jour : le poids seul, la date est celle d'aujourd'hui (une seconde pesée le même jour remplace la première).
  function ajouterPesee(): void {
    const v = Number(poids.replace(",", "."));
    if (!(v >= 20 && v <= 500)) return;
    objectifs.data = peser(objectifs.data, jourDeInstant(Date.now()), v);
    poids = "";
  }
  const retirer = (j: string) => (objectifs.data = { ...objectifs.data, pesees: objectifs.data.pesees.filter((p) => p.jour !== j) });
  const parametres = () => void connect().then((h) => h.openSettings("sante"));
</script>

<div class="page-plugin">
  <Entete titre="Santé" />

  <section class="bloc pesee-rapide" aria-label="Nouvelle pesée">
    <input class="saisie num" bind:value={poids} placeholder="Poids (kg)" inputmode="decimal" aria-label="Poids en kg" onkeydown={(e) => e.key === "Enter" && ajouterPesee()} />
    <button class="btn primary" onclick={ajouterPesee}>Ajouter</button>
    <span class="petit">{kg ? `Dernière pesée : ${kg.toLocaleString("fr-FR")} kg${ecart30 === null ? "" : ` · ${ecart30 > 0 ? "+" : ""}${ecart30.toLocaleString("fr-FR")} kg sur 30 j`}` : "Aucune pesée pour l'instant."}</span>
  </section>

  {#if profilIncomplet}
    <p class="petit">Renseigne ta taille et ton âge dans <button class="lien" onclick={parametres}>Paramètres → Santé</button> pour l'IMC et le besoin calorique.</p>
  {/if}

  <div class="haut">
    <section class="bloc">
      <p class="bloc-titre">IMC</p>
      <Cadran valeur={indice} avant={imcIlYa30Jours(o)} />
      <ul class="conseils">{#each conseils(o, mange) as c (c)}<li>{c}</li>{/each}</ul>
    </section>
    <section class="bloc">
      <p class="bloc-titre">Besoin du jour</p>
      {#if macros.length}
        <DonutChart parts={macros} format={(v) => `${v} kcal`} title="Répartition des calories" centre="kcal / jour" />
        <p class="petit">{calories.toLocaleString("fr-FR")} kcal ({o.caloriesJour ? "ton objectif" : "calculé"}) · {proteines} g de protéines</p>
      {:else}
        <p class="petit">Il faut le profil (Paramètres) et une pesée, ou un objectif de calories.</p>
      {/if}
    </section>
  </div>

  <section class="bloc">
    <p class="bloc-titre">Mon poids</p>
    {#if courbe.length > 1}
      <LineChart points={courbe} format={(v) => `${v.toLocaleString("fr-FR")} kg`} title="Évolution du poids" />
    {:else}
      <p class="petit vide">La courbe apparaît dès la deuxième pesée.</p>
    {/if}
    {#if progression !== null}
      <Jauge pourcent={progression} gauche="Vers {(o.poidsViseDixiemes / 10).toLocaleString('fr-FR')} kg" droite="{Math.round(Math.max(0, Math.min(100, progression)))} %" label="Progression vers le poids visé" />
    {/if}
    {#if o.pesees.length > 0}
      <div class="pesees">
        {#each [...o.pesees].reverse().slice(0, 30) as p (p.jour)}
          <span class="pesee">{p.jour.split("-").reverse().join("/")} · <b>{(p.dixiemesKg / 10).toLocaleString("fr-FR")} kg</b><button onclick={() => retirer(p.jour)} aria-label="Supprimer la pesée du {p.jour}">✕</button></span>
        {/each}
      </div>
    {/if}
  </section>
</div>

<style>
  .haut {
    display: grid;
    grid-template-columns: minmax(260px, 340px) minmax(0, 1fr);
    gap: 14px;
    align-items: start;
  }
  @media (max-width: 720px) {
    .haut {
      grid-template-columns: 1fr;
    }
  }
  .conseils {
    margin: 12px 0 0;
    padding: 10px 12px 10px 26px;
    border-radius: var(--r-md);
    background: var(--field);
    display: grid;
    gap: 6px;
    font-size: 13.5px;
  }
  .pesee-rapide {
    width: fit-content;
    max-width: 100%;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px;
  }
  .pesee-rapide input {
    width: 140px;
    font-size: 18px;
  }
  .lien {
    border: 0;
    background: none;
    padding: 0;
    color: var(--accent);
    cursor: pointer;
    font: inherit;
    text-decoration: underline;
  }
  .pesees {
    margin-top: 12px;
  }
  .vide {
    padding: 30px 0;
    text-align: center;
  }
  .pesees {
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
</style>
