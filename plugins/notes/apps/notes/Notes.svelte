<script lang="ts">
  // Notes : un pense-bête rapide. On tape ce qui passe par la tête ; « Max me le rappelle » laisse Max choisir le bon moment
  // (agenda, disponibilité), sinon une heure précise, sinon rien. Les notes écrites par Max ou Claude apparaissent ici aussi.
  import { Entete, PluginSettings, Segmented } from "@etabli/ui";
  import { ajouter, basculer, CARNET_VIDE, nettoyer, ordonner, retirer, type Rappel } from "../../src/notes";

  const carnet = new PluginSettings(CARNET_VIDE, nettoyer);
  let texte = $state("");
  let mode = $state<"aucun" | "max" | "heure">("max");
  let quand = $state("");

  const notes = $derived(ordonner(carnet.data));
  const aFaire = $derived(notes.filter((n) => !n.fait).length);

  function noter(): void {
    const rappel: Rappel = mode === "heure" && quand ? { mode: "heure", quand: new Date(quand).getTime() } : mode === "max" ? { mode: "max", avant: null } : { mode: "aucun" };
    const suivant = ajouter(carnet.data, texte, rappel, Date.now());
    if (suivant !== carnet.data) {
      carnet.data = suivant;
      texte = "";
      quand = "";
    }
  }
  const qui = { bryan: "", max: "par Max", claude: "par Claude" };
  const rappelTexte = (r: Rappel, rappele: number | null): string =>
    rappele ? "rappel envoyé" : r.mode === "max" ? "Max te le rappelle" : r.mode === "heure" ? `rappel le ${new Date(r.quand).toLocaleString("fr-FR", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}` : "";
</script>

<div class="page-plugin">
  <Entete titre="Notes" />

  <section class="bloc saisie-note">
    <textarea class="saisie" rows="3" bind:value={texte} placeholder="Un truc à pas oublier…" aria-label="Nouvelle note"
      onkeydown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), noter())}></textarea>
    <Segmented label="Rappel" options={[{ value: "max", label: "Max choisit" }, { value: "heure", label: "À une heure" }, { value: "aucun", label: "Aucun" }]} bind:value={mode} />
    <div class="actions">
      {#if mode === "heure"}<input class="saisie" type="datetime-local" bind:value={quand} aria-label="Heure du rappel" />{/if}
      <button class="btn primary" onclick={noter}>Noter</button>
    </div>
  </section>

  <section class="bloc">
    <p class="bloc-titre">{aFaire} à faire</p>
    {#if notes.length === 0}<p class="petit">Rien de noté pour l'instant.</p>{/if}
    <ul class="liste">
      {#each notes as n (n.id)}
        <li class:fait={n.fait}>
          <input type="checkbox" checked={n.fait} onchange={() => (carnet.data = basculer(carnet.data, n.id))} aria-label="Fait : {n.texte}" />
          <span class="texte">{n.texte}<small class="petit">{[qui[n.par], rappelTexte(n.rappel, n.rappele)].filter(Boolean).join(" · ")}</small></span>
          <button class="btn sm" onclick={() => (carnet.data = retirer(carnet.data, n.id))} aria-label="Supprimer {n.texte}">✕</button>
        </li>
      {/each}
    </ul>
  </section>
</div>

<style>
  .saisie-note {
    display: grid;
    gap: 10px;
  }
  .saisie-note textarea {
    width: 100%;
    box-sizing: border-box;
    min-height: 4.5em;
    resize: vertical;
    font-size: 16px;
    line-height: 1.4;
    field-sizing: content;
  }
  .liste {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 6px;
  }
  .liste li {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 10px;
    border-radius: var(--r-md);
    background: var(--field);
  }
  .liste li.fait .texte {
    opacity: 0.5;
    text-decoration: line-through;
  }
  .texte {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  input[type="checkbox"] {
    width: 20px;
    height: 20px;
  }
</style>
