# Quotidien — point d'entrée pour un agent

Application personnelle de Bryan (finances, agenda, budget, paie), construite sur le moteur **Etable** (sous-module `etable/`).
Dépôt **privé**. Tout est en français pour l'interface ; les commits, le code et la documentation sont en anglais.

- Le moteur (fenêtres, sandbox des plugins, SDK, serveur) vit dans `etable/` : voir `etable/AGENTS.md`. On n'y modifie rien d'ici ;
  un correctif du moteur se fait dans le dépôt Etable, puis on met à jour le sous-module (`git submodule update --remote etable`).
- Les plugins sont ici, dans `plugins/<id>/` : `finances` (argent réel), `agenda` (temps, rappels), `budget` (prévu),
  `paie` (paie d'un particulier). Specs : `etable/docs/24-spec-plugins-budget.md`.
- Un plugin ne touche jamais au disque ni au réseau : tout passe par le SDK (`@etabli/sdk`) et le moteur.

## Commandes

```bash
git clone --recurse-submodules https://github.com/Bryan-Cordonnier/quotidien.git
npm install
npm run dev            # compile les plugins puis lance l'application (Windows)
npm run build          # produit l'installateur Windows
npm run android:init   # génère le projet Android (une fois) et applique les correctifs du moteur
npm run android:build  # produit l'APK (voir .github/workflows/build.yml)
npm run check && npm test
```

Chaque commande PowerShell commence par `. 'H:\outils\env-dev.ps1' | Out-Null;`.