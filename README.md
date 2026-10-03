# Budget & Planning

Application personnelle de gestion du budget et du temps : missions d'intérim, jours de réserve,
calcul du net, chronologie de départ/coucher, rappels. Voir [CAHIER_DES_CHARGES.md](CAHIER_DES_CHARGES.md).

## Structure

- `crates/core` — cœur métier Rust (paie, horaires, repos légal). Montants en centimes, durées en minutes.
- `crates/wasm` — pont WebAssembly (JSON in/out) vers l'interface.
- `web/` — interface Svelte 5 + Vite + TypeScript.
- `scripts/build-wasm.mjs` — compile le cœur en WASM pour l'interface.

## Commandes

```bash
cargo test --workspace                                       # tests du cœur
cargo install wasm-bindgen-cli --version 0.2.129 --locked    # une seule fois
cd web
npm ci
npm run wasm      # génère web/src/lib/wasm
npm run dev       # http://localhost:5173
npm run check     # svelte-check
npm test          # Vitest
npm run e2e       # tests navigateur (après `npx vite build`)
```

## État (étape 1)

Fait : calcul du net (intérim, réserve), chronologie et rappels, agenda, missions, réserve,
rendez-vous, réglages, export `.ics` avec alarmes, données locales (localStorage).

À faire pour clore l'étape 1 : coque Android (Capacitor) avec alarmes locales exactes,
stockage SQLite/IndexedDB, calcul d'itinéraire (OSRM). Voir §13 du cahier des charges.
