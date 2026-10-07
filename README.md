# Quotidien

Mon application personnelle : **finances** (l'argent réel), **agenda** (le temps, avec rappels sur téléphone), **budget** (le prévu)
et **paie** (celle d'un particulier). Elle tourne sur Windows et sur Android, construite sur le moteur libre
[Etable](https://github.com/etable-project/etable), qui est inclus ici en sous-module (`etable/`).

Dépôt privé, à usage personnel.

## Organisation

```
etable/            le moteur (sous-module Git, version figée)
plugins/           les quatre plugins : finances, agenda, budget, paie
quotidien.conf.json  nom, identifiant et fenêtres de cette application (fusionné avec la configuration du moteur)
scripts/tauri.mjs  lance la commande Tauri du moteur avec cette configuration et ces plugins
```

Le moteur ne contient aucun plugin : au moment de compiler, `ETABLE_PLUGINS_DIR` (donné par `scripts/tauri.mjs`) lui indique
les plugins de ce dépôt, qu'il range dans le binaire.

## Construire

```bash
git clone --recurse-submodules https://github.com/Bryan-Cordonnier/quotidien.git && cd quotidien
npm install
npm run dev            # développement sur Windows
npm run build          # installateur Windows (MSI)
npm run android:init   # première fois seulement
npm run android:build  # APK Android
```

L'intégration continue (`.github/workflows/build.yml`) construit l'installateur et l'APK à chaque envoi sur `main`.

## Mettre à jour le moteur

```bash
git submodule update --remote etable
git add etable && git commit -m "chore: update Etable"
```

## Historique

Le premier prototype (Rust + Svelte, sans moteur) est conservé sous l'étiquette `legacy/prototype-budget`.