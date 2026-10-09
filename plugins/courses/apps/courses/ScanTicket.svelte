<script lang="ts">
  // Scanner un ticket : on prend ou choisit une photo, l'IA la lit (magasin, date, total, articles), puis on VÉRIFIE avant d'enregistrer.
  // Rien ne s'enregistre tout seul : l'IA peut se tromper. La photo n'est pas conservée, seul le ticket vérifié l'est.
  import { Icon, Modal } from "@etabli/ui";
  import { formatEuros, parseEuros } from "@etabli/ui/money";
  import { magasinsConnus } from "../../src/calculs";
  import { ajouterTicket } from "../../src/donnees";
  import { preparerPhoto } from "../../src/photo";
  import type { TicketLu } from "../../src/scan";
  import type { Session } from "../../src/session.svelte";
  import type { LigneTicket } from "../../src/types";

  let { s, onclose, horsBudget = false }: { s: Session; onclose: () => void; horsBudget?: boolean } = $props();

  // Hors budget : le ticket sert seulement à garder les articles et leurs prix, sans compter dans les courses de la semaine.
  // svelte-ignore state_referenced_locally
  let hors = $state(horsBudget);

  type Etape = "choisir" | "lecture" | "verifier" | "erreur";
  let etape = $state<Etape>("choisir");
  let message = $state("");
  let lu = $state<TicketLu | null>(null);

  // Ce que l'utilisateur corrige.
  let magasin = $state("");
  let jour = $state("");
  let total = $state("");
  let lignes = $state<LigneTicket[]>([]);
  let erreurSaisie = $state("");

  const magasins = $derived(s.donnees ? magasinsConnus(s.donnees) : []);
  const totalCents = $derived(parseEuros(total));
  const somme = $derived(lignes.reduce((x, l) => x + l.prixCents, 0));
  const ecart = $derived(lignes.length > 0 && totalCents !== null ? totalCents - somme : 0);

  async function choisi(event: Event): Promise<void> {
    const entree = event.currentTarget as HTMLInputElement;
    const fichier = entree.files?.[0];
    entree.value = "";
    if (!fichier) return;
    etape = "lecture";
    try {
      const image = await preparerPhoto(fichier);
      const r = await s.lireTicketPhoto(image);
      if (!r.ok) {
        message = r.message;
        etape = "erreur";
        return;
      }
      lu = r.ticket;
      magasin = r.ticket.magasin;
      jour = r.ticket.jour;
      total = formatEuros(r.ticket.totalCents).replace(/\s?€/, "").replace(/\u202f|\u00a0/g, "");
      lignes = r.ticket.articles.map((a) => ({ ...a }));
      erreurSaisie = "";
      etape = "verifier";
    } catch (e) {
      message = e instanceof Error ? e.message : "La photo n'a pas pu être lue.";
      etape = "erreur";
    }
  }

  function enregistrer(): void {
    erreurSaisie = "";
    if (totalCents === null || totalCents <= 0) {
      erreurSaisie = "Le total s'écrit comme 41,20.";
      return;
    }
    const ok = s.appliquer((d) => ajouterTicket(d, { jour, montantCents: totalCents, magasin, articles: lignes, horsBudget: hors }).donnees);
    if (ok) onclose();
    else erreurSaisie = s.message;
  }

  const retirer = (i: number): void => void (lignes = lignes.filter((_, k) => k !== i));
</script>

<Modal open titre={horsBudget ? "Scanner un ticket hors budget" : "Scanner un ticket"} {onclose} largeur={640}>
  {#if etape === "choisir"}
    <p class="petit" style="margin: 0 0 14px">Prenez le ticket en photo, bien à plat et bien cadré : l'IA lit le magasin, la date, le total et les articles. Vous vérifiez avant d'enregistrer.{horsBudget ? " Ce ticket ne comptera pas dans vos courses : il sert seulement à garder les articles et leurs prix." : ""}</p>
    <div class="actions">
      <label class="btn primary gros">
        <Icon name="plus" size={18} /> Prendre une photo
        <input type="file" accept="image/*" capture="environment" onchange={choisi} hidden />
      </label>
      <label class="btn gros">
        Choisir un fichier
        <input type="file" accept="image/*" onchange={choisi} hidden />
      </label>
    </div>
  {:else if etape === "lecture"}
    <p class="lecture" role="status">Lecture du ticket en cours… quelques secondes.</p>
  {:else if etape === "erreur"}
    <p class="negatif" role="alert">{message}</p>
    <div class="actions" style="margin-top: 12px">
      <button class="btn primary" onclick={() => (etape = "choisir")}>Réessayer avec une autre photo</button>
    </div>
  {:else if lu}
    <p class="petit" style="margin: 0 0 12px">Vérifiez ce que l'IA a lu, corrigez si besoin, puis enregistrez.{lu.dateDevinee ? " La date n'a pas été lue : celle d'aujourd'hui est proposée." : ""}</p>
    <div class="grille-2">
      <div class="groupe">
        <label for="t-magasin">Magasin</label>
        <input id="t-magasin" class="saisie" list="t-magasins" bind:value={magasin} placeholder="Sans magasin" autocomplete="off" />
        <datalist id="t-magasins">{#each magasins as m (m)}<option value={m}></option>{/each}</datalist>
      </div>
      <div class="groupe">
        <label for="t-jour">Date</label>
        <input id="t-jour" class="saisie" type="date" bind:value={jour} />
      </div>
    </div>
    <div class="groupe" style="margin-top: 10px">
      <label for="t-total">Total payé (€)</label>
      <input id="t-total" class="saisie num" bind:value={total} inputmode="decimal" autocomplete="off" />
    </div>
    <label class="hors"><input type="checkbox" bind:checked={hors} /> Hors budget : garder les prix sans compter cette dépense dans les courses</label>
    {#if ecart !== 0}
      <p class="alerte" role="status">Le total ne correspond pas à la somme des lignes ({formatEuros(somme)}), écart de {formatEuros(Math.abs(ecart))} : une ligne manque ou est fausse. Vous pouvez enregistrer quand même.</p>
    {/if}
    {#if lignes.length > 0}
      <p class="etiquette" style="margin: 14px 0 6px">Articles lus ({lignes.length})</p>
      <ul class="lignes">
        {#each lignes as l, i (i)}
          <li>
            <span class="nom">{l.nom}</span>
            <span class="num petit">{l.quantite !== 1 ? `× ${l.quantite}` : ""}</span>
            <span class="num prix">{formatEuros(l.prixCents)}</span>
            <button class="retrait" onclick={() => retirer(i)} aria-label="Retirer {l.nom}"><Icon name="x" size={16} /></button>
          </li>
        {/each}
      </ul>
    {/if}
    {#if erreurSaisie}<p class="negatif" role="alert" style="margin: 10px 0 0">{erreurSaisie}</p>{/if}
  {/if}

  {#snippet pied()}
    {#if etape === "verifier"}
      <button class="btn" onclick={onclose}>Annuler</button>
      <button class="btn primary" onclick={enregistrer}><Icon name="check" size={16} /> Enregistrer le ticket</button>
    {:else}
      <button class="btn" onclick={onclose}>Fermer</button>
    {/if}
  {/snippet}
</Modal>

<style>
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }
  .hors {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 12px 0 0;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
  }
  .gros {
    height: 46px;
    padding: 0 20px;
    font-size: 14px;
    cursor: pointer;
  }
  .lecture {
    margin: 24px 0;
    text-align: center;
    color: var(--muted);
  }
  .alerte {
    margin: 10px 0 0;
    padding: 8px 12px;
    border-radius: 9px;
    background: color-mix(in srgb, var(--warn) 16%, transparent);
    color: var(--warn);
    font-size: 13px;
    font-weight: 600;
  }
  .lignes {
    margin: 0;
    padding: 0;
    list-style: none;
    max-height: 260px;
    overflow: auto;
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
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .prix {
    min-width: 64px;
    text-align: right;
    font-weight: 700;
  }
  .retrait {
    width: 28px;
    height: 28px;
    display: grid;
    place-items: center;
    padding: 0;
    border: 0;
    border-radius: 6px;
    background: none;
    color: var(--faint);
    cursor: pointer;
  }
  .retrait:hover {
    color: var(--err);
    background: var(--surface-2);
  }
</style>