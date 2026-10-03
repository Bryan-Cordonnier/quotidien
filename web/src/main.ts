import './app.css';
import { mount } from 'svelte';
import App from './App.svelte';
import { initialiser } from './lib/wasm';

const cible = document.getElementById('app')!;
initialiser()
  .then(() => mount(App, { target: cible }))
  .catch((e) => {
    cible.textContent = `Impossible de charger le moteur de calcul : ${e}`;
  });
