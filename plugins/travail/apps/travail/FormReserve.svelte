<script lang="ts">
  // Une mission de réserviste : du premier au dernier jour, on arrive à la base le premier jour (heure d'arrivée) et on la quitte le dernier (heure de départ) ;
  // entre les deux on y reste jour et nuit. Chaque jour est un jour payé, à la base ou hors base : les heures servent uniquement à l'emploi du temps.
  import { Modal } from "@etabli/ui";
  import { jourDeInstant, plage } from "@etabli/ui/civil";
  import { formatEuros } from "@etabli/ui/money";
  import { detailReserve } from "../../src/calculs";
  import { ajouterReserve, modifierReserve } from "../../src/donnees";
  import { jourMois } from "../../src/affichage";
  import type { Session } from "../../src/session.svelte";

  let { s, id, onclose }: { s: Session; id?: string; onclose: () => void } = $props();

  // svelte-ignore state_referenced_locally
  const existante = id ? s.donnees?.reserves.find((r) => r.id === id) : undefined;
  const hhmm = (min: number) => `${String(Math.floor(min / 60) % 24).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
  const minutes = (h: string): number => (/^\d\d:\d\d$/.test(h) ? Number(h.slice(0, 2)) * 60 + Number(h.slice(3)) : 0);
  const aujourdhui = jourDeInstant(Date.now());

  let libelle = $state(existante?.libelle ?? "Réserve");
  // Les jours se cochent sur un calendrier, mois par mois ; ils doivent se suivre (sinon ce sont deux missions).
  let coches = $state<string[]>(existante ? plage(existante.debut, existante.fin, 400) : []);
  let mois = $state((existante?.debut ?? aujourdhui).slice(0, 7));
  const tries = $derived([...coches].sort());
  const du = $derived(tries[0] ?? "");
  const au = $derived(tries.at(-1) ?? "");
  const suivis = $derived(!du || plage(du, au, 400).length === tries.length);
  const cocher = (j: string) => (coches = coches.includes(j) ? coches.filter((x) => x !== j) : [...coches, j]);
  const decaler = (n: number) => {
    const d = new Date(Date.UTC(Number(mois.slice(0, 4)), Number(mois.slice(5)) - 1 + n, 1));
    mois = d.toISOString().slice(0, 7);
  };
  // Les cases du mois, semaine commençant le lundi ; null pour les cases vides avant le 1er.
  const cases = $derived.by(() => {
    const premier = new Date(`${mois}-01T00:00:00Z`);
    const nb = new Date(Date.UTC(premier.getUTCFullYear(), premier.getUTCMonth() + 1, 0)).getUTCDate();
    const vides = (premier.getUTCDay() + 6) % 7;
    return [...Array(vides).fill(null), ...Array.from({ length: nb }, (_, i) => `${mois}-${String(i + 1).padStart(2, "0")}`)] as (string | null)[];
  });
  const nomMois = $derived(new Date(`${mois}-01T00:00:00Z`).toLocaleDateString("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" }));
  // svelte-ignore state_referenced_locally
  let arrivee = $state(hhmm(existante?.arriveeMin ?? s.reglages.reserveDebutMin));
  // svelte-ignore state_referenced_locally
  let depart = $state(hhmm(existante?.departMin ?? s.reglages.reserveFinMin));
  let horsBase = $state<string[]>(existante ? [...existante.joursHorsBase] : []);
  let erreur = $state("");

  const jours = $derived(du && suivis ? tries : []);
  const periode = $derived({ id: "r0", libelle, debut: du, fin: au, arriveeMin: minutes(arrivee), departMin: minutes(depart), joursHorsBase: horsBase.filter((j) => jours.includes(j)) });
  const detail = $derived(jours.length > 0 ? detailReserve(periode, s.reglages) : null);
  const basculer = (j: string) => (horsBase = horsBase.includes(j) ? horsBase.filter((x) => x !== j) : [...horsBase, j]);

  function enregistrer(): void {
    erreur = "";
    if (!du) return void (erreur = "Coche au moins un jour sur le calendrier.");
    if (!suivis) return void (erreur = "Les jours cochés doivent se suivre, sans trou. Pour des jours de repos au milieu, enregistre deux missions (« Partie 1 », « Partie 2 »).");
    const brut = { libelle, debut: du, fin: au, arriveeMin: periode.arriveeMin, departMin: periode.departMin, joursHorsBase: periode.joursHorsBase };
    const ok = id ? s.appliquer((d) => modifierReserve(d, id, brut)) : s.appliquer((d) => ajouterReserve(d, brut).donnees);
    if (ok) onclose();
    else erreur = s.message;
  }
</script>

<Modal open titre={id ? "Modifier la mission de réserviste" : "Mission de réserviste"} {onclose} largeur={540}>
  <div class="groupe"><label for="r-lib">Nom de la mission</label><input id="r-lib" class="saisie" bind:value={libelle} autocomplete="off" /></div>
  <div class="groupe">
    <span class="etiquette">Coche les jours de la mission</span>
    <div class="calendrier">
      <div class="entete-mois">
        <button class="btn sm" onclick={() => decaler(-1)} aria-label="Mois précédent">‹</button>
        <b>{nomMois}</b>
        <button class="btn sm" onclick={() => decaler(1)} aria-label="Mois suivant">›</button>
      </div>
      <div class="grille" role="group" aria-label="Jours de {nomMois}">
        {#each ["L", "M", "M", "J", "V", "S", "D"] as j, i (i)}<span class="jsem">{j}</span>{/each}
        {#each cases as c, i (c ?? `vide${i}`)}
          {#if c}
            <button class="case {coches.includes(c) ? 'cochee' : ''} {c === aujourdhui ? 'auj' : ''}" onclick={() => cocher(c)} aria-pressed={coches.includes(c)} aria-label={jourMois(c)}>{Number(c.slice(8))}</button>
          {:else}<span></span>{/if}
        {/each}
      </div>
    </div>
    <p class="petit {suivis ? '' : 'negatif'}" style="margin: 0">
      {#if !du}Aucun jour coché.{:else if !suivis}Il y a un trou entre deux jours : les jours doivent se suivre.{:else}Du {jourMois(du)} au {jourMois(au)} · {tries.length} jour{tries.length > 1 ? "s" : ""}.{/if}
    </p>
  </div>
  <div class="groupe">
    <label for="r-arr">Heure d'arrivée à la base (premier jour) et heure de départ (dernier jour)</label>
    <div class="actions">
      <input id="r-arr" class="saisie" style="width: auto" type="time" bind:value={arrivee} aria-label="Heure d'arrivée à la base le premier jour" />
      <span class="petit">→</span>
      <input id="r-dep" class="saisie" style="width: auto" type="time" bind:value={depart} aria-label="Heure de départ de la base le dernier jour" />
    </div>
    <p class="petit" style="margin: 0">
      Pour l'emploi du temps seulement : entre les deux tu es à la base jour et nuit. Chaque jour est un jour payé, quelle que soit l'heure.
      {#if s.reglages.baseLieu}Lieu dans l'agenda : {s.reglages.baseLieu}.{:else}Règle le nom et l'adresse de ta base dans Paramètres → Travail pour qu'ils apparaissent dans l'agenda.{/if}
    </p>
  </div>
  <div class="groupe">
    <span class="etiquette">Chaque jour : à la base ou hors base</span>
    <div class="puces" aria-label="Jours de la mission">
      {#each jours as j (j)}
        {@const hors = periode.joursHorsBase.includes(j)}
        <button class="btn sm {hors ? '' : 'primary'}" onclick={() => basculer(j)} aria-pressed={hors} title={hors ? "Hors base (clique pour remettre à la base)" : "À la base (clique pour passer hors base)"}>{jourMois(j)} · {hors ? "hors base" : "base"}</button>
      {/each}
      {#if jours.length === 0}<span class="petit">Coche des jours qui se suivent.</span>{/if}
    </div>
  </div>
  {#if detail}
    <p style="margin: 0">
      {detail.jours} jour{detail.jours > 1 ? "s" : ""} ({detail.joursABase} à la base, {detail.joursHorsBase} hors base) · net estimé : <b class="num">{formatEuros(detail.netCents)}</b>
    </p>
  {/if}
  {#if erreur}<p class="negatif" role="alert">{erreur}</p>{/if}
  {#snippet pied()}<button class="btn primary" onclick={enregistrer}>{id ? "Enregistrer" : "Ajouter la mission"}</button>{/snippet}
</Modal>

<style>
  .calendrier {
    border: 1px solid var(--border);
    border-radius: var(--r-md);
    padding: 10px;
  }
  .entete-mois {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
    text-transform: capitalize;
  }
  .grille {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 4px;
  }
  .jsem {
    text-align: center;
    font-size: 11px;
    color: var(--muted);
  }
  .case {
    aspect-ratio: 1;
    min-height: 34px;
    border: 1px solid var(--border);
    border-radius: var(--r-sm);
    background: var(--surface);
    color: var(--text);
    font: inherit;
    cursor: pointer;
  }
  .case.auj {
    border-color: var(--accent);
  }
  .case.cochee {
    background: var(--accent);
    border-color: var(--accent);
    color: var(--accent-text);
    font-weight: 700;
  }
  .puces {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;
  }
</style>
