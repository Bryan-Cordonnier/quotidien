import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { initialiserDepuisOctets } from '../src/lib/wasm';

export function chargerCoeur() {
  const chemin = fileURLToPath(new URL('../src/lib/wasm/budget_wasm_bg.wasm', import.meta.url));
  initialiserDepuisOctets(readFileSync(chemin));
}
