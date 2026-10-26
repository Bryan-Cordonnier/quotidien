<script lang="ts">
  import { SelectField } from "@etabli/ui";
  // Lieux et trajets automatiques : les adresses (logements et lieux qui reviennent), où je dors selon la période, et les trajets calculés
  // des prochains jours (avec les bouchons prévus). Le calcul passe par TomTom (clé dans Paramètres → Trajets).
  import { ajouterJours } from "@etabli/ui/civil";
  import { occurrencesDuCarnet } from "../../src/calculs";
  import { adresseDe, ajouterSejour, cleTrajet, enregistrerLieu, JOURS_AVANCE, logementDu, supprimerLieu, supprimerSejour } from "../../src/lieux";
  import type { Session } from "../../src/session.svelte";
  import type { Lieu } from "../../src/types";
  import { heure } from "../../src/vue";

  let { s }: { s: Session } = $props();

  const c = $derived(s.carnet!);
  let lieu = $state<{ id?: string; nom: string; adresse: string; logement: boolean } | null>(null);
  let sejour = $state<{ lieuId: string; du: string; au: string } | null>(null);
  const prochains = $derived(
    occurrencesDuCarnet(c, s.aujourdhui, ajouterJours(s.aujourdhui, JOURS_AVANCE)).filter((o) => o.lieu),
  );
  const jourCourt = (j: string) => new Date(`${j}T12:00:00`).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });

  function enregistrer(): void {
    if (lieu && s.appliquer((x) => enregistrerLieu(x, lieu!))) {
      lieu = null;
      void s.actualiserTrajets();
    }
  }
  function ajouter(): void {
    if (!sejour) return;
    const d = sejour;
    if (s.appliquer((x) => ajouterSejour(x, { lieuId: d.lieuId, du: d.du, au: d.au || null }))) {
      sejour = null;
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
  {#if s.trajetsMessage}<p class="negatif petit">{s.trajetsMessage}</p>{/if}

  <p class="etiquette">Mes lieux</p>
  <ul class="liste">
    {#each c.lieux as l (l.id)}
      <li>
        <span><b>{l.logement ? "🏠 " : "📍 "}{l.nom}</b><span class="petit">{l.adresse}{l.logement ? " · logement par défaut" : ""}</span></span>
        <span class="choix">
          <button class="btn sm" onclick={() => editer(l)}>Modifier</button>
          <button class="btn sm" onclick={() => s.appliquer((x) => supprimerLieu(x, l.id))}>Supprimer</button>
        </span>
      </li>
    {:else}
      <li class="petit">Aucun lieu : ajoute ton logement (chez maman) et les lieux qui reviennent (le travail).</li>
    {/each}
  </ul>
  {#if lieu}
    <div class="formulaire">
      <input class="saisie" bind:value={lieu.nom} placeholder="Nom (ex. : Chez mamie, Armar (Anglet))" aria-label="Nom du lieu" />
      <input class="saisie" bind:value={lieu.adresse} placeholder="Adresse (ex. : 103 Route des crêtes, 64300 Castetner)" aria-label="Adresse" />
      <label class="coche"><input type="checkbox" bind:checked={lieu.logement} /> C'est mon logement par défaut</label>
      <div class="choix">
        <button class="btn primary sm" onclick={enregistrer}>Enregistrer</button>
        <button class="btn sm" onclick={() => (lieu = null)}>Annuler</button>
      </div>
      <p class="petit">Astuce : donne au lieu de travail le même nom que l'entreprise de la mission (« Armar (Anglet) ») pour qu'il soit reconnu.</p>
    </div>
  {:else}
    <button class="btn sm" onclick={() => (lieu = { nom: "", adresse: "", logement: c.lieux.length === 0 })}>+ Ajouter un lieu</button>
  {/if}

  <p class="etiquette espace">Où je dors</p>
  <p class="petit">Aujourd'hui : <b>{logementDu(c, s.aujourdhui)?.nom ?? "l'adresse de départ des Paramètres"}</b>. Un séjour change le point de départ des trajets.</p>
  <ul class="liste">
    {#each c.sejours as sj, i (i)}
      <li>
        <span>{c.lieux.find((l) => l.id === sj.lieuId)?.nom ?? "?"} · du {jourCourt(sj.du)} {sj.au ? `au ${jourCourt(sj.au)}` : "jusqu'à nouvel ordre"}</span>
        <button class="btn sm" onclick={() => s.appliquer((x) => supprimerSejour(x, i))}>Supprimer</button>
      </li>
    {/each}
  </ul>
  {#if sejour}
    <div class="formulaire ligne">
      <SelectField compact label="Lieu" bind:value={sejour.lieuId} options={c.lieux.map((l) => ({ value: l.id, label: l.nom }))} />
      <label class="champ">Du <input class="saisie" type="date" bind:value={sejour.du} /></label>
      <label class="champ">Au (vide : jusqu'à nouvel ordre) <input class="saisie" type="date" bind:value={sejour.au} /></label>
      <div class="choix">
        <button class="btn primary sm" onclick={ajouter} disabled={!sejour.lieuId}>Ajouter</button>
        <button class="btn sm" onclick={() => (sejour = null)}>Annuler</button>
      </div>
    </div>
  {:else}
    <button class="btn sm" disabled={c.lieux.length === 0} onclick={() => (sejour = { lieuId: c.lieux.find((l) => !l.logement)?.id ?? c.lieux[0]?.id ?? "", du: s.aujourdhui, au: "" })}>+ Je dors ailleurs</button>
  {/if}

  <p class="etiquette espace">Trajets des {JOURS_AVANCE} prochains jours</p>
  <ul class="liste">
    {#each prochains as o (cleTrajet(o))}
      {@const t = c.trajetsAuto[cleTrajet(o)]}
      <li>
        <span><b>{jourCourt(o.jour)} · {o.titre}</b><span class="petit">depuis {logementDu(c, o.jour)?.nom ?? "le départ des Paramètres"} vers {adresseDe(c, o.lieu!)} · arrivée {heure(o.debutMin)}</span></span>
        <b class="num">{t ? `${t.min} min` : o.trajetMin !== null ? `${o.trajetMin} min (saisi)` : "à calculer"}</b>
      </li>
    {:else}
      <li class="petit">Aucun événement avec un lieu dans les prochains jours.</li>
    {/each}
  </ul>
  <button class="btn sm" onclick={() => void s.actualiserTrajets()}>Recalculer maintenant</button>
  <p class="petit">Sur le téléphone, « Pars dans X min » et « Pars maintenant » suivent le dernier calcul. Le calcul se refait quand l'appli est ouverte (toutes les 15 min le jour même).</p>
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
  .formulaire.ligne {
    grid-template-columns: 1fr 1fr 1fr auto;
    align-items: end;
  }
  @media (max-width: 700px) {
    .formulaire.ligne {
      grid-template-columns: 1fr;
    }
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
  .champ {
    display: grid;
    gap: 4px;
    font-size: 12px;
    color: var(--muted);
  }
  .espace {
    margin-top: 12px;
  }
</style>
