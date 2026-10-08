<script lang="ts">
  // Une mission d'intérim signée (nouvelle ou à modifier). Le net s'estime en direct, avec les cotisations de l'agence choisie.
  import { Modal } from "@etabli/ui";
  import { ajouterJours, jourDeInstant, parseHeure } from "@etabli/ui/civil";
  import { formatEuros, parseEuros } from "@etabli/ui/money";
  import { detailMission, paiesMission, reglagesDeMission } from "../../src/calculs";
  import { ajouterMission, lireMission, modifierMission } from "../../src/donnees";
  import { jourLong } from "../../src/affichage";
  import type { Session } from "../../src/session.svelte";
  import { ErreurTravail, type Mission } from "../../src/types";

  interface Props {
    s: Session;
    /** Absent : nouvelle mission. */
    id?: string;
    onclose: () => void;
  }

  let { s, id, onclose }: Props = $props();

  // svelte-ignore state_referenced_locally
  const existante = id ? s.donnees?.missions.find((m) => m.id === id) : undefined;
  const centimes = (c: number) => (c === 0 ? "" : String(c / 100).replace(".", ","));
  const hhmm = (min: number) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
  const aujourdhui = jourDeInstant(Date.now());

  let poste = $state(existante?.libelle ?? "");
  let entreprise = $state(existante?.entreprise ?? "");
  let agenceId = $state(existante?.agenceId ?? "");
  let taux = $state(existante ? centimes(existante.tauxHoraireCents) : "");
  let panier = $state(existante ? centimes(existante.panierCents) : "");
  let deplacement = $state(existante ? centimes(existante.deplacementCents) : "");
  let trajet = $state(existante?.trajetMin != null ? String(existante.trajetMin) : "");
  let debut = $state(existante?.debut ?? ajouterJours(aujourdhui, 7));
  let fin = $state(existante?.fin ?? ajouterJours(aujourdhui, 60));
  let jours = $state<boolean[]>([1, 2, 3, 4, 5, 6, 7].map((n) => (existante ? existante.joursSemaine.includes(n) : n <= 5)));
  let de = $state(existante ? hhmm(existante.debutMin) : "08:00");
  let a = $state(existante ? hhmm(existante.finMin) : "16:00");
  let pause = $state(String(existante?.pauseMin ?? 30));
  let erreurEnregistrement = $state("");

  const LETTRES = ["L", "M", "M", "J", "V", "S", "D"];

  /** La mission décrite par le formulaire, ou la phrase qui dit quoi corriger. */
  const saisie = $derived.by((): { brut: Omit<Mission, "id"> } | { erreur: string } => {
    const debutMin = parseHeure(de);
    const finMin = parseHeure(a);
    const t = parseEuros(taux);
    if (poste.trim() === "") return { erreur: "Donnez le poste (« Opérateur de production »)." };
    if (debutMin === null || finMin === null) return { erreur: "Les heures s'écrivent 08:00 ou 8h30." };
    if (t === null || t <= 0) return { erreur: "Le taux horaire s'écrit comme 13 ou 13,50." };
    const pan = panier.trim() === "" ? 0 : parseEuros(panier);
    const dep = deplacement.trim() === "" ? 0 : parseEuros(deplacement);
    if (pan === null || dep === null) return { erreur: "Le panier et le déplacement s'écrivent comme 7,10 (par jour travaillé)." };
    const tr = trajet.trim() === "" ? null : Number(trajet);
    if (tr !== null && (!Number.isInteger(tr) || tr < 0 || tr > 240)) return { erreur: "Le trajet est un nombre de minutes (entre 0 et 240), ou reste vide." };
    try {
      const m = lireMission(
        {
          libelle: poste,
          entreprise,
          agenceId: agenceId || null,
          debut,
          fin,
          joursSemaine: jours.flatMap((o, i) => (o ? [i + 1] : [])),
          exclusions: existante?.exclusions ?? [],
          debutMin,
          finMin,
          pauseMin: Number(pause) || 0,
          trajetMin: tr,
          tauxHoraireCents: t,
          panierCents: pan,
          deplacementCents: dep,
          supplementaires: existante?.supplementaires ?? [],
        },
        false,
      );
      return { brut: m as Omit<Mission, "id"> };
    } catch (e) {
      return { erreur: e instanceof ErreurTravail ? e.message : "Mission invalide." };
    }
  });

  const apercu = $derived.by(() => {
    if (!s.donnees || !("brut" in saisie)) return null;
    const m = { id: "m0", ...saisie.brut } as Mission;
    const r = reglagesDeMission(m, s.donnees.agences, s.reglages);
    const rythme = s.donnees.agences.find((x) => x.id === m.agenceId)?.rythme ?? "fin";
    const det = detailMission(m, r);
    return { det, cotisations: det.brutTotalCents - (det.netCents - det.indemnitesCents), paies: paiesMission(m, r, rythme), cotisationsBp: r.cotisationsBp };
  });

  function enregistrer(): void {
    erreurEnregistrement = "";
    if (!("brut" in saisie)) {
      erreurEnregistrement = saisie.erreur;
      return;
    }
    const brut = saisie.brut;
    if (s.appliquer((d) => (id ? modifierMission(d, id, brut) : ajouterMission(d, brut).donnees))) onclose();
    else erreurEnregistrement = s.message;
  }
</script>

<Modal open titre={id ? "Modifier la mission" : "Nouvelle mission"} {onclose} largeur={620}>
  <p class="petit" style="margin: 0">Une mission signée : son statut (prévue, en cours, terminée) suit les dates.</p>
  <div class="deux">
    <div class="groupe"><label for="m-poste">Poste</label><input id="m-poste" class="saisie" bind:value={poste} placeholder="Opérateur de production" autocomplete="off" /></div>
    <div class="groupe"><label for="m-ent">Entreprise</label><input id="m-ent" class="saisie" bind:value={entreprise} placeholder="Logis-Verre" autocomplete="off" /></div>
  </div>
  <div class="deux">
    <div class="groupe">
      <label for="m-ag">Agence</label>
      <select id="m-ag" class="saisie" bind:value={agenceId}>
        <option value="">Aucune</option>
        {#each s.donnees?.agences ?? [] as ag (ag.id)}<option value={ag.id}>{ag.nom}</option>{/each}
      </select>
    </div>
    <div class="groupe"><label for="m-taux">Taux horaire brut (€)</label><input id="m-taux" class="saisie num" bind:value={taux} placeholder="13,20" inputmode="decimal" autocomplete="off" /></div>
  </div>
  <div class="trois">
    <div class="groupe"><label for="m-pan">Panier par jour (€)</label><input id="m-pan" class="saisie num" bind:value={panier} placeholder="0" inputmode="decimal" autocomplete="off" /></div>
    <div class="groupe"><label for="m-dep">Déplacement par jour (€)</label><input id="m-dep" class="saisie num" bind:value={deplacement} placeholder="0" inputmode="decimal" autocomplete="off" /></div>
    <div class="groupe"><label for="m-tr">Trajet (min, facultatif)</label><input id="m-tr" class="saisie num" bind:value={trajet} placeholder="25" inputmode="numeric" autocomplete="off" /></div>
  </div>
  <div class="deux">
    <div class="groupe"><label for="m-deb">Début</label><input id="m-deb" class="saisie" type="date" bind:value={debut} /></div>
    <div class="groupe"><label for="m-fin">Fin</label><input id="m-fin" class="saisie" type="date" bind:value={fin} /></div>
  </div>
  <div class="groupe">
    <span class="petit">Jours travaillés</span>
    <div class="jours" role="group" aria-label="Jours travaillés">
      {#each LETTRES as lettre, i (i)}
        <button class="jour" aria-pressed={jours[i]} aria-label={["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"][i]} onclick={() => (jours[i] = !jours[i])}>{lettre}</button>
      {/each}
    </div>
  </div>
  <div class="trois">
    <div class="groupe"><label for="m-de">De</label><input id="m-de" class="saisie" type="time" bind:value={de} /></div>
    <div class="groupe"><label for="m-a">À</label><input id="m-a" class="saisie" type="time" bind:value={a} /></div>
    <div class="groupe"><label for="m-pause">Pause (min)</label><input id="m-pause" class="saisie num" bind:value={pause} inputmode="numeric" autocomplete="off" /></div>
  </div>

  <p class="etiquette" style="margin: 6px 0 0">Estimation en direct</p>
  <div class="apercu" aria-live="polite">
    {#if apercu}
      <div><span>{apercu.det.semaines.length ? "Brut de base (avec majorations)" : "Aucune journée travaillée"}</span><span class="num">{formatEuros(apercu.det.brutBaseCents)}</span></div>
      <div><span>+ Indemnité de fin de mission</span><span class="num">{formatEuros(apercu.det.ifmCents)}</span></div>
      <div><span>+ Congés payés</span><span class="num">{formatEuros(apercu.det.cpCents)}</span></div>
      <div><span>− Cotisations ({(apercu.cotisationsBp / 100).toFixed(1).replace(".", ",")} %)</span><span class="num negatif">− {formatEuros(apercu.cotisations)}</span></div>
      <div><span>+ Paniers et déplacements</span><span class="num">{formatEuros(apercu.det.indemnitesCents)}</span></div>
      <div class="total"><b>Net estimé</b><b class="num">{formatEuros(apercu.det.netCents)}</b></div>
      {#if apercu.paies.length}
        <div><span>Paie{apercu.paies.length > 1 ? "s" : ""}</span><span class="num">{apercu.paies.slice(0, 3).map((p) => jourLong(p.date)).join(" · ")}{apercu.paies.length > 3 ? " …" : ""}</span></div>
      {/if}
    {:else if "erreur" in saisie}
      <span class="petit">{saisie.erreur}</span>
    {/if}
  </div>
  {#if erreurEnregistrement}<p class="negatif" role="alert">{erreurEnregistrement}</p>{/if}
  {#snippet pied()}
    <button class="btn primary" onclick={enregistrer}>{id ? "Enregistrer" : "Ajouter la mission"}</button>
  {/snippet}
</Modal>

<style>
  .jours {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
  }
  .jour {
    width: 40px;
    padding: 6px 0;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--field);
    color: var(--muted);
    font-weight: 700;
    cursor: pointer;
  }
  .jour[aria-pressed="true"] {
    border-color: var(--accent);
    background: var(--accent);
    color: var(--accent-text);
  }
  .apercu {
    display: grid;
    gap: 4px;
    padding: 12px 14px;
    border: 1px solid var(--border);
    border-radius: 12px;
    background: var(--surface-2);
    font-size: 13px;
  }
  .apercu div {
    display: flex;
    justify-content: space-between;
    gap: 10px;
  }
  .apercu .total {
    margin-top: 4px;
    padding-top: 6px;
    border-top: 1px solid var(--border);
    font-size: 15px;
  }
</style>