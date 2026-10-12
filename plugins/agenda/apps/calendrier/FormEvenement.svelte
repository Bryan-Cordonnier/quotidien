<script lang="ts">
  // Un événement quelconque (un café, un rendez-vous) : nom, adresse, jour, heures, trajet et répétition. Les contrats (intérim, réserve, CDD,
  // CDI) se saisissent dans Travail : ici, rien de tel. Un événement saisi ici se modifie et se supprime ; ceux des autres plugins, chez eux.
  import { Modal } from "@etabli/ui";
  import { ajouterMois, parseHeure, type Jour } from "@etabli/ui/civil";
  import { lireBrouillon } from "../../src/carnet";
  import { ajouter, modifier, supprimer, type Contexte } from "../../src/operations";
  import type { Session } from "../../src/session.svelte";
  import { ErreurAgenda, UTILISATEUR, type Frequence } from "../../src/types";
  import { heure } from "../../src/vue";

  interface Props {
    s: Session;
    /** Absent : nouvel événement. */
    id?: string;
    /** Le jour affiché : celui d'un nouvel événement. */
    jour: Jour;
    onclose: () => void;
    onenregistre: (jour: Jour) => void;
  }

  let { s, id, jour, onclose, onenregistre }: Props = $props();

  const ctx: Contexte = { appelant: UTILISATEUR, proprietaire: true };
  // svelte-ignore state_referenced_locally
  const existant = id ? s.carnet?.evenements.find((e) => e.id === id) : undefined;

  let titre = $state(existant?.titre ?? "");
  let lieu = $state(existant?.lieu ?? "");
  // svelte-ignore state_referenced_locally
  let jourSaisi = $state<Jour>(existant?.jour ?? jour);
  let de = $state(existant ? heure(existant.debutMin) : "15:00");
  let a = $state(existant ? heure(existant.finMin) : "16:00");
  let trajet = $state(existant?.trajetMin != null ? String(existant.trajetMin) : "");
  let repetition = $state<Frequence | "aucune">(existant?.repetition?.frequence ?? "aucune");
  // svelte-ignore state_referenced_locally
  let jusquau = $state<Jour>(existant?.repetition?.jusquau ?? ajouterMois(existant?.jour ?? jour, 1));
  let erreur = $state("");
  let infoTrajet = $state("");
  let calcul = $state(false);

  /** Temps de trajet d'après l'adresse, avec la circulation prévue pour arriver à l'heure (clé TomTom dans Paramètres → Trajets). */
  async function calculerTrajet(): Promise<void> {
    infoTrajet = "";
    const debut = parseHeure(de);
    if (!s.hote || lieu.trim() === "" || debut === null) return;
    calcul = true;
    const [an, mo, jo] = jourSaisi.split("-").map(Number);
    const arrivee = new Date(an!, mo! - 1, jo!, Math.floor(debut / 60), debut % 60).getTime();
    const r = await s.hote.trajets.calculer({ vers: lieu.trim(), arriveeAvant: arrivee });
    calcul = false;
    if (r.ok) {
      trajet = String(r.minutes);
      infoTrajet = `${r.minutes} min avec la circulation prévue, ${r.distanceKm.toLocaleString("fr-FR")} km.`;
    } else infoTrajet = r.message;
  }

  function enregistrer(): void {
    erreur = "";
    const debut = parseHeure(de);
    const fin = parseHeure(a);
    if (debut === null || fin === null) {
      erreur = "Les heures s'écrivent 08:00 ou 8h30.";
      return;
    }
    let brouillon;
    try {
      brouillon = lireBrouillon({
        type: existant?.type ?? "autre",
        titre,
        lieu: lieu.trim() === "" ? undefined : lieu,
        jour: jourSaisi,
        debutMin: debut,
        finMin: fin,
        trajetMin: trajet.trim() === "" ? undefined : Number(trajet),
        repetition: repetition === "aucune" ? undefined : { frequence: repetition, jusquau },
        ...(existant?.contrat ? { contrat: existant.contrat } : {}),
        ...(existant?.tempsContratMin != null ? { tempsContratMin: existant.tempsContratMin } : {}),
      });
    } catch (e) {
      erreur = e instanceof ErreurAgenda ? e.message : "Événement invalide.";
      return;
    }
    if (s.appliquer((c) => (id ? modifier(c, id, brouillon, ctx).carnet : ajouter(c, brouillon, ctx).carnet))) {
      onenregistre(brouillon.jour);
      onclose();
    } else erreur = s.message;
  }

  function retirer(): void {
    if (id && s.appliquer((c) => supprimer(c, id, ctx).carnet)) onclose();
  }
</script>

<Modal open titre={id ? "Modifier l'événement" : "Nouvel événement"} {onclose} largeur={540}>
  <p class="petit" style="margin: 0">Un événement quelconque : un café, un rendez-vous. Les contrats se saisissent dans Travail.</p>
  <div class="groupe"><label for="e-titre">Nom</label><input id="e-titre" class="saisie" bind:value={titre} placeholder="Café avec un ami" autocomplete="off" /></div>
  <div class="groupe"><label for="e-lieu">Adresse (facultatif)</label><input id="e-lieu" class="saisie" bind:value={lieu} placeholder="12 place du Marché" autocomplete="off" /></div>
  <div class="trois">
    <div class="groupe"><label for="e-jour">Jour</label><input id="e-jour" class="saisie" type="date" bind:value={jourSaisi} /></div>
    <div class="groupe"><label for="e-de">De</label><input id="e-de" class="saisie" type="time" bind:value={de} /></div>
    <div class="groupe"><label for="e-a">À</label><input id="e-a" class="saisie" type="time" bind:value={a} /></div>
  </div>
  <div class="trois">
    <div class="groupe"><label for="e-tr">Trajet aller (min)</label><input id="e-tr" class="saisie num" bind:value={trajet} inputmode="numeric" placeholder="vide : pas de trajet" autocomplete="off" /></div>
    <div class="groupe">
      <label for="e-rep">Répéter</label>
      <select id="e-rep" class="saisie" bind:value={repetition}>
        <option value="aucune">Jamais</option>
        <option value="jour">Chaque jour</option>
        <option value="semaine">Chaque semaine</option>
        <option value="mois">Chaque mois</option>
      </select>
    </div>
    <div class="groupe"><label for="e-ju">Jusqu'au</label><input id="e-ju" class="saisie" type="date" bind:value={jusquau} disabled={repetition === "aucune"} /></div>
  </div>
  {#if lieu.trim() !== ""}
    <div class="trajet-actions">
      <button class="btn" onclick={calculerTrajet} disabled={calcul}>{calcul ? "Calcul…" : "Calculer le trajet"}</button>
      <button class="btn" onclick={() => s.hote?.trajets.ouvrirWaze(lieu.trim())}>Ouvrir dans Waze</button>
    </div>
  {/if}
  <p class="petit" style="margin: 0">{infoTrajet || "Le trajet retour est le même. Avec une adresse, « Calculer le trajet » le trouve d'après la circulation prévue."}</p>
  {#if erreur}<p class="negatif" role="alert">{erreur}</p>{/if}
  {#snippet pied()}
    <button class="btn primary" onclick={enregistrer}>{id ? "Enregistrer" : "Ajouter l'événement"}</button>
    {#if id}<button class="btn danger" onclick={retirer}>Supprimer</button>{/if}
  {/snippet}
</Modal>
<style>
  .trajet-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
</style>
