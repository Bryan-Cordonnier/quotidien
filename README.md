# Quotidien

Mon application personnelle : **finances** (l'argent réel), **agenda** (le temps, avec rappels sur téléphone), **budget** (le prévu)
et **paie** (celle d'un particulier). Elle tourne sur Windows et sur Android, construite sur le moteur libre
[Etable](https://github.com/etable-project/etable), qui est inclus ici en sous-module (`etable/`).

Dépôt public pour que l'application installée puisse télécharger ses mises à jour ; usage personnel (aucune donnée n'est dans le dépôt).

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

## Publier une version

Chaque version a sa section dans [CHANGELOG.md](CHANGELOG.md) : elle devient la Release GitHub et le message de mise à jour.

1. Dans CHANGELOG.md, renommer « Non publié » en `## [X.Y.Z] — AAAA-MM-JJ` et rouvrir une section « Non publié » vide au-dessus.
2. Changer ersion dans quotidien.conf.json.
3. `git commit`, puis `git tag -a vX.Y.Z -m \"Quotidien X.Y.Z\"` et `git push origin main vX.Y.Z`.
4. Suivre l'onglet Actions (« Publication ») : l'installateur MSI, son fichier `.sig` et `latest.json` arrivent dans la Release. Un Quotidien installé propose la mise à jour au démarrage ; rien ne s'installe sans clic.

La version doit **augmenter**. La clé de signature des mises à jour est dans `H:\outils\cles\quotidien-mises-a-jour.key` (mot de passe à côté) et dans les secrets du dépôt : **à sauvegarder**, sans elle plus aucune mise à jour n'est possible. Pas de signature Windows (Authenticode) : Windows peut afficher un avertissement à la première installation.
