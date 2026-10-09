<script lang="ts">
  // Les widgets de l'Agenda sur l'accueil : la journée du jour, et l'heure de coucher conseillée ce soir (un clic ouvre le Calendrier).
  import { ajouterJours } from "@etabli/ui/civil";
  import { occurrences } from "../../src/calculs";
  import { coucherDe as coucherConseille, journee, type Segment } from "../../src/journee";
  import { Session } from "../../src/session.svelte";
  import { heure } from "../../src/vue";
  import "../calendrier/couleurs.css";

  const id = /^#widget=([a-z0-9-]+)/.exec(location.hash)?.[1] ?? "aujourdhui";
  const s = new Session();
  void s.demarrer();
  $effect(() => () => s.arreter());

  const j = $derived(
    s.carnet ? journee(occurrences(s.carnet.evenements, s.aujourdhui, s.aujourdhui), occurrences(s.carnet.evenements, ajouterJours(s.aujourdhui, 1), ajouterJours(s.aujourdhui, 1)), s.reglages.journee) : null,
  );
  const coucher = $derived(s.carnet ? coucherConseille(occurrences(s.carnet.evenements, ajouterJours(s.aujourdhui, 1), ajouterJours(s.aujourdhui, 1)), s.reglages.journee) : 0);
  const hhmm = (min: number) => heure(((min % 1440) + 1440) % 1440);
  const utiles = $derived((j?.segments ?? []).filter((seg: Segment) => seg.genre !== "libre" && seg.genre !== "coucher"));
  const classe = (seg: Segment): string =>
    seg.genre === "evenement" ? `k-${seg.occurrence?.contrat ?? (seg.occurrence && (seg.occurrence.type === "travail" || seg.occurrence.type === "retux") ? "interim" : seg.occurrence?.type === "rdv" ? "rdv" : "autre")}` : "";
  const ouvrir = () => s.hote?.openPage("calendrier");
</script>

{#if s.illisible}
  <div class="w"><p class="petit negatif">Agenda illisible.</p></div>
{:else if !s.carnet}
  <div class="w"><p class="petit">Chargement…</p></div>
{:else if id === "coucher"}
  <button class="w lien" onclick={ouvrir} aria-label="Ouvrir le Calendrier">
    <p class="etiquette">Coucher conseillé ce soir</p>
    <div class="grand num">{heure(coucher % 1440)}</div>
  </button>
{:else}
  <button class="w lien haut" onclick={ouvrir} aria-label="Ouvrir le Calendrier">
    <p class="etiquette">Aujourd'hui</p>
    {#if utiles.length === 0}
      <p class="petit">Rien de prévu aujourd'hui.</p>
    {:else}
      <ul class="cartes">
        {#each utiles as seg, i (i)}
          <li class="carte {seg.genre} {classe(seg)}"><span class="num h">{hhmm(seg.debutMin)}</span><b>{seg.titre}</b></li>
        {/each}
      </ul>
    {/if}
  </button>
{/if}

<style>
  .w {
    box-sizing: border-box;
    width: 100%;
    height: 100vh;
    padding: 14px 16px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 6px;
    margin: 0;
    border: 0;
    background: none;
    color: var(--text);
    text-align: left;
    font: inherit;
  }
  .w.haut {
    justify-content: flex-start;
    overflow: auto;
  }
  .lien {
    cursor: pointer;
  }
  .lien:hover {
    background: var(--surface-2);
  }
  .grand {
    font-size: 30px;
    font-weight: 600;
    line-height: 1.1;
  }
  .attention {
    color: var(--warn);
  }
  .alerte {
    color: var(--err);
  }

  .cartes {
    list-style: none;
    margin: 6px 0 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .carte {
    display: flex;
    gap: 10px;
    align-items: baseline;
    padding: 7px 10px;
    border-left: 5px solid var(--kc, var(--faint));
    border-radius: 9px;
    background: color-mix(in srgb, var(--kc, var(--faint)) 16%, var(--surface));
  }
  .h {
    color: var(--muted);
    font-size: 12px;
  }
  .k-interim {
    --kc: var(--k-interim);
  }
  .k-reserve {
    --kc: var(--k-reserve);
  }
  .k-cdd {
    --kc: var(--k-cdd);
  }
  .k-cdi {
    --kc: var(--k-cdi);
  }
  .k-rdv {
    --kc: var(--k-rdv);
  }
  .k-autre {
    --kc: var(--k-autre);
  }
</style>
