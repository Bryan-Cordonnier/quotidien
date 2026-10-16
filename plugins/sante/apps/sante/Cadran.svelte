<script lang="ts">
  // L'IMC en cadran de voiture : un demi-cercle de 15 à 40, coloré par zone, et une aiguille. Sous le cadran, le sens depuis 30 jours :
  // on se rapproche de la zone normale (mieux) ou on s'en éloigne.
  let { valeur, avant = null }: { valeur: number | null; avant?: number | null } = $props();

  const MIN = 15;
  const MAX = 40;
  const ZONES = [
    { de: 15, a: 18.5, couleur: "#5b8def", nom: "maigreur" },
    { de: 18.5, a: 25, couleur: "#3fae6a", nom: "normal" },
    { de: 25, a: 30, couleur: "#e3a33b", nom: "surpoids" },
    { de: 30, a: 40, couleur: "#e06a5f", nom: "obésité" },
  ];
  // Angle en radians : 15 à gauche (π), 40 à droite (0).
  const angle = (v: number) => Math.PI * (1 - (Math.min(MAX, Math.max(MIN, v)) - MIN) / (MAX - MIN));
  const point = (v: number, r: number) => `${(100 + r * Math.cos(angle(v))).toFixed(2)} ${(100 - r * Math.sin(angle(v))).toFixed(2)}`;
  const arc = (de: number, a: number) => `M ${point(de, 80)} A 80 80 0 0 1 ${point(a, 80)}`;

  const zone = $derived(valeur === null ? null : (ZONES.find((z) => valeur < z.a) ?? ZONES[3]!));
  // Distance à la zone normale : 0 dedans. Elle baisse : c'est mieux.
  const ecart = (v: number) => (v < 18.5 ? 18.5 - v : v > 25 ? v - 25 : 0);
  const sens = $derived.by(() => {
    if (valeur === null || avant === null) return null;
    const d = Math.round((valeur - avant) * 10) / 10;
    if (d === 0) return { fleche: "→", texte: "stable sur 30 jours", ton: "" };
    const mieux = ecart(valeur) < ecart(avant) || (ecart(valeur) === 0 && ecart(avant) === 0);
    return { fleche: d > 0 ? "↑" : "↓", texte: `${d > 0 ? "+" : ""}${d.toLocaleString("fr-FR")} en 30 jours`, ton: ecart(valeur) === ecart(avant) ? "" : mieux ? "positif" : "negatif" };
  });
</script>

<div class="cadran">
  <svg viewBox="0 0 200 115" role="img" aria-label={valeur === null ? "IMC inconnu" : `IMC ${valeur}, ${zone?.nom}`}>
    {#each ZONES as z (z.nom)}<path d={arc(z.de, z.a)} stroke={z.couleur} stroke-width="16" fill="none" />{/each}
    {#each [18.5, 25, 30] as g (g)}<text x={point(g, 100).split(" ")[0]} y={point(g, 100).split(" ")[1]} text-anchor="middle" class="grad">{String(g).replace(".", ",")}</text>{/each}
    {#if valeur !== null}
      <line x1="100" y1="100" x2={point(valeur, 70).split(" ")[0]} y2={point(valeur, 70).split(" ")[1]} class="aiguille" />
    {/if}
    <circle cx="100" cy="100" r="6" class="axe" />
  </svg>
  <div class="lecture">
    <b class="num">{valeur?.toLocaleString("fr-FR") ?? "—"}</b>
    <span style:color={zone?.couleur}>{zone?.nom ?? "taille et pesée requises"}</span>
    {#if sens}<span class="petit {sens.ton}">{sens.fleche} {sens.texte}{sens.ton === "positif" ? " · mieux" : sens.ton === "negatif" ? " · attention" : ""}</span>{/if}
  </div>
</div>

<style>
  .cadran {
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  svg {
    width: 100%;
    max-width: 280px;
  }
  .grad {
    font-size: 9px;
    fill: var(--muted);
  }
  .aiguille {
    stroke: var(--text);
    stroke-width: 4;
    stroke-linecap: round;
    transition: all 0.6s ease;
  }
  .axe {
    fill: var(--text);
  }
  .lecture {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    margin-top: -4px;
  }
  .lecture b {
    font-size: 28px;
  }
</style>
