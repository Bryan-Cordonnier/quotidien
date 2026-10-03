<script lang="ts">
  import Moon from '@lucide/svelte/icons/moon';
  import Bell from '@lucide/svelte/icons/bell';
  import Car from '@lucide/svelte/icons/car';
  import MapPin from '@lucide/svelte/icons/map-pin';
  import Plus from '@lucide/svelte/icons/plus';
  import Trash2 from '@lucide/svelte/icons/trash-2';
  import { depuisMinutes, enMinutes, formatDuree, formatHeure, libelleJour } from '../lib/dates';
  import { evenementsDuJour, horairesJournee, rappelsPour, type EvenementJour } from '../lib/planning';
  import { nouvelId, store } from '../lib/store.svelte';
  import type { ISODate } from '../lib/types';

  let { date }: { date: ISODate } = $props();

  const evenements = $derived(evenementsDuJour(date, store.donnees));
  const premier = $derived(evenements[0]);
  const plan = $derived(premier ? horairesJournee(premier.debutMin, premier.trajetMin, premier.margeMin, store.donnees.reglages) : null);
  const rappels = $derived(premier && plan ? rappelsPour(premier, plan, store.donnees.reglages) : []);

  const couleur = { interim: 'var(--c-interim)', reserve: 'var(--c-reserve)', rdv: 'var(--c-rdv)' } as const;

  let rdvOuvert = $state(false);
  let titre = $state('');
  let adresse = $state('');
  let heure = $state('14:00');
  let duree = $state(30);
  let trajet = $state(15);
  let marge = $state(10);

  function ajouterRdv() {
    if (!titre.trim()) return;
    store.ajouterRdv({
      id: nouvelId(), titre: titre.trim(), adresse: adresse.trim(), date,
      heureMin: enMinutes(heure), dureeMin: duree, trajetMin: trajet, margeMin: marge,
    });
    titre = ''; adresse = ''; rdvOuvert = false;
  }

  function supprimer(e: EvenementJour) {
    if (e.type === 'rdv') store.supprimerRdv(e.id);
  }

  const missionDe = (e: EvenementJour) => store.donnees.missions.find((m) => m.id === e.id);
</script>

<div class="panel anim" data-testid="jour-panel">
  <div class="ligne espace">
    <h2 style="text-transform: capitalize">{libelleJour(date)}</h2>
    <button class="btn" onclick={() => (rdvOuvert = !rdvOuvert)}><Plus size={16} /> Rendez-vous</button>
  </div>

  {#if rdvOuvert}
    <form class="card form anim" onsubmit={(e) => { e.preventDefault(); ajouterRdv(); }}>
      <label class="champ">Titre<input bind:value={titre} placeholder="Client, banque, agence…" required /></label>
      <label class="champ">Adresse<input bind:value={adresse} placeholder="Adresse du rendez-vous" /></label>
      <div class="grille g2">
        <label class="champ">Heure<input type="time" bind:value={heure} /></label>
        <label class="champ">Durée (min)<input type="number" min="5" step="5" bind:value={duree} /></label>
        <label class="champ">Trajet (min)<input type="number" min="0" bind:value={trajet} /></label>
        <label class="champ">Marge d’avance (min)<input type="number" min="0" bind:value={marge} /></label>
      </div>
      <button class="btn primary" type="submit">Ajouter</button>
    </form>
  {/if}

  {#if evenements.length === 0}
    <p class="muted vide">Rien de prévu ce jour.</p>
  {/if}

  {#each evenements as e (e.type + e.id)}
    <div class="evt card" style:--c={couleur[e.type]}>
      <div class="ligne espace">
        <div>
          <strong>{e.titre}</strong>
          <div class="muted ligne" style="gap:6px"><MapPin size={14} />{e.lieu || 'Lieu non renseigné'}</div>
        </div>
        <span class="pastille mono" style="background: color-mix(in srgb, var(--c) 25%, transparent)">
          {formatHeure(e.debutMin)}–{formatHeure(e.finMin % 1440)}
        </span>
      </div>
      {#if e.type === 'interim'}
        {@const m = missionDe(e)}
        {#if m}
          <div class="ligne actions">
            <label class="champ inline">
              Heures sup ce jour (min)
              <input
                type="number" min="0" step="15"
                value={m.ajustementsSup[date] ?? 0}
                onchange={(ev) => store.ajusterSup(m.id, date, Number(ev.currentTarget.value))}
              />
            </label>
            <button class="btn danger" onclick={() => store.basculerAbsence(m.id, date)}>Absent</button>
          </div>
        {/if}
      {:else if e.type === 'rdv'}
        <button class="btn danger ghost" onclick={() => supprimer(e)}><Trash2 size={14} /> Supprimer</button>
      {/if}
    </div>
  {/each}

  {#if premier && plan}
    <div class="card chrono" data-testid="chronologie">
      <h3>Chronologie</h3>
      <ol>
        <li style:--c="var(--c-sommeil)"><Moon size={15} /><span>Coucher</span><b class="mono">{formatHeure(plan.coucher_min)}</b></li>
        <li style:--c="var(--c-sommeil)"><Bell size={15} /><span>Réveil</span><b class="mono">{formatHeure(plan.reveil_min)}</b></li>
        <li style:--c="var(--c-trajet)"><Car size={15} /><span>Je dois partir (mise en route {store.donnees.reglages.miseEnRouteMin} min)</span><b class="mono">{formatHeure(plan.decision_partir_min)}</b></li>
        <li style:--c="var(--c-trajet)"><Car size={15} /><span>Roues qui tournent · trajet {formatDuree(plan.trajet_majore_min)}</span><b class="mono">{formatHeure(plan.depart_reel_min)}</b></li>
        <li style:--c={couleur[premier.type]}><MapPin size={15} /><span>Arrivée visée</span><b class="mono">{formatHeure(plan.arrivee_visee_min)}</b></li>
        <li style:--c={couleur[premier.type]}><MapPin size={15} /><span>Début · {premier.titre}</span><b class="mono">{formatHeure(premier.debutMin)}</b></li>
      </ol>
    </div>

    <div class="card">
      <h3>Rappels de ce jour</h3>
      <ul class="rappels" data-testid="rappels">
        {#each rappels as r (r.genre)}
          <li><b class="mono">{depuisMinutes(r.minute)}{r.minute < 0 ? ' (veille)' : ''}</b><span>{r.titre}</span></li>
        {/each}
      </ul>
    </div>
  {/if}
</div>

<style>
  .panel { display: grid; gap: 12px; align-content: start; }
  .vide { padding: 16px; text-align: center; }
  .form { display: grid; gap: 12px; }
  .evt { border-left: 4px solid var(--c); display: grid; gap: 10px; }
  .actions { gap: 12px; align-items: end; flex-wrap: wrap; }
  .inline { flex: 1; min-width: 160px; }
  .chrono ol { list-style: none; margin: 10px 0 0; padding: 0; display: grid; gap: 4px; }
  .chrono li { display: grid; grid-template-columns: 22px 1fr auto; align-items: center; gap: 8px; padding: 8px 10px; border-radius: 10px; background: var(--surface-2); border-left: 3px solid var(--c); color: var(--text); }
  .chrono li :global(svg) { color: var(--c); }
  .rappels { list-style: none; margin: 10px 0 0; padding: 0; display: grid; gap: 6px; }
  .rappels li { display: grid; grid-template-columns: 150px 1fr; gap: 10px; }
</style>
