<script lang="ts">
  // Le sommeil : la grille des nuits (du rouge au vert selon la cible), la moyenne en gros et « Je vais dormir maintenant » qui note le coucher.
  import { ajouterJours } from "@etabli/ui/civil";
  import { occurrences } from "../../src/calculs";
  import { coucherDe as coucherConseille, leverDe } from "../../src/journee";
  import type { Session } from "../../src/session.svelte";
  import { dureeNuit, grilleNuits, noterCoucher, sommeilMoyen } from "../../src/sommeil";
  import { heure } from "../../src/vue";

  let { s }: { s: Session } = $props();

  const SEMAINES = 17;
  const duree = (min: number) => `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, "0")}`;
  const levers = (jour: string) => (s.carnet ? leverDe(occurrences(s.carnet.evenements, jour, jour), s.reglages.journee) : 0);
  const cible = $derived(s.reglages.journee.sommeilMin);
  const grille = $derived(s.carnet ? grilleNuits(s.carnet, s.aujourdhui, SEMAINES, cible, levers) : []);
  const moyenne = $derived(s.carnet ? sommeilMoyen(s.carnet, s.aujourdhui, 30, levers) : null);
  const ce_soir = $derived(
    s.carnet ? coucherConseille(occurrences(s.carnet.evenements, ajouterJours(s.aujourdhui, 1), ajouterJours(s.aujourdhui, 1)), s.reglages.journee) : 0,
  );
  const dejaNote = $derived(s.carnet ? s.carnet.sommeil[s.aujourdhui] !== undefined : false);
  let info = $state("");

  function dormir(): void {
    info = "";
    let coucher = { jourSoir: s.aujourdhui, coucherMin: 0 };
    if (s.appliquer((c) => {
      const r = noterCoucher(c, Date.now());
      coucher = r.coucher;
      return r.carnet;
    })) {
      const d = s.carnet ? dureeNuit(s.carnet, coucher.jourSoir, levers(ajouterJours(coucher.jourSoir, 1))) : null;
      info = d ? `Coucher noté à ${heure(coucher.coucherMin % 1440)} : ${duree(d)} de sommeil jusqu'au lever prévu.` : `Coucher noté à ${heure(coucher.coucherMin % 1440)}.`;
    }
  }
</script>

<section class="bloc">
  <div class="bloc-titre">
    <h3>Sommeil</h3>
    <span class="petit">cible : {duree(cible)}</span>
  </div>
  <div class="sl">
    <div class="heat" role="img" aria-label="Sommeil des {SEMAINES} dernières semaines">
      {#each grille as semaine (semaine[0]?.jour)}
        {#each semaine as c (c.jour)}
          <i class={c.zone ?? (c.futur ? "fut" : "")} title={c.minutes !== null ? `${c.jour} : ${duree(c.minutes)}` : c.jour}></i>
        {/each}
      {/each}
    </div>
    <div class="droite">
      <div>
        <div class="grand num">{moyenne === null ? "—" : duree(moyenne)}</div>
        <span class="petit">moyenne</span>
      </div>
      <div>
        <button class="btn primary" onclick={dormir}>{dejaNote ? "Coucher déjà noté" : "Je vais dormir maintenant"}</button>
        <div class="petit" style="margin-top: 6px">Coucher conseillé ce soir : <b class="num">{heure(ce_soir % 1440)}</b></div>
      </div>
    </div>
  </div>
  {#if info}<p class="petit" role="status" style="margin: 8px 0 0">{info}</p>{/if}
</section>

<style>
  .sl {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 200px;
    gap: 28px;
    align-items: center;
    margin-top: 12px;
  }
  /* Une colonne par semaine, sept lignes (lundi → dimanche), façon grille d'activité. */
  .heat {
    display: grid;
    grid-auto-flow: column;
    grid-template-rows: repeat(7, 16px);
    grid-auto-columns: 16px;
    gap: 4px;
    justify-content: start;
    overflow-x: auto;
    padding-bottom: 4px;
  }
  .heat i {
    display: block;
    width: 16px;
    height: 16px;
    border-radius: 3px;
    background: var(--border);
  }
  .heat i.z4 {
    background: var(--z4);
  }
  .heat i.z3 {
    background: var(--z3);
  }
  .heat i.z2 {
    background: var(--z2);
  }
  .heat i.z1 {
    background: var(--z1);
  }
  .heat i.z0 {
    background: var(--z0);
  }
  .heat i.fut {
    border: 1px dashed var(--border);
    background: transparent;
  }
  .droite {
    display: flex;
    flex-direction: column;
    gap: 18px;
    align-items: flex-end;
    text-align: right;
  }
  .grand {
    font-size: 34px;
    font-weight: 600;
    line-height: 1.1;
  }
  @media (max-width: 900px) {
    .sl {
      grid-template-columns: 1fr;
    }
    .droite {
      align-items: flex-start;
      text-align: left;
    }
  }
</style>