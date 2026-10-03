<script lang="ts">
  import Plus from '@lucide/svelte/icons/plus';
  import Trash2 from '@lucide/svelte/icons/trash-2';
  import Heure from '../components/Heure.svelte';
  import { aujourdhui, addDays, formatDuree, formatEuros, JOURS_COURTS } from '../lib/dates';
  import { joursMission, payeMission } from '../lib/planning';
  import { nouvelId, store } from '../lib/store.svelte';
  import { SEUIL_DEFAUT_MIN } from '../lib/constantes';
  import type { Mission } from '../lib/types';

  const auj = aujourdhui();
  let ouvert = $state(false);

  function brouillon(): Mission {
    return {
      id: nouvelId(), agence: '', entreprise: '', lieu: '',
      debut: addDays(auj, 3), fin: addDays(auj, 17),
      joursSemaine: [0, 1, 2, 3, 4],
      heureDebutMin: 8 * 60, heureFinMin: 16 * 60, pauseMin: 60,
      tauxCents: 1300, tauxSupCents: 1625, seuilHebdoMin: SEUIL_DEFAUT_MIN,
      trajetMin: 30, statut: 'prevu', ajustementsSup: {}, exclusions: [],
    };
  }
  let m = $state<Mission>(brouillon());
  let tauxEuros = $state(13);
  let tauxSupEuros = $state(16.25);

  const apercu = $derived.by(() => {
    try {
      return payeMission({ ...m, tauxCents: Math.round(tauxEuros * 100), tauxSupCents: Math.round(tauxSupEuros * 100) }, store.donnees.reglages);
    } catch {
      return null;
    }
  });
  const nbJours = $derived(joursMission(m).length);

  function basculerJour(i: number) {
    m.joursSemaine = m.joursSemaine.includes(i) ? m.joursSemaine.filter((x) => x !== i) : [...m.joursSemaine, i];
  }

  function enregistrer() {
    store.ajouterMission({
      ...$state.snapshot(m),
      tauxCents: Math.round(tauxEuros * 100),
      tauxSupCents: Math.round(tauxSupEuros * 100),
    });
    m = brouillon();
    ouvert = false;
  }
</script>

<section class="vue anim">
  <div class="ligne espace entete">
    <h1>Missions d’intérim</h1>
    <button class="btn primary" onclick={() => (ouvert = !ouvert)} data-testid="nouvelle-mission"><Plus size={16} /> Nouvelle mission</button>
  </div>

  {#if ouvert}
    <form class="card form anim" onsubmit={(e) => { e.preventDefault(); enregistrer(); }} data-testid="form-mission">
      <div class="grille g3">
        <label class="champ">Agence<input bind:value={m.agence} placeholder="Nom de l’agence" /></label>
        <label class="champ">Entreprise<input bind:value={m.entreprise} placeholder="Entreprise utilisatrice" required /></label>
        <label class="champ">Lieu<input bind:value={m.lieu} placeholder="Adresse du poste" /></label>
      </div>
      <div class="grille g2">
        <label class="champ">Du<input type="date" bind:value={m.debut} /></label>
        <label class="champ">Au<input type="date" bind:value={m.fin} /></label>
      </div>
      <div>
        <h3>Jours travaillés</h3>
        <div class="ligne chips">
          {#each JOURS_COURTS as j, i (i)}
            <button type="button" class="chip" aria-pressed={m.joursSemaine.includes(i)} onclick={() => basculerJour(i)}>{['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'][i]}</button>
          {/each}
        </div>
      </div>
      <div class="grille g3">
        <Heure label="Début" bind:valeur={m.heureDebutMin} />
        <Heure label="Fin" bind:valeur={m.heureFinMin} />
        <label class="champ">Pause non payée (min)<input type="number" min="0" step="5" bind:value={m.pauseMin} /></label>
      </div>
      <div class="grille g3">
        <label class="champ">Taux brut (€/h)<input type="number" min="0" step="0.01" bind:value={tauxEuros} data-testid="taux" /></label>
        <label class="champ">Taux heures sup (€/h)<input type="number" min="0" step="0.01" bind:value={tauxSupEuros} /></label>
        <label class="champ">Heures/semaine du contrat<input type="number" min="1" max="48" step="0.5" value={m.seuilHebdoMin / 60} onchange={(e) => (m.seuilHebdoMin = Math.round(Number(e.currentTarget.value) * 60))} /></label>
      </div>
      <div class="grille g2">
        <label class="champ">Trajet aller (min)<input type="number" min="0" bind:value={m.trajetMin} /></label>
        <label class="champ">Statut
          <select bind:value={m.statut}><option value="prevu">Prévu</option><option value="confirme">Confirmé (signé)</option></select>
        </label>
      </div>
      {#if apercu}
        <div class="apercu" data-testid="apercu-mission">
          <div><span class="muted">{nbJours} jours · {formatDuree(apercu.minutes_normales)} normales · {formatDuree(apercu.minutes_sup)} sup</span></div>
          <div class="ligne espace"><span class="muted">Brut avec IFM et congés</span><b class="mono">{formatEuros(apercu.brut_total_cents)}</b></div>
          <div class="ligne espace"><span>Net estimé</span><b class="mono net">{formatEuros(apercu.net_cents)}</b></div>
        </div>
      {/if}
      <div class="ligne"><button class="btn primary" type="submit">Enregistrer la mission</button><button class="btn" type="button" onclick={() => (ouvert = false)}>Annuler</button></div>
    </form>
  {/if}

  <div class="liste">
    {#each store.donnees.missions as mi (mi.id)}
      {@const p = payeMission(mi, store.donnees.reglages)}
      <article class="card mission anim">
        <div class="ligne espace">
          <div>
            <strong>{mi.entreprise || mi.agence}</strong>
            <div class="muted">{mi.lieu || 'Lieu non renseigné'} · {mi.debut} → {mi.fin}</div>
          </div>
          <span class="pastille">{mi.statut === 'confirme' ? 'Confirmé' : 'Prévu'}</span>
        </div>
        <div class="ligne espace">
          <span class="muted">{joursMission(mi).length} jours · {formatDuree(p.minutes_normales + p.minutes_sup)}</span>
          <b class="mono net">{formatEuros(p.net_cents)}</b>
        </div>
        <button class="btn danger ghost" onclick={() => store.supprimerMission(mi.id)}><Trash2 size={14} /> Supprimer</button>
      </article>
    {:else}
      {#if !ouvert}<p class="muted vide">Aucune mission. Ajoute la première pour voir ton net estimé et ton planning.</p>{/if}
    {/each}
  </div>
</section>

<style>
  .entete { margin-bottom: 16px; }
  .form { display: grid; gap: 14px; margin-bottom: 16px; }
  .chips { flex-wrap: wrap; margin-top: 8px; }
  .apercu { background: var(--surface-2); border-radius: 12px; padding: 12px 14px; display: grid; gap: 6px; }
  .net { color: var(--ok); }
  .liste { display: grid; gap: 12px; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); }
  .mission { display: grid; gap: 10px; border-left: 4px solid var(--c-interim); }
  .vide { text-align: center; padding: 24px; }
  @media (max-width: 640px) { .g3 { grid-template-columns: 1fr 1fr; } }
</style>
