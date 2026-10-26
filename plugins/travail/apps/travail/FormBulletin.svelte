<script lang="ts">
  // Le bulletin reçu : le net réellement versé. Il retire l'attendu de Budget, ajoute le net dans Finances (si un compte est choisi) et
  // alimente la précision moyenne des estimations, que le recalage de Mes finances réutilise.
  import { Modal, SelectField } from "@etabli/ui";
  import { jourDeInstant } from "@etabli/ui/civil";
  import { formatEuros, parseEuros } from "@etabli/ui/money";
  import { jourPrevuPaie, lignes } from "../../src/vue";
  import { lignesBulletin, pdfBulletin } from "../../src/bulletin";
  import { reglagesDeMission } from "../../src/calculs";
  import type { Session } from "../../src/session.svelte";

  let { s, ref, onclose }: { s: Session; ref: string; onclose: () => void } = $props();

  const onglet = $derived(ref.startsWith("reserve:") ? "reserve" : "interim");
  const ligne = $derived(s.donnees ? lignes(s.donnees, s.reglages, onglet, s.aujourdhui).find((l) => l.ref === ref) : undefined);

  // svelte-ignore state_referenced_locally
  let net = $state(ligne?.bulletin ? String(ligne.bulletin.netCents / 100).replace(".", ",") : "");
  // svelte-ignore state_referenced_locally
  let jour = $state(ligne?.bulletin?.jour ?? jourDeInstant(Date.now()));
  let compteId = $state("");
  let erreur = $state("");

  /** Mission d'intérim : le bulletin estimé ligne à ligne, pour le comparer au vrai bulletin. */
  const mission = $derived(ref.startsWith("mission:") && s.donnees ? s.donnees.missions.find((m) => `mission:${m.id}` === ref) : undefined);
  const estime = $derived(mission && s.donnees ? lignesBulletin(mission, reglagesDeMission(mission, s.donnees.agences, s.reglages)) : []);
  function enregistrerPdf(): void {
    if (!ligne || estime.length === 0) return;
    const pdf = pdfBulletin("Bulletin estimé", ligne.titre, estime, "Estimation calculée par Quotidien d'après les taux de Paramètres → Travail : à comparer au vrai bulletin.");
    const nom = `bulletin-estime-${ligne.titre.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "mission"}.pdf`;
    s.enregistrerFichier(nom, pdf, "pdf", "Bulletin estimé (PDF)");
  }
  const recu = $derived(parseEuros(net));
  const ecart = $derived(ligne && ligne.netCents && recu !== null && recu > 0 ? recu - ligne.netCents : null);

  async function enregistrer(): Promise<void> {
    erreur = "";
    if (!ligne || !s.donnees) return;
    if (recu === null || recu <= 0) {
      erreur = "Le net s'écrit comme 429,43 (supérieur à zéro).";
      return;
    }
    await s.netRecu({ ref, netCents: recu, jour, compteId: compteId || null, libelle: `${ligne.titre} (net reçu)`, jourPrevu: jourPrevuPaie(s.donnees, s.reglages, ref) });
    if (s.message === "" || !s.message.includes("illisible")) onclose();
  }
</script>

<Modal open titre="Bulletin de paie" {onclose} largeur={560}>
  {#if ligne}
    <b>{ligne.titre}</b>
    {#if estime.length > 0}
      <table class="detail">
        <tbody>
          {#each estime as l, i (i)}
            <tr class:total={l.total}><td>{l.libelle}{#if l.detail}<span class="petit"> · {l.detail}</span>{/if}</td><td class="num droite">{l.montantCents === null ? "" : `${l.montantCents < 0 ? "− " : ""}${formatEuros(Math.abs(l.montantCents))}`}</td></tr>
          {/each}
        </tbody>
      </table>
      <button class="btn" onclick={enregistrerPdf}>Enregistrer le bulletin estimé en PDF</button>
    {:else}
      <div class="estime"><span>Net estimé</span><span class="num">{ligne.netCents === null ? "—" : formatEuros(ligne.netCents)}</span></div>
    {/if}
    <div class="groupe"><label for="b-net">Net reçu sur le bulletin (€)</label><input id="b-net" class="saisie num" bind:value={net} inputmode="decimal" autocomplete="off" /></div>
    <div class="deux">
      <div class="groupe"><label for="b-jour">Jour où il est arrivé</label><input id="b-jour" class="saisie" type="date" bind:value={jour} /></div>
      <div class="groupe">
        <label for="b-compte">Compte (Finances)</label>
        <SelectField compact label="Compte" bind:value={compteId} options={[{ value: "", label: "Ne pas l'ajouter dans Finances" }, ...s.comptes.map((c) => ({ value: c.id, label: c.nom }))]} />
      </div>
    </div>
    {#if ecart !== null && ligne.netCents}
      <p class="petit" style="margin: 0" aria-live="polite">
        Écart : <b class="num {ecart < 0 ? 'negatif' : 'positif'}">{ecart < 0 ? "−" : "+"} {formatEuros(Math.abs(ecart))}</b> ({((Math.abs(ecart) / ligne.netCents) * 100).toFixed(1).replace(".", ",")} %)
      </p>
    {/if}
    <p class="petit" style="margin: 0">L'écart entre l'estimé et le reçu entre dans la précision moyenne, que le recalage de Mes finances réutilise.</p>
    {#if erreur}<p class="negatif" role="alert">{erreur}</p>{/if}
  {:else}
    <p>Cette mission est introuvable.</p>
  {/if}
  {#snippet pied()}{#if ligne}<button class="btn primary" onclick={enregistrer}>Enregistrer</button>{/if}{/snippet}
</Modal>

<style>
  .detail {
    width: 100%;
    border-collapse: collapse;
    font-size: 13.5px;
  }
  .detail td {
    padding: 5px 4px;
    border-bottom: 1px solid var(--border);
  }
  .detail .droite {
    text-align: right;
    white-space: nowrap;
  }
  .detail tr.total td {
    font-weight: 800;
  }
  .estime {
    display: flex;
    justify-content: space-between;
    padding: 8px 12px;
    border: 1px solid var(--border);
    border-radius: 10px;
    background: var(--surface-2);
  }
</style>