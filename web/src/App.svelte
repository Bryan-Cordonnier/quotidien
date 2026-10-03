<script lang="ts">
  import CalendarDays from '@lucide/svelte/icons/calendar';
  import Briefcase from '@lucide/svelte/icons/briefcase';
  import Shield from '@lucide/svelte/icons/shield';
  import Settings from '@lucide/svelte/icons/settings';
  import Agenda from './views/Agenda.svelte';
  import Missions from './views/Missions.svelte';
  import Reserve from './views/Reserve.svelte';
  import Reglages from './views/Reglages.svelte';

  const onglets = [
    { id: 'agenda', label: 'Agenda', icone: CalendarDays },
    { id: 'missions', label: 'Intérim', icone: Briefcase },
    { id: 'reserve', label: 'Réserve', icone: Shield },
    { id: 'reglages', label: 'Réglages', icone: Settings },
  ] as const;
  type Onglet = (typeof onglets)[number]['id'];
  let actif = $state<Onglet>('agenda');
</script>

<div class="coque">
  <nav aria-label="Navigation principale">
    <div class="marque">Budget<span>&Planning</span></div>
    {#each onglets as o (o.id)}
      {@const Icone = o.icone}
      <button class="lien" class:actif={actif === o.id} aria-current={actif === o.id ? 'page' : undefined} data-onglet={o.id} onclick={() => (actif = o.id)}>
        <Icone size={20} /><span>{o.label}</span>
      </button>
    {/each}
  </nav>
  <main>
    {#if actif === 'agenda'}<Agenda />
    {:else if actif === 'missions'}<Missions />
    {:else if actif === 'reserve'}<Reserve />
    {:else}<Reglages />{/if}
  </main>
</div>

<style>
  .coque { display: grid; grid-template-columns: 220px minmax(0, 1fr); min-height: 100dvh; }
  nav { position: sticky; top: 0; height: 100dvh; padding: 20px 12px; display: flex; flex-direction: column; gap: 4px; background: var(--surface); border-right: 1px solid var(--border); }
  .marque { font-weight: 700; font-size: 1.1rem; padding: 4px 12px 18px; }
  .marque span { color: var(--accent); }
  .lien { display: flex; align-items: center; gap: 12px; padding: 11px 12px; border: 0; border-radius: 10px; background: transparent; color: var(--muted); text-align: left; transition: background .15s ease, color .15s ease, transform .1s ease; }
  .lien:hover { background: var(--surface-2); color: var(--text); }
  .lien:active { transform: scale(.97); }
  .lien.actif { background: color-mix(in srgb, var(--accent) 18%, transparent); color: var(--text); }
  main { padding: 24px; max-width: 1200px; width: 100%; min-width: 0; }
  @media (max-width: 760px) {
    .coque { grid-template-columns: minmax(0, 1fr); padding-bottom: 72px; }
    nav { position: fixed; inset: auto 0 0 0; top: auto; height: auto; flex-direction: row; justify-content: space-around; padding: 6px 8px calc(6px + env(safe-area-inset-bottom)); border-right: 0; border-top: 1px solid var(--border); z-index: 10; }
    .marque { display: none; }
    .lien { flex-direction: column; gap: 2px; font-size: .7rem; padding: 6px 10px; }
    main { padding: 16px; }
  }
</style>
