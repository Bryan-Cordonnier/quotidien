// Compile le cœur Rust en WebAssembly et génère les liaisons pour l'interface (Windows, macOS, Linux).
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const racine = join(dirname(fileURLToPath(import.meta.url)), '..');
const cible = 'wasm32-unknown-unknown';

function lancer(cmd, args) {
  const r = spawnSync(cmd, args, { cwd: racine, stdio: 'inherit', shell: process.platform === 'win32' });
  if (r.status !== 0) {
    console.error(`\nÉchec : ${cmd} ${args.join(' ')}`);
    process.exit(r.status ?? 1);
  }
}

lancer('rustup', ['target', 'add', cible]);
lancer('cargo', ['build', '-p', 'budget-wasm', '--release', '--target', cible]);
lancer('wasm-bindgen', ['--target', 'web', '--out-dir', 'web/src/lib/wasm', `target/${cible}/release/budget_wasm.wasm`]);
