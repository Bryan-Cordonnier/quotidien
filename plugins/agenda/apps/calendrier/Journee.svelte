<script lang="ts">
  import { Icon } from "@etabli/ui";
  // La journée choisie, du lever au coucher estimé : un bloc par étape (préparation, trajet, travail, trajet retour, temps libre), son nom à
  // côté. Un bloc de travail montre le temps de travail du contrat, jamais la durée entre le début et la fin (la pause serait comptée).
  // Les flèches changent de jour ; un clic sur un événement saisi ici le modifie (ceux des autres plugins se modifient chez eux).
  import { ajouterJours, type Jour } from "@etabli/ui/civil";
  import { occurrencesDuCarnet, trajetMajore } from "../../src/calculs";
  import { departDe, journee, premierDuMatin, trier, type Segment } from "../../src/journee";
  import type { Session } from "../../src/session.svelte";
  import { UTILISATEUR } from "../../src/types";
  import { heure, libelleJour } from "../../src/vue";

  interface Props {
    s: Session;
    jour: Jour;
    onjour: (delta: number) => void;
    onmodifier: (id: string) => void;
    onsupprimer: (id: string) => void;
  }

  let { s, jour, onjour, onmodifier, onsupprimer }: Props = $props();
  /** L'événement d'un autre plugin dont la suppression attend une confirmation (deux clics, sans fenêtre : le plugin est isolé). */
  let aSupprimer = $state<string | null>(null);

  const j = $derived(s.carnet ? journee(occurrencesDuCarnet(s.carnet, jour, jour), occurrencesDuCarnet(s.carnet, ajouterJours(jour, 1), ajouterJours(jour, 1)), s.reglages.journee) : null);
  const hhmm = (min: number) => heure(((min % 1440) + 1440) % 1440);
  /** Le premier départ du matin, celui qui commande le réveil, et son trajet (null : pas encore calculé). */
  const occJour = $derived(s.carnet ? trier(occurrencesDuCarnet(s.carnet, jour, jour)) : []);
  const matin = $derived(premierDuMatin(occJour));
  /** Un événement du matin avec un lieu mais sans trajet (pas encore calculé, ou adresse mal trouvée) : le réveil ne compte pas la route. */
  const sansTrajet = $derived(occJour.find((o) => o.debutMin > 0 && o.debutMin < 720 && !!o.lieu && o.trajetMin === null));
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
      <button class="btn" onclick={() => onjour(-1)} aria-label="Jour précédent"><Icon name="chevron-left" size={18} /></button>
      <h3>{libelleJour(jour)}</h3>
      <button class="btn" onclick={() => onjour(1)} aria-label="Jour suivant"><Icon name="chevron-right" size={18} /></button>
    </div>
    {#if j}
      <p class="resume" aria-label="Résumé de la journée">
        <span>⏰ Réveil <b class="num">{hhmm(j.leverMin)}</b></span>
        {#if matin && matin.trajetMin !== null}
          <span>🚗 Départ <b class="num">{hhmm(departDe(matin, s.reglages.journee))}</b></span>
          <span>Trajet <b class="num">{duree(trajetMajore(matin.trajetMin, s.reglages.journee.majorationTrajetBp))}</b></span>
        {/if}
        <span>🛏 Coucher <b class="num">{hhmm(j.coucherMin)}</b></span>
      </p>
      {#if sansTrajet}
        <p class="alerte">
          ⚠ Trajet vers « {sansTrajet.lieu} » pas encore calculé : le réveil ne compte pas la route.
          {s.trajetsMessage}
          <button class="btn sm" onclick={() => void s.actualiserTrajets(true)}>Calculer</button>
        </p>
      {/if}
      <div class="frise">
        {#each j.segments as seg, i (i)}
          {@const modifiable = seg.genre === "evenement" && (seg.occurrence?.source === UTILISATEUR || seg.occurrence?.source === "cerveau")}
          <div class="seg {seg.genre} {classe(seg)}" style="--m: {Math.max(0, seg.finMin - seg.debutMin)}">
            <span class="h num">{hhmm(seg.debutMin)}</span>
            {#if modifiable}
              <button class="carte nom" onclick={() => onmodifier(seg.occurrence!.evenementId)} title="Modifier cet événement"><b>{seg.titre}</b><small>{detail(seg)}</small></button>
            {:else}
              <span class="carte nom"><b>{seg.titre}</b>{#if seg.genre !== "coucher"}<small>{detail(seg)}</small>{/if}</span>
              {#if seg.genre === "evenement" && seg.occurrence}
                {@const eid = seg.occurrence.evenementId}
                {#if aSupprimer === eid}
                  <button
                    class="btn danger"
                    onclick={() => {
                      onsupprimer(eid);
                      aSupprimer = null;
                    }}
                    title={seg.occurrence.source === "cerveau" ? "" : `Cet événement vient de « ${seg.occurrence.source} » : il peut revenir tant qu'il n'est pas supprimé là-bas.`}>Supprimer ?</button
                  >
                {:else}
                  <button class="btn" onclick={() => (aSupprimer = eid)} aria-label="Supprimer cet événement" title="Supprimer cet événement">✕</button>
                {/if}
              {/if}
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
  .resume {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 6px 16px;
    margin: 10px 0 0;
    font-size: 13px;
    color: var(--muted);
  }
  .resume b {
    color: var(--text);
    font-size: 15px;
  }
  .frise {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    margin-top: 12px;
    overflow-y: auto;
  }
  /* Chaque étape est une carte pleine largeur, teintée de la couleur du contrat, avec l'heure à gauche : plus de grand vide à droite. */
  .seg {
    flex: var(--m) 1 0;
    min-height: 46px;
    display: grid;
    grid-template-columns: 46px minmax(0, 1fr);
    gap: 0 10px;
    align-items: stretch;
    padding: 3px 0;
  }
  .seg.coucher {
    flex: 0 0 34px;
    min-height: 34px;
  }
  .h {
    padding-top: 9px;
    color: var(--muted);
    font-size: 11.5px;
    text-align: right;
  }
  .carte {
    min-width: 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 6px 14px;
    border: 0;
    border-left: 5px solid var(--kc, var(--border));
    border-radius: 10px;
    background: color-mix(in srgb, var(--kc, var(--faint)) 16%, var(--surface));
    text-align: left;
    font: inherit;
    color: inherit;
  }
  .seg.preparation .carte {
    --kc: var(--accent);
  }
  .seg.trajet .carte {
    --kc: var(--faint);
  }
  .seg.libre .carte {
    border: 1px dashed var(--border);
    background: transparent;
    color: var(--muted);
  }
  .seg.coucher .carte {
    --kc: var(--text);
    justify-content: center;
    background: var(--surface-2);
  }
  .nom {
    min-width: 0;
  }  button.carte {
    cursor: pointer;
  }
  button.carte:hover b {
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
  .seg.libre .nom small {
    color: var(--faint);
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