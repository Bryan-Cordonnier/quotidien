<script lang="ts">
  // Le repos légal de la semaine, en une ligne discrète : 48 h par semaine, 10 h par jour, 11 h entre deux journées.
  import type { Session } from "../../src/session.svelte";
  import { resumeRepos } from "../../src/repos";
  import type { Jour } from "@etabli/ui/civil";

  let { s, jour }: { s: Session; jour: Jour } = $props();

  const r = $derived(s.carnet ? resumeRepos(s.carnet.evenements, jour) : null);
  const duree = (min: number) => `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, "0")}`;
  const part = $derived(r ? Math.min(100, Math.round((r.totalMin / (48 * 60)) * 100)) : 0);
  const niveau = $derived(r ? (r.totalMin > 48 * 60 ? "alerte" : r.totalMin > 44 * 60 ? "attention" : "normal") : "normal");
</script>

{#if r}
  <section class="bloc ligne">
    <span class="etiquette" style="margin: 0">Repos légal, semaine du jour choisi</span>
    <span><b class="num">{duree(r.totalMin)}</b> <span class="petit">sur 48 h</span></span>
    <span class="piste" aria-hidden="true"><i class={niveau} style:width="{part}%"></i></span>
    <span class="petit">plus longue journée <b class="num">{duree(r.plusLongueJourneeMin)}</b> (10 h max)</span>
    <span class="petit">repos entre deux journées <b class="num">{r.reposMinMin === null ? "—" : duree(r.reposMinMin)}</b> (11 h min)</span>
  </section>
{/if}

<style>
  .ligne {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px 24px;
    padding: 10px 18px;
  }
  .piste {
    width: 160px;
    height: 8px;
    border-radius: 4px;
    background: var(--field);
    overflow: hidden;
  }
  .piste i {
    display: block;
    height: 100%;
    background: var(--accent);
  }
  .piste i.attention {
    background: var(--warn);
  }
  .piste i.alerte {
    background: var(--err);
  }
</style>