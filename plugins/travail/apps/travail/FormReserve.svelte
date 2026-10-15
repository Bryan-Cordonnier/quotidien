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
  let du = $state(existante?.debut ?? aujourdhui);
  let au = $state(existante?.fin ?? aujourdhui);
  // svelte-ignore state_referenced_locally
  let arrivee = $state(hhmm(existante?.arriveeMin ?? s.reglages.reserveDebutMin));
  // svelte-ignore state_referenced_locally
  let depart = $state(hhmm(existante?.departMin ?? s.reglages.reserveFinMin));
  let horsBase = $state<string[]>(existante ? [...existante.joursHorsBase] : []);
  let erreur = $state("");

  const jours = $derived(du && au && du <= au ? plage(du, au, 366) : []);
  const periode = $derived({ id: "r0", libelle, debut: du, fin: au, arriveeMin: minutes(arrivee), departMin: minutes(depart), joursHorsBase: horsBase.filter((j) => jours.includes(j)) });
  const detail = $derived(jours.length > 0 ? detailReserve(periode, s.reglages) : null);
  const basculer = (j: string) => (horsBase = horsBase.includes(j) ? horsBase.filter((x) => x !== j) : [...horsBase, j]);

  function enregistrer(): void {
    erreur = "";
    const brut = { libelle, debut: du, fin: au, arriveeMin: periode.arriveeMin, departMin: periode.departMin, joursHorsBase: periode.joursHorsBase };
    const ok = id ? s.appliquer((d) => modifierReserve(d, id, brut)) : s.appliquer((d) => ajouterReserve(d, brut).donnees);
    if (ok) onclose();
    else erreur = s.message;
  }
</script>

<Modal open titre={id ? "Modifier la mission de réserviste" : "Mission de réserviste"} {onclose} largeur={540}>
  {#if s.reglages.tarifHorsBaseCents === 0}
    <p class="petit" style="margin: 0">Le solde d'un jour hors base n'est pas réglé (Paramètres → Travail) : les jours hors base ne rapportent rien tant qu'il est à 0.</p>
  {/if}
  <div class="groupe"><label for="r-lib">Nom de la mission</label><input id="r-lib" class="saisie" bind:value={libelle} autocomplete="off" /></div>
  <div class="groupe">
    <label for="r-du">Premier et dernier jour</label>
    <div class="actions">
      <span class="petit">du</span><input id="r-du" class="saisie" style="width: auto" type="date" bind:value={du} />
      <span class="petit">au</span><input id="r-au" class="saisie" style="width: auto" type="date" bind:value={au} aria-label="Dernier jour" />
    </div>
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
      {#if jours.length === 0}<span class="petit">Choisis un premier et un dernier jour.</span>{/if}
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
  .puces {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;
  }
</style>
