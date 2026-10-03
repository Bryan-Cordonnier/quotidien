// Point d'entrée de la version « page unique » : le moteur WASM est embarqué en data URI
// et instancié depuis ses octets (aucun fetch).
import './app.css';
import { mount } from 'svelte';
import App from './App.svelte';
import { initialiserDepuisOctets } from './lib/wasm';
import wasmDataUri from './lib/wasm/budget_wasm_bg.wasm?url';

const base64 = wasmDataUri.slice(wasmDataUri.indexOf(',') + 1);
const octets = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
initialiserDepuisOctets(octets);
mount(App, { target: document.getElementById('app')! });
