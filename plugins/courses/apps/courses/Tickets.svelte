<script lang="ts">
  // Les derniers tickets, et « Voir tout » pour tous.
  import { Icon, Modal } from "@etabli/ui";
  import { formatEuros } from "@etabli/ui/money";
  import { jourMois } from "../../src/affichage";
  import { supprimerTicket } from "../../src/donnees";
  import type { Session } from "../../src/session.svelte";
  import type { Ticket } from "../../src/types";

  let { s }: { s: Session } = $props();

  const tous = $derived<Ticket[]>(s.donnees ? [...s.donnees.tickets].sort((a, b) => (a.jour < b.jour ? 1 : a.jour > b.jour ? -1 : Number(b.id.slice(1)) - Number(a.id.slice(1)))) : []);
  let ouvert = $state(false);
  let detail = $state<Ticket | null>(null);
  let aConfirmer = $state<string | null>(null);
  let minuteur: ReturnType<typeof setTimeout> | undefined;

  /** Une suppression se confirme par un second clic (4 secondes pour changer d'avis). */
  function supprimer(t: Ticket): void {
    if (aConfirmer === t.id) {
      clearTimeout(minuteur);
      aConfirmer = null;
      s.appliquer((d) => supprimerTicket(d, t.id));
      return;
    }
    aConfirmer = t.id;
    clearTimeout(minuteur);
    minuteur = setTimeout(() => (aConfirmer = null), 4000);
  }
</script>

{#snippet tableau(liste: Ticket[])}
  <div class="tableau">
    <table>
      <thead><tr><th>Date</th><th>Magasin</th><th class="droite">Montant</th><th></th></tr></thead>
      <tbody>
        {#each liste as t (t.id)}
          <tr>
            <td class="num">{jourMois(t.jour)}</td>
            <td><b>{t.magasin}</b>{#if t.horsBudget} <span class="hors-badge" title="Ne compte pas dans le budget">hors budget</span>{/if}</td>
            <td class="droite num">{formatEuros(t.montantCents)}</td>
            <td class="droite">
              {#if t.articles.length > 0}<button class="btn sm" onclick={() => (detail = t)}>Détail</button>{/if}
              {#if !t.listeId}<button class="btn sm danger" onclick={() => supprimer(t)} aria-label="Supprimer le ticket de {t.magasin} du {jourMois(t.jour)}">{aConfirmer === t.id ? "Confirmer ?" : "Supprimer"}</button>{/if}
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{/snippet}

<section class="bloc">
  <div class="bloc-titre">
    <h3>Tickets</h3>
    <div class="outils">
      {#if tous.length > 4}<button class="btn" onclick={() => (ouvert = true)}>Voir tout</button>{/if}
    </div>
  </div>
  {#if tous.length === 0}
    <div class="vide" style="margin-top: 10px">Aucun ticket pour l'instant. Saisissez le montant de vos courses dans le bloc « Cette semaine ».</div>
  {:else}
    <div style="margin-top: 8px">{@render tableau(tous.slice(0, 4))}</div>
  {/if}
</section>

<Modal open={ouvert} titre="Tous les tickets" onclose={() => (ouvert = false)} largeur={720}>
  {@render tableau(tous)}
</Modal>



<Modal open={detail !== null} titre={detail ? `${detail.magasin} · ${jourMois(detail.jour)}` : "Ticket"} onclose={() => (detail = null)} largeur={560}>
  {#if detail}
    <ul class="lignes">
      {#each detail.articles as l, i (i)}
        <li><span class="nom">{l.nom}</span><span class="num petit">{l.quantite !== 1 ? `× ${l.quantite}` : ""}</span><span class="num prix">{formatEuros(l.prixCents)}</span></li>
      {/each}
    </ul>
    <p class="total"><span>Total payé</span><b class="num">{formatEuros(detail.montantCents)}</b></p>
  {/if}
</Modal>

<style>
  .outils {
    display: flex;
    gap: 8px;
  }
  .lignes {
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .lignes li {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 6px 4px;
    border-bottom: 1px solid var(--border);
  }
  .nom {
    flex: 1;
    min-width: 0;
  }
  .prix {
    min-width: 64px;
    text-align: right;
    font-weight: 700;
  }
  .total {
    display: flex;
    justify-content: space-between;
    margin: 12px 4px 0;
  }
  .hors-badge {
    display: inline-block;
    margin-left: 6px;
    padding: 1px 7px;
    border-radius: 999px;
    background: var(--field);
    color: var(--muted);
    font-size: 11px;
    font-weight: 600;
  }
</style>
