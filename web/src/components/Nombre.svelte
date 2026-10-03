<script lang="ts">
  interface Props { valeur: number; label: string; unite?: string; min?: number; pas?: number }
  let { valeur = $bindable(), label, unite = '', min = 0, pas = 1 }: Props = $props();
</script>

<label class="champ">
  {label}{unite ? ` (${unite})` : ''}
  <input type="number" {min} step={pas} bind:value={valeur} />
</label>
