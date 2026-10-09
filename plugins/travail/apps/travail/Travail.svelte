<script lang="ts">
  // Travail : vos contrats et vos paies. Deux blocs en haut (la mission en cours, la prochaine), puis un onglet par type de contrat.
  // Tous les montants sont des ESTIMATIONS : les taux se règlent dans Paramètres → Travail et se confirment sur un vrai bulletin.
  // Le calcul est dans src/ ; l'écran est mince. Sans Budget, Finances ni Agenda, tout fonctionne : ce qui n'a pas pu partir est « en attente ».
  import { Entete, Tabs, Icon } from "@etabli/ui";
  import { precisionMoyenne, ONGLETS, type Onglet } from "../../src/vue";
  import { Session } from "../../src/session.svelte";
  import Agences from "./Agences.svelte";
  import EnCours from "./EnCours.svelte";
  import FormAgence from "./FormAgence.svelte";
  import FormBulletin from "./FormBulletin.svelte";
  import FormContrat from "./FormContrat.svelte";
  import FormMission from "./FormMission.svelte";
  import FormReserve from "./FormReserve.svelte";
  import Historique from "./Historique.svelte";
  import ListeContrats from "./ListeContrats.svelte";
  import Prochaine from "./Prochaine.svelte";

  const s = new Session();
  void s.demarrer();

  let onglet = $state<Onglet>("interim");
  /** La fenêtre ouverte, s'il y en a une. */
  type Fenetre =
    | { type: "mission"; id?: string }
    | { type: "reserve" }
    | { type: "contrat" }
    | { type: "agence"; id?: string }
    | { type: "bulletin"; ref: string }
    | { type: "historique" };
  let fenetre = $state<Fenetre | null>(null);
  const fermer = () => (fenetre = null);

  const precision = $derived(s.donnees ? precisionMoyenne(s.donnees, s.reglages) : null);
  const titreBouton = $derived(onglet === "interim" ? "+ Nouvelle mission" : onglet === "reserve" ? "+ Jours de réserve" : `+ Nouveau ${onglet.toUpperCase()}`);
  function nouveau(): void {
    fenetre = onglet === "interim" ? { type: "mission" } : onglet === "reserve" ? { type: "reserve" } : { type: "contrat" };
  }
</script>

<div class="page-plugin">
  <Entete titre="Travail">
    {#snippet actions()}
      <button class="btn" onclick={() => s.ouvrirParametres()}>Paramètres</button>
      <button class="btn primary" onclick={() => (fenetre = { type: "mission" })}><Icon name="plus" size={16} /> Nouvelle mission</button>
    {/snippet}
  </Entete>

  {#if s.illisible}
    <section class="bloc">
      <p class="etiquette">Données illisibles</p>
      <p class="negatif">{s.illisible}</p>
      <p class="petit">Les données n'ont pas été touchées. Rien ne s'enregistre tant qu'elles ne peuvent pas être lues.</p>
    </section>
  {:else if s.donnees}
    <div class="grille-2-1">
      <EnCours {s} />
      <Prochaine {s} />
    </div>

    <Tabs items={ONGLETS.map((o) => ({ id: o.id, label: o.label }))} bind:value={onglet} label="Type de contrat" />

    <ListeContrats {s} {onglet} {precision} onnouveau={nouveau} {titreBouton} onhistorique={() => (fenetre = { type: "historique" })} onbulletin={(ref) => (fenetre = { type: "bulletin", ref })} onmodifier={(id) => (fenetre = { type: "mission", id })} />

    {#if onglet === "interim"}
      <Agences {s} onajouter={() => (fenetre = { type: "agence" })} onmodifier={(id) => (fenetre = { type: "agence", id })} />
    {/if}

    {#if s.rapport && (s.rapport.indisponibles.length || s.rapport.erreurs.length)}
      <p class="petit" role="status">
        Transmis à Budget et à l'Agenda : {s.transmises.a} sur {s.transmises.sur}.
        {#each s.rapport.indisponibles as i (i.service)}<br /><span>{i.message}</span>{/each}
        {#each s.rapport.erreurs as e (e.ref + e.service)}<br /><span class="negatif">{e.ref} : {e.message}</span>{/each}
      </p>
    {/if}
    {#if s.message}<p class="negatif" role="alert">{s.message}</p>{/if}

    {#if fenetre?.type === "mission"}<FormMission {s} id={fenetre.id} onclose={fermer} />{/if}
    {#if fenetre?.type === "reserve"}<FormReserve {s} onclose={fermer} />{/if}
    {#if fenetre?.type === "contrat" && (onglet === "cdd" || onglet === "cdi")}<FormContrat {s} type={onglet} onclose={fermer} />{/if}
    {#if fenetre?.type === "agence"}<FormAgence {s} id={fenetre.id} onclose={fermer} />{/if}
    {#if fenetre?.type === "bulletin"}<FormBulletin {s} ref={fenetre.ref} onclose={fermer} />{/if}
    {#if fenetre?.type === "historique"}
      <Historique {s} {onglet} onclose={fermer} onbulletin={(ref) => (fenetre = { type: "bulletin", ref })} onmodifier={(id) => (fenetre = { type: "mission", id })} />
    {/if}
  {:else}
    <p class="petit">Chargement…</p>
  {/if}
</div>