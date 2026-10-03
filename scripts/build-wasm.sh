#!/usr/bin/env bash
# Compile le cœur Rust en WebAssembly et génère les liaisons pour l'interface.
set -euo pipefail
cd "$(dirname "$0")/.."
cargo build -p budget-wasm --release --target wasm32-unknown-unknown
wasm-bindgen --target web --out-dir web/src/lib/wasm target/wasm32-unknown-unknown/release/budget_wasm.wasm
