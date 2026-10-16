<script lang="ts">
  // L'IMC en cadran de voiture : le chiffre en grand (de la couleur de sa zone), un demi-cercle de 15 à 40 coloré par zone avec ses
  // paliers, et une aiguille. Dessous, le sens depuis 30 jours : on se rapproche de la zone normale (mieux) ou on s'en éloigne.
  let { valeur, avant = null }: { valeur: number | null; avant?: number | null } = $props();

  const MIN = 15;
  const MAX = 40;
  const ZONES = [
    { de: 15, a: 18.5, couleur: "#5b8def", nom: "maigreur" },
    { de: 18.5, a: 25, couleur: "#3fae6a", nom: "normal" },
    { de: 25, a: 30, couleur: "#e3a33b", nom: "surpoids" },
    { de: 30, a: 40, couleur: "#e06a5f", nom: "obésité" },
  ];
  const PALIERS = [15, 18.5, 25, 30, 40];
  // Centre du cadran (110, 110), rayon 84 : les paliers s'écrivent à l'extérieur, dans les marges du dessin.
  const angle = (v: number) => Math.PI * (1 - (Math.min(MAX, Math.max(MIN, v)) - MIN) / (MAX - MIN));
  const x = (v: number, r: number) => 110 + r * Math.cos(angle(v));
  const y = (v: number, r: number) => 110 - r * Math.sin(angle(v));
  const arc = (de: number, a: number) => `M ${x(de, 84).toFixed(2)} ${y(de, 84).toFixed(2)} A 84 84 0 0 1 ${x(a, 84).toFixed(2)} ${y(a, 84).toFixed(2)}`;

  const zone = $derived(valeur === null ? null : (ZONES.find((z) => valeur < z.a) ?? ZONES[3]!));
  // Distance à la zone normale : 0 dedans. Elle baisse : c'est mieux.
  const ecart = (v: number) => (v < 18.5 ? 18.5 - v : v > 25 ? v - 25 : 0);
  const sens = $derived.by(() => {
    if (valeur === null || avant === null) return null;
    const d = Math.round((valeur - avant) * 10) / 10;
    if (d === 0) return { texte: "→ stable sur 30 jours", ton: "" };
    const ton = ecart(valeur) === ecart(avant) ? "" : ecart(valeur) < ecart(avant) ? "positif" : "negatif";
    return { texte: `${d > 0 ? "↑ +" : "↓ "}${d.toLocaleString("fr-FR")} en 30 jours${ton === "positif" ? " · mieux" : ton === "negatif" ? " · attention" : ""}`, ton };
  });
</script>

<div class="cadran">
  <b class="num chiffre" style:color={zone?.couleur ?? "var(--muted)"}>{valeur?.toLocaleString("fr-FR") ?? "—"}</b>
  <span class="zone" style:color={zone?.couleur}>{zone?.nom ?? "taille et pesée requises"}</span>
  <svg viewBox="0 0 220 124" role="img" aria-label={valeur === null ? "IMC inconnu" : `IMC ${valeur}, ${zone?.nom}`}>
    {#each ZONES as z (z.nom)}<path d={arc(z.de, z.a)} stroke={z.couleur} stroke-width="16" fill="none" />{/each}
    {#each PALIERS as p (p)}
      <text x={x(p, 104)} y={y(p, 104) + 4} text-anchor={p < 20 ? "start" : p > 35 ? "end" : "middle"} class="palier">{String(p).replace(".", ",")}</text>
    {/each}
    {#if valeur !== null}
      <line x1="110" y1="110" x2={x(valeur, 72)} y2={y(valeur, 72)} class="aiguille" style:stroke={zone?.couleur} />
    {/if}
    <circle cx="110" cy="110" r="7" class="axe" />
  </svg>
  {#if sens}<span class="petit {sens.ton}">{sens.texte}</span>{/if}
</div>

<style>
  .cadran {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
  }
  .chiffre {
    font-size: 40px;
    line-height: 1;
    font-weight: 800;
  }
  .zone {
    font-weight: 600;
    text-transform: capitalize;
  }
  svg {
    width: 100%;
    max-width: 260px;
    overflow: visible;
  }
  .palier {
    font-size: 11px;
    fill: var(--muted);
  }
  .aiguille {
    stroke-width: 4;
    stroke-linecap: round;
  }
  .axe {
    fill: var(--text);
  }
</style>
