<script lang="ts">
  // Le budget disponible cette semaine, la jauge, et l'ajout d'un ticket (le magasin d'abord, facultatif ; le montant tout près du « + »).
  import { Jauge } from "@etabli/ui";
  import { parseEuros, formatEuros } from "@etabli/ui/money";
  import { budgetDisponible, magasinsConnus } from "../../src/calculs";
  import { ajouterTicket } from "../../src/donnees";
  import type { Session } from "../../src/session.svelte";

  let { s }: { s: Session } = $props();

  const b = $derived(s.donnees ? budgetDisponible(s.donnees, s.reglages, s.aujourdhui) : null);
  const magasins = $derived(s.donnees ? magasinsConnus(s.donnees) : []);
  const niveau = $derived(b ? (b.niveau === "alerte" ? "alerte" : b.niveau === "attention" ? "attention" : "normal") : "normal");

  let magasin = $state("");
  let montant = $state("");

  function ajouter(): void {
    const cents = parseEuros(montant);
    if (cents === null || cents <= 0) {
      s.message = "Le montant du ticket s'écrit comme 12,40.";
      return;
    }
    if (s.appliquer((d) => ajouterTicket(d, { jour: s.aujourdhui, montantCents: cents, magasin }).donnees)) {
      montant = "";
      s.message = "";
    }
  }
</script>

<section class="bloc">
  <p class="etiquette">Cette semaine</p>
  {#if b}
    <b class="t">Budget disponible</b>
    <div class="grand num {niveau}">{b.disponibleCents < 0 ? "− " : ""}{formatEuros(Math.abs(b.disponibleCents))}</div>
    <Jauge pourcent={b.pourcent} niveau={niveau} gauche="{formatEuros(b.depenseCents)} dépensés · {b.nbTickets} ticket{b.nbTickets > 1 ? 's' : ''}" droite="{Math.round(b.pourcent)} %" label="Part du budget dépensée" />
    <div class="ajout">
      <input class="saisie magasin" list="magasins" bind:value={magasin} placeholder="Magasin (facultatif)" aria-label="Magasin" autocomplete="off" />
      <datalist id="magasins">{#each magasins as m (m)}<option value={m}></option>{/each}</datalist>
      <input class="saisie num montant" bind:value={montant} placeholder="0,00 €" aria-label="Montant du ticket" inputmode="decimal" autocomplete="off" onkeydown={(e) => e.key === "Enter" && ajouter()} />
      <button class="plus" onclick={ajouter} aria-label="Ajouter le ticket">+</button>
    </div>
  {/if}
</section>

<style>
  .t {
    font-size: 17px;
    font-weight: 800;
    letter-spacing: -0.02em;
  }
  .grand {
    margin-top: 6px;
    font-size: 34px;
    font-weight: 600;
    line-height: 1.1;
  }
  .grand.attention {
    color: var(--warn);
  }
  .grand.alerte {
    color: var(--err);
  }
  .ajout {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
    margin-top: 14px;
  }
  .magasin {
    flex: 1 1 140px;
    width: auto;
  }
  .montant {
    width: 110px;
  }
  .plus {
    width: 40px;
    height: 40px;
    border: 0;
    border-radius: 10px;
    background: var(--accent);
    color: var(--accent-text);
    font-size: 22px;
    font-weight: 700;
    cursor: pointer;
  }
</style>