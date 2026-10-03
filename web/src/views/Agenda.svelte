<script lang="ts">
  import Calendrier from '../components/Calendrier.svelte';
  import JourPanel from '../components/JourPanel.svelte';
  import { aujourdhui, formatEuros, MOIS } from '../lib/dates';
  import { evenementsDuJour, joursMission, payeMission } from '../lib/planning';
  import { store } from '../lib/store.svelte';
  import type { ISODate, Mission } from '../lib/types';

  const auj = aujourdhui();
  let annee = $state(Number(auj.slice(0, 4)));
  let mois = $state(Number(auj.slice(5, 7)) - 1);
  let actif = $state<ISODate>(auj);

  const couleurs = { interim: 'var(--c-interim)', reserve: 'var(--c-reserve)', rdv: 'var(--c-rdv)' } as const;

  const marqueurs = (d: ISODate) => [...new Set(evenementsDuJour(d, store.donnees).map((e) => couleurs[e.type]))];

  /** Net estimé des jours de missions tombant dans le mois affiché (approximation en limite de semaine). */
  const netMois = $derived.by(() => {
    const prefixe = `${annee}-${String(mois + 1).padStart(2, '0')}`;
    let total = 0;
    for (const m of store.donnees.missions) {
      const jours = joursMission(m).filter((d) => d.startsWith(prefixe));
      if (!jours.length) continue;
      const portion: Mission = { ...m, debut: jours[0], fin: jours[jours.length - 1] };
      total += payeMission(portion, store.donnees.reglages).net_cents;
    }
    for (const r of store.donnees.reserves) {
      const dansMois = r.jours.filter((j) => j.date.startsWith(prefixe));
      total += dansMois.reduce(
        (s, j) => s + Math.round((r.tarifJourCents * (100 - store.donnees.reglages.cotisationsPct)) / 100) + (j.horsBase ? r.indemniteHorsBaseCents : 0),
        0,
      );
    }
    return total;
  });
</script>

<section class="vue anim">
  <div class="ligne espace entete">
    <h1>Agenda</h1>
    <div class="card net" data-testid="net-mois">
      <span class="muted">Net estimé · {MOIS[mois]}</span>
      <b class="mono">{formatEuros(netMois)}</b>
    </div>
  </div>
  <div class="disposition">
    <div class="card">
      <Calendrier
        {annee} {mois} {actif}
        {marqueurs}
        onclic={(d) => (actif = d)}
        onmois={(a, m) => { annee = a; mois = m; }}
      />
      <div class="legende ligne">
        <span class="pastille"><i style="background: var(--c-interim)"></i>Intérim</span>
        <span class="pastille"><i style="background: var(--c-reserve)"></i>Réserve</span>
        <span class="pastille"><i style="background: var(--c-rdv)"></i>Rendez-vous</span>
      </div>
    </div>
    <JourPanel date={actif} />
  </div>
</section>

<style>
  .entete { margin-bottom: 16px; flex-wrap: wrap; gap: 10px; }
  .net { display: grid; padding: 8px 14px; text-align: right; }
  .net b { font-size: 1.2rem; color: var(--ok); }
  .disposition { display: grid; gap: 16px; grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr); align-items: start; }
  .disposition > :global(*) { min-width: 0; }
  .legende { margin-top: 12px; gap: 8px; flex-wrap: wrap; }
  .legende i { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
  @media (max-width: 860px) { .disposition { grid-template-columns: 1fr; } }
</style>
