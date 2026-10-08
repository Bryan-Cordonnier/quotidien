<script lang="ts">
  // Les trajets du jour : deux boutons seulement, « Je suis parti » et « Je suis arrivé ». Le logiciel devine de quel trajet on parle d'après
  // l'heure et ce qui est déjà noté, et refuse un bouton hors de propos (le départ compte quand les roues tournent, pas quand on quitte la maison).
  import { ajouterJours } from "@etabli/ui/civil";
  import { occurrences } from "../../src/calculs";
  import { journee, trajetsDe } from "../../src/journee";
  import type { Session } from "../../src/session.svelte";
  import { cible, etats, jeSuisArrive, jeSuisParti, type Reponse } from "../../src/trajets";
  import { heure } from "../../src/vue";

  let { s }: { s: Session } = $props();

  const trajets = $derived(
    s.carnet ? trajetsDe(journee(occurrences(s.carnet.evenements, s.aujourdhui, s.aujourdhui), occurrences(s.carnet.evenements, ajouterJours(s.aujourdhui, 1), ajouterJours(s.aujourdhui, 1)), s.reglages.journee)) : [],
  );
  const notes = $derived(s.carnet?.trajets[s.aujourdhui] ?? {});
  const visee = $derived(cible(trajets, notes, s.maintenantMin));
  const points = $derived(etats(trajets, notes, s.maintenantMin));
  let reponse = $state<{ ok: boolean; texte: string } | null>(null);
  const duree = (min: number) => (min < 60 ? `${min} min` : `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, "0")}`);

  function agir(f: (c: NonNullable<typeof s.carnet>, jour: string, t: typeof trajets, min: number) => Reponse): void {
    if (!s.carnet) return;
    const r = f(s.carnet, s.aujourdhui, trajets, s.maintenantMin);
    reponse = { ok: r.ok, texte: r.texte };
    if (r.ok) s.appliquer(() => r.carnet);
  }
</script>

<section class="bloc tj">
  <div class="bloc-titre">
    <h3>Trajet</h3>
    <span class="points" aria-label="Trajets du jour">
      {#each points as e, i (i)}<i class={e}></i>{/each}
    </span>
  </div>
  <div class="corps">
    {#if trajets.length === 0}
      <span class="petit">Aucun trajet prévu aujourd'hui.</span>
    {:else if visee < 0}
      <b>Plus de trajet aujourd'hui</b>
      <span class="petit">Tous les trajets de la journée sont faits.</span>
    {:else}
      {@const t = trajets[visee]!}
      {@const n = notes[String(visee)]}
      {#if n}
        <b>En route{t.detail ? ` : ${t.detail.replace(/^(vers|depuis) /, "")}` : ""}</b>
        <span class="petit">parti à {heure(n.depart)} · arrivée prévue {heure(n.depart + (t.finMin - t.debutMin))}</span>
      {:else}
        <b>{t.titre}{t.detail ? ` ${t.detail}` : ""}</b>
        <span class="petit">départ conseillé {heure(t.debutMin % 1440)} · {duree(t.finMin - t.debutMin)} de trajet</span>
      {/if}
    {/if}
    <div class="actions">
      <button class="btn primary grand" onclick={() => agir(jeSuisParti)}>Je suis parti</button>
      <button class="btn primary grand" onclick={() => agir(jeSuisArrive)}>Je suis arrivé</button>
    </div>
    {#if reponse}<p class="msg" class:ok={reponse.ok} role="status">{reponse.texte}</p>{/if}
  </div>
</section>

<style>
  .tj {
    display: flex;
    flex-direction: column;
  }
  .corps {
    display: flex;
    flex-direction: column;
    gap: 12px;
    flex: 1;
    margin-top: 12px;
  }
  .actions {
    flex-direction: column;
    align-items: stretch;
    margin-top: auto;
  }
  .actions .btn {
    width: 100%;
  }
  .points {
    display: flex;
    gap: 6px;
  }
  .points i {
    width: 11px;
    height: 11px;
    border: 2px solid var(--border);
    border-radius: 50%;
  }
  .points i.fait {
    border-color: var(--ok);
    background: var(--ok);
  }
  .points i.en_route {
    border-color: var(--warn);
    background: var(--warn);
  }
  .points i.prochain {
    border-color: var(--accent);
  }
  .msg {
    margin: 0;
    padding: 8px 12px;
    border-radius: 9px;
    background: color-mix(in srgb, var(--warn) 16%, transparent);
    color: var(--warn);
    font-size: 13px;
    font-weight: 600;
  }
  .msg.ok {
    background: color-mix(in srgb, var(--ok) 16%, transparent);
    color: var(--ok);
  }
</style>