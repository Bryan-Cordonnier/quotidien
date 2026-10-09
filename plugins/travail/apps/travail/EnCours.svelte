<script lang="ts">
  // La mission en cours : titre et net à droite, jours faits sur le total, le temps de la semaine en grand avec de quoi ajouter des
  // heures (flèches, puis « + » : autant de fois que l'on veut), et la date de la prochaine paie.
  import { Jauge, Icon } from "@etabli/ui";
  import { formatEuros } from "@etabli/ui/money";
  import { heuresMinutes, jourLong } from "../../src/affichage";
  import { effacerSupplementaires, ajouterSupplementaires } from "../../src/donnees";
  import { joursDeLaSemaine } from "../../src/calculs";
  import type { Session } from "../../src/session.svelte";
  import { missionEnCours, resume } from "../../src/vue";

  let { s }: { s: Session } = $props();

  const m = $derived(s.donnees ? missionEnCours(s.donnees, s.aujourdhui) : undefined);
  const r = $derived(s.donnees && m ? resume(s.donnees, s.reglages, m, s.aujourdhui) : null);

  /** Le temps à ajouter : heures (de 1 en 1) et minutes (de 5 en 5). */
  let h = $state(0);
  let min = $state(0);
  const heures = (delta: number) => (h = Math.max(0, Math.min(12, h + delta)));
  const minutes = (delta: number) => (min = (min + delta + 60) % 60);

  function ajouter(): void {
    if (!m) return;
    const total = h * 60 + min;
    if (total === 0) {
      s.message = "Réglez d'abord un temps avec les flèches.";
      return;
    }
    if (s.appliquer((d) => ajouterSupplementaires(d, m.id, s.aujourdhui, total))) {
      h = 0;
      min = 0;
    }
  }
  const effacer = () => m && s.appliquer((d) => effacerSupplementaires(d, m.id, joursDeLaSemaine(s.aujourdhui)));
  const pad = (n: number) => String(n).padStart(2, "0");
</script>

<section class="bloc">
  <p class="etiquette">Mission en cours</p>
  {#if m && r}
    <div class="titre">
      <b>{r.titre}</b>
      <span class="num net">{formatEuros(r.netCents)}</span>
    </div>
    <Jauge pourcent={r.pourcent} gauche="{r.faits}/{r.total} jours" droite="{r.pourcent} %" label="Jours travaillés de la mission" />
    <div class="semaine">
      <div class="grand num">
        {heuresMinutes(r.semaine.totalMin)}
        <small>
          cette semaine{#if r.semaine.ajouteesMin > 0}
            · dont +{heuresMinutes(r.semaine.ajouteesMin)} ajoutées <button class="btn sm" onclick={effacer}>Effacer</button>{/if}
        </small>
      </div>
      <div class="reglage" role="group" aria-label="Ajouter du temps à la semaine">
        <div class="colonne">
          <button onclick={() => heures(1)} aria-label="Une heure de plus"><Icon name="chevron-up" size={16} /></button>
          <output class="num">{h}</output>
          <button onclick={() => heures(-1)} aria-label="Une heure de moins"><Icon name="chevron-down" size={16} /></button>
        </div>
        <span class="unite">h</span>
        <div class="colonne">
          <button onclick={() => minutes(5)} aria-label="Cinq minutes de plus"><Icon name="chevron-up" size={16} /></button>
          <output class="num">{pad(min)}</output>
          <button onclick={() => minutes(-5)} aria-label="Cinq minutes de moins"><Icon name="chevron-down" size={16} /></button>
        </div>
        <span class="unite">min</span>
        <button class="plus" onclick={ajouter} aria-label="Ajouter ce temps à la semaine"><Icon name="plus" size={20} /></button>
      </div>
    </div>
    <p class="petit paie">Prochaine paie : <b class="num">{r.prochainePaie ? jourLong(r.prochainePaie.date) : "—"}</b></p>
  {:else}
    <div class="vide">Aucune mission en cours.</div>
  {/if}
</section>

<style>
  .titre {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: baseline;
    gap: 6px 12px;
  }
  .titre b {
    font-size: 17px;
    font-weight: 800;
    letter-spacing: -0.02em;
  }
  .net {
    font-size: 17px;
    font-weight: 600;
  }
  .semaine {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    margin-top: 12px;
  }
  .grand {
    font-size: 34px;
    font-weight: 600;
    line-height: 1.1;
  }
  .grand small {
    display: block;
    font-family: var(--font);
    font-size: 12px;
    letter-spacing: 0;
    font-weight: 600;
    color: var(--muted);
  }
  .reglage {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .colonne {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
  }
  .colonne button {
    width: 38px;
    height: 22px;
    border: 1px solid var(--border);
    border-radius: 7px;
    background: var(--field);
    color: var(--muted);
    display: grid;
    place-items: center;
    padding: 0;
    cursor: pointer;
  }
  output {
    min-width: 38px;
    text-align: center;
    font-size: 20px;
    font-weight: 600;
  }
  .unite {
    margin: 0 6px 0 1px;
    color: var(--muted);
    font-size: 12px;
    font-weight: 600;
  }
  .plus {
    width: 40px;
    height: 40px;
    margin-left: 4px;
    border: 0;
    border-radius: 10px;
    background: var(--accent);
    color: var(--accent-text);
    display: grid;
    place-items: center;
    padding: 0;
    cursor: pointer;
  }
  .paie {
    margin: 12px 0 0;
  }
  .paie b {
    color: var(--text);
  }
</style>