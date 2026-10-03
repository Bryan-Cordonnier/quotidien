<script lang="ts">
  import { depuisMinutes, enMinutes } from '../lib/dates';
  interface Props { valeur: number; label: string; onchange?: () => void }
  let { valeur = $bindable(), label, onchange }: Props = $props();
</script>

<label class="champ">
  {label}
  <input
    type="time"
    value={depuisMinutes(valeur)}
    onchange={(e) => {
      if (e.currentTarget.value) valeur = enMinutes(e.currentTarget.value);
      onchange?.();
    }}
  />
</label>
