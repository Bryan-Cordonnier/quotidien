<script lang="ts">
  // Trajets automatiques : les adresses des lieux qui reviennent (le travail…) et les trajets calculés des prochains jours, avec les
  // bouchons prévus. Le départ (un domicile ou la position GPS) se règle dans Paramètres → Trajets, avec la clé TomTom.
  import { ajouterJours } from "@etabli/ui/civil";
  import { occurrencesDuCarnet } from "../../src/calculs";
  import { adresseDe, cleTrajet, enregistrerLieu, JOURS_AVANCE, supprimerLieu, TRAJET_MAX_MIN } from "../../src/lieux";
  import type { Session } from "../../src/session.svelte";
  import type { Lieu } from "../../src/types";
  import { heure } from "../../src/vue";

  let { s }: { s: Session } = $props();

  const c = $derived(s.carnet!);
  let lieu = $state<{ id?: string; nom: string; adresse: string; logement: boolean } | null>(null);
  const prochains = $derived(occurrencesDuCarnet(c, s.aujourdhui, ajouterJours(s.aujourdhui, JOURS_AVANCE)).filter((o) => o.lieu));
  const jourCourt = (j: string) => new Date(`${j}T12:00:00`).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });

  function enregistrer(): void {
    if (lieu && s.appliquer((x) => enregistrerLieu(x, { ...lieu!, logement: false }))) {
      lieu = null;
      void s.actualiserTrajets();
    }
  }
  const editer = (l: Lieu) => (lieu = { ...l });
</script>

<div class="lieux">
  <label class="coche">
    <input type="checkbox" checked={c.trajetsAutoActifs} onchange={(e) => s.appliquer((x) => ({ ...x, trajetsAutoActifs: e.currentTarget.checked }))} />
    Calculer les trajets tout seul (avec les bouchons), pour chaque événement qui a un lieu
  </label>
  <p class="petit">Le point de départ (chez maman, chez mamie, ou ta position GPS) se règle dans <b>Paramètres → Trajets</b>.</p>
  {#if s.trajetsMessage}<p class="negatif petit">{s.trajetsMessage}</p>{/if}

  <p class="etiquette">Adresses des lieux</p>
  <p class="petit">Pour qu'un lieu soit bien trouvé, donne-lui le même nom que dans l'événement (par exemple l'entreprise de la mission, « Armar (Anglet) ») et son adresse complète.</p>
  <ul class="liste">
    {#each c.lieux.filter((l) => !l.logement) as l (l.id)}
      <li>
        <span><b>📍 {l.nom}</b><span class="petit">{l.adresse}</span></span>
        <span class="choix">
          <button class="btn sm" onclick={() => editer(l)}>Modifier</button>
          <button class="btn sm" onclick={() => s.appliquer((x) => supprimerLieu(x, l.id))}>Supprimer</button>
        </span>
      </li>
    {:else}
      <li class="petit">Aucune adresse : sans elle, le nom du lieu de l'événement est cherché tel quel.</li>
    {/each}
  </ul>
  {#if lieu}
    <div class="formulaire">
      <input class="saisie" bind:value={lieu.nom} placeholder="Nom (ex. : Armar (Anglet))" aria-label="Nom du lieu" />
      <input class="saisie" bind:value={lieu.adresse} placeholder="Adresse complète (ex. : Armar, 64600 Anglet)" aria-label="Adresse" />
      <div class="choix">
        <button class="btn primary sm" onclick={enregistrer}>Enregistrer</button>
        <button class="btn sm" onclick={() => (lieu = null)}>Annuler</button>
      </div>
    </div>
  {:else}
    <button class="btn sm" onclick={() => (lieu = { nom: "", adresse: "", logement: false })}>+ Ajouter une adresse</button>
  {/if}

  <p class="etiquette espace">Trajets des {JOURS_AVANCE} prochains jours</p>
  <ul class="liste">
    {#each prochains as o (cleTrajet(o))}
      {@const t = c.trajetsAuto[cleTrajet(o)]}
      <li>
        <span><b>{jourCourt(o.jour)} · {o.titre}</b><span class="petit">vers {adresseDe(c, o.lieu!)} · arrivée {heure(o.debutMin)}</span></span>
        <b class="num">{t && t.min <= TRAJET_MAX_MIN ? `${t.min} min` : o.trajetMin !== null ? `${o.trajetMin} min (saisi)` : "à calculer"}</b>
      </li>
    {:else}
      <li class="petit">Aucun événement avec un lieu dans les prochains jours.</li>
    {/each}
  </ul>
  <button class="btn sm" onclick={() => void s.actualiserTrajets()}>Recalculer maintenant</button>
  <p class="petit">Sur le téléphone, « Pars dans X min » et « Pars maintenant » suivent le dernier calcul. Il se refait quand l'appli est ouverte (toutes les 15 min le jour même). Un trajet de plus de 4 h est ignoré : c'est sûrement une adresse mal trouvée.</p>
</div>

<style>
  .lieux {
    display: grid;
    gap: 10px;
  }
  .liste {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 6px;
  }
  .liste li {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
    padding: 6px 0;
    border-bottom: 1px solid var(--border);
    flex-wrap: wrap;
  }
  .liste li > span:first-child {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  .formulaire {
    display: grid;
    gap: 8px;
  }
  .choix {
    display: flex;
    gap: 6px;
  }
  .coche {
    display: flex;
    gap: 8px;
    align-items: center;
  }
  .espace {
    margin-top: 12px;
  }
</style>
