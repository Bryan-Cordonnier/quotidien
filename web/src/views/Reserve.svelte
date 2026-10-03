<script lang="ts">
  import Trash2 from '@lucide/svelte/icons/trash-2';
  import Calendrier from '../components/Calendrier.svelte';
  import Heure from '../components/Heure.svelte';
  import { aujourdhui, formatEuros } from '../lib/dates';
  import { payeReserve } from '../lib/planning';
  import { nouvelId, store } from '../lib/store.svelte';
  import type { ISODate, Reserve } from '../lib/types';

  const auj = aujourdhui();
  let annee = $state(Number(auj.slice(0, 4)));
  let mois = $state(Number(auj.slice(5, 7)) - 1);

  let jours = $state<ISODate[]>([]);
  let horsBase = $state(true);
  let lieu = $state('');
  let arrivee = $state(7 * 60);
  let depart = $state(18 * 60);
  let tarifEuros = $state(60);
  let indemniteEuros = $state(38);
  let trajet = $state(45);
  let statut = $state<'probable' | 'confirme'>('probable');

  function basculer(d: ISODate) {
    jours = jours.includes(d) ? jours.filter((x) => x !== d) : [...jours, d].sort();
  }

  function brouillon(): Reserve {
    return {
      id: nouvelId(), lieu,
      jours: jours.map((date) => ({ date, horsBase })),
      heureArriveeMin: arrivee, heureDepartMin: depart,
      tarifJourCents: Math.round(tarifEuros * 100),
      indemniteHorsBaseCents: Math.round(indemniteEuros * 100),
      trajetMin: trajet, statut,
    };
  }

  const apercu = $derived(jours.length ? payeReserve(brouillon(), store.donnees.reglages) : null);

  function enregistrer() {
    if (!jours.length) return;
    store.ajouterReserve(brouillon());
    jours = [];
  }

  const marqueurs = (d: ISODate) =>
    store.donnees.reserves.some((r) => r.jours.some((j) => j.date === d)) ? ['var(--c-reserve)'] : [];
</script>

<section class="vue anim">
  <h1>Réserve</h1>
  <div class="disposition">
    <div class="card">
      <h3>Choisis les jours sur le calendrier</h3>
      <Calendrier {annee} {mois} selectionnes={jours} {marqueurs} onclic={basculer} onmois={(a, m) => { annee = a; mois = m; }} />
    </div>
    <form class="card form" onsubmit={(e) => { e.preventDefault(); enregistrer(); }} data-testid="form-reserve">
      <label class="champ">Lieu<input bind:value={lieu} placeholder="Base / lieu de formation" /></label>
      <div class="grille g2">
        <Heure label="Arrivée" bind:valeur={arrivee} />
        <Heure label="Départ" bind:valeur={depart} />
        <label class="champ">Solde / jour imposable (€)<input type="number" min="0" step="0.01" bind:value={tarifEuros} /></label>
        <label class="champ">Indemnité hors base / jour (€)<input type="number" min="0" step="0.01" bind:value={indemniteEuros} /></label>
        <label class="champ">Trajet (min)<input type="number" min="0" bind:value={trajet} /></label>
        <label class="champ">Statut
          <select bind:value={statut}><option value="probable">Probable</option><option value="confirme">Confirmé</option></select>
        </label>
      </div>
      <label class="ligne"><input type="checkbox" bind:checked={horsBase} /> Jours hors base (indemnité non imposable)</label>
      {#if apercu}
        <div class="apercu" data-testid="apercu-reserve">
          <div class="ligne espace"><span class="muted">{apercu.jours} jours dont {apercu.jours_hors_base} hors base</span></div>
          <div class="ligne espace"><span class="muted">Imposable (brut)</span><b class="mono">{formatEuros(apercu.brut_imposable_cents)}</b></div>
          <div class="ligne espace"><span class="muted">Non imposable</span><b class="mono">{formatEuros(apercu.non_imposable_cents)}</b></div>
          <div class="ligne espace"><span>Net estimé</span><b class="mono net">{formatEuros(apercu.net_cents)}</b></div>
        </div>
      {/if}
      <button class="btn primary" type="submit" disabled={!jours.length}>Enregistrer ({jours.length} jour{jours.length > 1 ? 's' : ''})</button>
    </form>
  </div>

  <div class="liste">
    {#each store.donnees.reserves as r (r.id)}
      {@const p = payeReserve(r, store.donnees.reglages)}
      <article class="card item anim">
        <div class="ligne espace">
          <strong>{r.lieu || 'Réserve'}</strong>
          <span class="pastille">{r.statut === 'confirme' ? 'Confirmé' : 'Probable'}</span>
        </div>
        <div class="muted">{r.jours.length} jours · {r.jours[0]?.date} → {r.jours[r.jours.length - 1]?.date}</div>
        <div class="ligne espace"><span class="muted">Net estimé</span><b class="mono net">{formatEuros(p.net_cents)}</b></div>
        <button class="btn danger ghost" onclick={() => store.supprimerReserve(r.id)}><Trash2 size={14} /> Supprimer</button>
      </article>
    {/each}
  </div>
</section>

<style>
  h1 { margin-bottom: 16px; }
  .disposition { display: grid; gap: 16px; grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr); align-items: start; margin-bottom: 16px; }
  .form { display: grid; gap: 14px; }
  .apercu { background: var(--surface-2); border-radius: 12px; padding: 12px 14px; display: grid; gap: 6px; }
  .net { color: var(--ok); }
  .liste { display: grid; gap: 12px; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); }
  .item { display: grid; gap: 8px; border-left: 4px solid var(--c-reserve); }
  button:disabled { opacity: .5; cursor: not-allowed; }
  @media (max-width: 860px) { .disposition { grid-template-columns: 1fr; } }
</style>
