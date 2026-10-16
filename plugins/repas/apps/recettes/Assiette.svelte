<script lang="ts">
  // Ce que je mange, servi dans une assiette : un camembert des calories par portion (protéines, glucides, lipides) posé sur une assiette.
  import type { Moyenne } from "../../src/nutrition";

  let { m }: { m: Moyenne } = $props();

  const PARTS = $derived([
    { nom: "Protéines", g: m.proteines, kcal: m.proteines * 4, couleur: "#e06a5f" },
    { nom: "Glucides", g: m.glucides, kcal: m.glucides * 4, couleur: "#e3a33b" },
    { nom: "Lipides", g: m.lipides, kcal: m.lipides * 9, couleur: "#5b8def" },
  ]);
  const total = $derived(PARTS.reduce((s, p) => s + p.kcal, 0) || 1);
  // Les parts du camembert, en partant de midi dans le sens des aiguilles d'une montre.
  const tranches = $derived.by(() => {
    let a = -Math.PI / 2;
    return PARTS.map((p) => {
      const angle = (p.kcal / total) * Math.PI * 2;
      const de = a;
      a += angle;
      const x = (t: number) => (110 + 64 * Math.cos(t)).toFixed(2);
      const y = (t: number) => (110 + 64 * Math.sin(t)).toFixed(2);
      const d = angle >= Math.PI * 2 - 1e-6 ? "M 110 46 A 64 64 0 1 1 109.99 46 Z" : `M 110 110 L ${x(de)} ${y(de)} A 64 64 0 ${angle > Math.PI ? 1 : 0} 1 ${x(a)} ${y(a)} Z`;
      return { ...p, d, pct: Math.round((p.kcal * 100) / total) };
    });
  });
</script>

<div class="assiette">
  <svg viewBox="0 0 220 220" role="img" aria-label="Répartition moyenne des calories par portion">
    <circle cx="110" cy="114" r="102" class="ombre" />
    <circle cx="110" cy="110" r="102" class="bord" />
    <circle cx="110" cy="110" r="80" class="creux" />
    {#each tranches as t (t.nom)}{#if t.kcal > 0}<path d={t.d} fill={t.couleur} />{/if}{/each}
    <circle cx="110" cy="110" r="26" class="centre" />
    <text x="110" y="108" text-anchor="middle" class="kcal">{m.kcal}</text>
    <text x="110" y="121" text-anchor="middle" class="unite">kcal</text>
  </svg>
  <ul>
    {#each tranches as t (t.nom)}
      <li><i style:background={t.couleur}></i><span>{t.nom}</span><b class="num">{t.g} g</b><span class="petit num">{t.pct} %</span></li>
    {/each}
  </ul>
</div>

<style>
  .assiette {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 16px;
  }
  svg {
    width: 200px;
    max-width: 100%;
  }
  .ombre {
    fill: var(--border);
    opacity: 0.6;
  }
  .bord {
    fill: var(--surface);
    stroke: var(--border);
    stroke-width: 2;
  }
  .creux {
    fill: var(--field);
    stroke: var(--border);
    stroke-width: 1;
  }
  .centre {
    fill: var(--surface);
  }
  .kcal {
    font-size: 15px;
    font-weight: 700;
    fill: var(--text);
  }
  .unite {
    font-size: 9px;
    fill: var(--muted);
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 8px;
  }
  li {
    display: grid;
    grid-template-columns: 12px 80px 54px auto;
    align-items: center;
    gap: 8px;
  }
  i {
    width: 12px;
    height: 12px;
    border-radius: 50%;
  }
</style>
