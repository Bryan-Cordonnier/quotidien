<script lang="ts">
  // La journée choisie, du lever au coucher estimé : un bloc par étape (préparation, trajet, travail, trajet retour, temps libre), son nom à
  // côté. Un bloc de travail montre le temps de travail du contrat, jamais la durée entre le début et la fin (la pause serait comptée).
  // Les flèches changent de jour ; un clic sur un événement saisi ici le modifie (ceux des autres plugins se modifient chez eux).
  import { ajouterJours, type Jour } from "@etabli/ui/civil";
  import { occurrences } from "../../src/calculs";
  import { journee, type Segment } from "../../src/journee";
  import type { Session } from "../../src/session.svelte";
  import { UTILISATEUR } from "../../src/types";
  import { heure, libelleJour } from "../../src/vue";

  interface Props {
    s: Session;
    jour: Jour;
    onjour: (delta: number) => void;
    onmodifier: (id: string) => void;
  }

  let { s, jour, onjour, onmodifier }: Props = $props();

  const j = $derived(s.carnet ? journee(occurrences(s.carnet.evenements, jour, jour), occurrences(s.carnet.evenements, ajouterJours(jour, 1), ajouterJours(jour, 1)), s.reglages.journee) : null);
  const hhmm = (min: number) => heure(((min % 1440) + 1440) % 1440);
  const duree = (min: number) => (min < 60 ? `${min} min` : `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, "0")}`);

  function detail(seg: Segment): string {
    const o = seg.occurrence;
    const temps = o?.tempsContratMin != null ? `${duree(o.tempsContratMin)} de travail` : duree(seg.finMin - seg.debutMin);
    const source = o && o.source !== UTILISATEUR ? o.source : "";
    return [temps, seg.detail, source].filter((x) => x !== "").join(" · ");
  }
  const classe = (seg: Segment): string => (seg.genre === "evenement" ? `k-${seg.occurrence?.contrat ?? (seg.occurrence && (seg.occurrence.type === "travail" || seg.occurrence.type === "retux") ? "interim" : seg.occurrence?.type === "rdv" ? "rdv" : "autre")}` : "");
</script>

<section class="bloc journee">
  <div class="interieur">
    <div class="nav">
      <button class="btn" onclick={() => onjour(-1)} aria-label="Jour précédent">‹</button>
      <h3>{libelleJour(jour)}</h3>
      <button class="btn" onclick={() => onjour(1)} aria-label="Jour suivant">›</button>
    </div>
    {#if j}
      <div class="frise">
        {#each j.segments as seg, i (i)}
          {@const modifiable = seg.genre === "evenement" && seg.occurrence?.source === UTILISATEUR}
          <div class="seg {seg.genre} {classe(seg)}" style="--m: {Math.max(0, seg.finMin - seg.debutMin)}">
            <span class="h num">{hhmm(seg.debutMin)}</span>
            <span class="trait"></span>
            {#if modifiable}
              <button class="nom" onclick={() => onmodifier(seg.occurrence!.evenementId)} title="Modifier cet événement"><b>{seg.titre}</b><small>{detail(seg)}</small></button>
            {:else}
              <span class="nom"><b>{seg.titre}</b>{#if seg.genre !== "coucher"}<small>{detail(seg)}</small>{/if}</span>
            {/if}
          </div>
        {/each}
      </div>
      {#if j.conflits.length > 0}<p class="alerte">⚠ « {j.conflits[0]} » chevauche un autre événement</p>{/if}
    {/if}
  </div>
</section>

<style>
  /* Le bloc ne fait que la hauteur du mois : son contenu est posé à l'intérieur, sans compter dans la hauteur de la ligne. */
  .journee {
    position: relative;
    min-height: 420px;
    overflow: hidden;
  }
  .interieur {
    position: absolute;
    inset: 14px 18px;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }
  .nav {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
  }
  .nav h3 {
    min-width: 170px;
    margin: 0;
    font-size: 15px;
    text-align: center;
    text-transform: none;
  }
  .nav h3::first-letter {
    text-transform: uppercase;
  }
  .frise {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    margin-top: 12px;
    overflow-y: auto;
  }
  .seg {
    flex: var(--m) 1 0;
    min-height: 36px;
    display: grid;
    grid-template-columns: 46px 12px minmax(0, 1fr);
    gap: 0 10px;
    align-items: stretch;
  }
  .seg.coucher {
    flex: 0 0 26px;
    min-height: 26px;
  }
  .h {
    padding-top: 1px;
    color: var(--muted);
    font-size: 11.5px;
    text-align: right;
  }
  .trait {
    margin: 1px 0;
    border-radius: 6px;
    background: var(--kc, var(--border));
  }
  .seg.preparation .trait {
    background: var(--accent);
  }
  .seg.trajet .trait {
    background: var(--faint);
  }
  .seg.libre .trait {
    border: 1px solid var(--border);
    background: repeating-linear-gradient(135deg, var(--border) 0 4px, transparent 4px 8px);
  }
  .seg.coucher .trait {
    background: var(--text);
  }
  .nom {
    display: flex;
    flex-direction: column;
    justify-content: center;
    min-width: 0;
    padding: 1px 0;
    border: 0;
    background: none;
    text-align: left;
    font: inherit;
    color: inherit;
  }
  button.nom {
    cursor: pointer;
  }
  button.nom:hover b {
    text-decoration: underline;
  }
  .nom b {
    font-size: 13px;
    line-height: 1.2;
  }
  .nom small {
    color: var(--muted);
    font-size: 11.5px;
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
  .alerte {
    margin: 8px 0 0;
    color: var(--warn);
    font-size: 12px;
    font-weight: 600;
  }
  @media (max-width: 900px) {
    .journee {
      min-height: 560px;
    }
  }
</style>