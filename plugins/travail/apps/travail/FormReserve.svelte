<script lang="ts">
  // Une période de réserve : les jours (du … au …) payés au tarif du jour, le nombre de jours hors base (payés à l'indemnité) et, pour l'emploi du temps
  // seulement, l'heure de début et l'heure d'arrivée. La paie ne dépend jamais de ces heures : arriver à 11 h reste une journée.
  import { Modal, Icon } from "@etabli/ui";
  import { ajouterJours, comparerJours, jourDeInstant } from "@etabli/ui/civil";
  import { formatEuros } from "@etabli/ui/money";
  import { detailReserve } from "../../src/calculs";
  import { ajouterReserve, modifierReserve } from "../../src/donnees";
  import { jourMois } from "../../src/affichage";
  import type { Session } from "../../src/session.svelte";

  let { s, id, onclose }: { s: Session; id?: string; onclose: () => void } = $props();

  // svelte-ignore state_referenced_locally
  const existante = id ? s.donnees?.reserves.find((r) => r.id === id) : undefined;
  const hhmm = (min: number) => `${String(Math.floor(min / 60) % 24).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
  const minutes = (h: string): number | null => (/^\d\d:\d\d$/.test(h) ? Number(h.slice(0, 2)) * 60 + Number(h.slice(3)) : null);

  let libelle = $state(existante?.libelle ?? "Réserve");
  let du = $state(jourDeInstant(Date.now()));
  let au = $state(jourDeInstant(Date.now()));
  let sansWeekend = $state(false);
  let jours = $state<string[]>(existante ? [...existante.jours] : []);
  let horsBase = $state(String(existante?.horsBase ?? 0));
  // svelte-ignore state_referenced_locally
  let debut = $state(existante?.debutMin != null ? hhmm(existante.debutMin) : hhmm(s.reglages.reserveDebutMin));
  // svelte-ignore state_referenced_locally
  let arrivee = $state(existante?.finMin != null ? hhmm(existante.finMin) : hhmm(s.reglages.reserveFinMin));
  let erreur = $state("");

  /** Ajoute tous les jours de `du` à `au` (inclus), sans les week-ends si on le demande. */
  function ajouterPeriode(): void {
    erreur = "";
    if (comparerJours(au, du) < 0) return void (erreur = "Le dernier jour ne peut pas être avant le premier.");
    const nouveaux = [...jours];
    for (let j = du; comparerJours(j, au) <= 0 && nouveaux.length < 366; j = ajouterJours(j, 1)) {
      const jourSemaine = new Date(`${j}T12:00:00Z`).getUTCDay();
      if (sansWeekend && (jourSemaine === 0 || jourSemaine === 6)) continue;
      if (!nouveaux.includes(j)) nouveaux.push(j);
    }
    jours = nouveaux.sort();
  }
  const retirer = (j: string) => (jours = jours.filter((x) => x !== j));

  const brut = $derived({ libelle, jours, horsBase: Number(horsBase) || 0, debutMin: minutes(debut), finMin: minutes(arrivee) });
  const net = $derived(detailReserve({ id: "r0", libelle, jours, horsBase: Number(horsBase) || 0 }, s.reglages).netCents);

  function enregistrer(): void {
    erreur = "";
    const ok = id ? s.appliquer((d) => modifierReserve(d, id, brut)) : s.appliquer((d) => ajouterReserve(d, brut).donnees);
    if (ok) onclose();
    else erreur = s.message;
  }
</script>

<Modal open titre={id ? "Modifier la période de réserve" : "Jours de réserve"} {onclose} largeur={520}>
  {#if s.reglages.tarifReserveCents === 0}
    <p class="petit" style="margin: 0">Aucun tarif de jour de réserve n'est réglé (Paramètres → Travail) : seuls les jours hors base rapportent.</p>
  {/if}
  <div class="groupe"><label for="r-lib">Nom de la période</label><input id="r-lib" class="saisie" bind:value={libelle} autocomplete="off" /></div>
  <div class="groupe">
    <label for="r-du">Période de réserve</label>
    <div class="actions">
      <span class="petit">du</span><input id="r-du" class="saisie" style="width: auto" type="date" bind:value={du} />
      <span class="petit">au</span><input id="r-au" class="saisie" style="width: auto" type="date" bind:value={au} aria-label="Dernier jour" />
      <button class="btn" onclick={ajouterPeriode}>Ajouter ces jours</button>
    </div>
    <label class="petit" style="display: flex; gap: 6px; align-items: center"><input type="checkbox" bind:checked={sansWeekend} /> Sans les samedis et dimanches</label>
  </div>
  <div class="puces" aria-label="Jours de réserve">
    {#each jours as j (j)}<button class="btn sm" onclick={() => retirer(j)} aria-label="Retirer le {jourMois(j)}">{jourMois(j)} <Icon name="x" size={14} /></button>{/each}
    {#if jours.length === 0}<span class="petit">Aucun jour ajouté.</span>{/if}
  </div>
  <div class="groupe">
    <label for="r-deb">Heure d'arrivée à la base et heure de départ</label>
    <div class="actions">
      <input id="r-deb" class="saisie" style="width: auto" type="time" bind:value={debut} aria-label="Heure d'arrivée à la base" />
      <span class="petit">→</span>
      <input id="r-fin" class="saisie" style="width: auto" type="time" bind:value={arrivee} aria-label="Heure de départ de la base" />
    </div>
    <p class="petit" style="margin: 0">Pour l'emploi du temps seulement : l'heure où tu arrives à la base, puis l'heure où tu pars. Un jour de réserve est payé au tarif du jour : arriver à 11 h reste une journée. Même heure aux deux = toute la journée.</p>
  </div>
  <div class="groupe"><label for="r-hb">Jours hors base</label><input id="r-hb" class="saisie num" bind:value={horsBase} inputmode="numeric" autocomplete="off" /></div>
  <p style="margin: 0">Net estimé : <b class="num">{formatEuros(net)}</b></p>
  {#if erreur}<p class="negatif" role="alert">{erreur}</p>{/if}
  {#snippet pied()}<button class="btn primary" onclick={enregistrer}>{id ? "Enregistrer" : "Ajouter la période"}</button>{/snippet}
</Modal>

<style>
  .puces {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;
  }
</style>
