<script lang="ts">
  // Calendrier : le mois en ronds (une couleur par type de contrat) et la journée du jour choisi, du lever au coucher estimé. En dessous : le
  // sommeil, les trajets (« je suis parti », « je suis arrivé ») et le repos légal de la semaine. Les contrats viennent de Travail ; ici,
  // « + Événement » crée un événement quelconque. Tout le calcul est dans src/ ; l'écran est mince.
  import { Entete } from "@etabli/ui";
  import { ajouterJours, ajouterMois, premierDuMois, type Jour } from "@etabli/ui/civil";
  import { occurrences } from "../../src/calculs";
  import { genererIcs } from "../../src/ics";
  import { Session } from "../../src/session.svelte";
  import "./couleurs.css";
  import FormEvenement from "./FormEvenement.svelte";
  import Journee from "./Journee.svelte";
  import Mois from "./Mois.svelte";
  import Repos from "./Repos.svelte";
  import Sommeil from "./Sommeil.svelte";
  import Trajet from "./Trajet.svelte";

  const s = new Session();
  void s.demarrer();
  $effect(() => () => s.arreter());

  let choisi = $state<Jour>(s.aujourdhui);
  let reference = $state<Jour>(s.aujourdhui);
  /** L'événement ouvert dans la fenêtre : `null` fermée, `{}` nouveau, `{ id }` à modifier. */
  let fenetre = $state<{ id?: string } | null>(null);

  function aller(jour: Jour): void {
    choisi = jour;
    reference = jour;
  }

  function exporter(): void {
    if (!s.hote || !s.carnet) return;
    const du = premierDuMois(reference);
    const au = ajouterJours(ajouterMois(du, 12), -1);
    s.hote.saveFile({ name: `agenda-${du}.ics`, content: genererIcs(occurrences(s.carnet.evenements, du, au), Date.now()), extension: "ics", description: "Calendrier iCalendar" });
  }
</script>

<div class="page-plugin">
  <Entete titre="Calendrier">
    {#snippet actions()}
      <button class="btn" onclick={exporter}>Exporter (.ics)</button>
      <button class="btn" onclick={() => s.ouvrirParametres()}>Paramètres</button>
      <button class="btn primary" onclick={() => (fenetre = {})}>+ Événement</button>
    {/snippet}
  </Entete>

  {#if s.illisible}
    <section class="bloc">
      <p class="etiquette">Agenda illisible</p>
      <p class="negatif">{s.illisible}</p>
      <p class="petit">Les données n'ont pas été touchées. Rien ne s'enregistre tant que le carnet ne peut pas être lu.</p>
    </section>
  {:else if s.carnet}
    <div class="haut">
      <Mois {s} {choisi} {reference} onchoisir={aller} onmois={(delta) => (reference = ajouterMois(reference, delta))} />
      <Journee {s} jour={choisi} onjour={(delta) => aller(ajouterJours(choisi, delta))} onmodifier={(id) => (fenetre = { id })} />
    </div>
    <div class="bas">
      <Sommeil {s} />
      <Trajet {s} />
    </div>
    <Repos {s} jour={choisi} />
    {#if s.message}<p class="negatif" role="alert">{s.message}</p>{/if}
    {#if fenetre}<FormEvenement {s} id={fenetre.id} jour={choisi} onclose={() => (fenetre = null)} onenregistre={aller} />{/if}
  {:else}
    <p class="petit">Chargement…</p>
  {/if}
</div>

<style>
  .haut {
    display: grid;
    grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
    gap: 14px;
    align-items: stretch;
  }
  .bas {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 300px;
    gap: 14px;
    align-items: stretch;
  }
  @media (max-width: 900px) {
    .haut,
    .bas {
      grid-template-columns: 1fr;
    }
  }
</style>