// Ajoute au projet Android généré la présence pour Max (android/Presence.kt) : code, permissions, récepteurs, lien d'activation
// et la bibliothèque de localisation de Google. À lancer après les correctifs du moteur. Échoue si quoi que ce soit manque.
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const racine = join(dirname(fileURLToPath(import.meta.url)), "..");
const app = join(racine, "etable", "apps", "desktop", "src-tauri", "gen", "android", "app");
const principal = join(app, "src", "main");
const echec = (m) => {
  console.error(`android-presence : ${m}`);
  process.exit(1);
};
const trouver = (dossier) => {
  for (const nom of readdirSync(dossier)) {
    const chemin = join(dossier, nom);
    if (statSync(chemin).isDirectory()) {
      const t = trouver(chemin);
      if (t) return t;
    } else if (nom === "MainActivity.kt") return chemin;
  }
  return null;
};
const activite = trouver(join(principal, "java"));
if (!activite) echec("MainActivity.kt introuvable : lancez d'abord « npm run android:init ».");
const paquet = /^package\s+([\w.]+)/m.exec(readFileSync(activite, "utf8"))?.[1] ?? echec("paquet illisible.");
writeFileSync(join(dirname(activite), "Presence.kt"), readFileSync(join(racine, "android", "Presence.kt"), "utf8").replace("__PACKAGE__", paquet));

const manifeste = join(principal, "AndroidManifest.xml");
let xml = readFileSync(manifeste, "utf8");
const internet = '<uses-permission android:name="android.permission.INTERNET" />';
if (!xml.includes(internet) || !xml.includes("</application>")) echec("manifeste inattendu.");
// Localisation : départ des trajets depuis la position GPS (Paramètres → Trajets).
for (const p of ["ACTIVITY_RECOGNITION", "RECEIVE_BOOT_COMPLETED", "ACCESS_COARSE_LOCATION", "ACCESS_FINE_LOCATION"]) {
  if (!xml.includes(`android.permission.${p}"`)) xml = xml.replace(internet, `${internet}\n    <uses-permission android:name="android.permission.${p}" />`);
}
// Statistiques d'utilisation (Bien-être numérique) : permission « protégée », accordée par Bryan dans les réglages.
if (!xml.includes("android.permission.PACKAGE_USAGE_STATS")) {
  if (!xml.includes("xmlns:tools=")) xml = xml.replace("<manifest ", '<manifest xmlns:tools="http://schemas.android.com/tools" ');
  xml = xml.replace(internet, `${internet}\n    <uses-permission android:name="android.permission.PACKAGE_USAGE_STATS" tools:ignore="ProtectedPermissions" />`);
}
if (!xml.includes(".PresenceReglage")) {
  xml = xml.replace(
    "</application>",
    `    <receiver android:name="${paquet}.PresenceRecepteur" android:exported="false" />\n` +
      `    <receiver android:name="${paquet}.PresenceDemarrage" android:exported="true">\n` +
      `      <intent-filter><action android:name="android.intent.action.BOOT_COMPLETED" /><action android:name="android.intent.action.MY_PACKAGE_REPLACED" /></intent-filter>\n` +
      `    </receiver>\n` +
      `    <activity android:name="${paquet}.PresenceReglage" android:exported="true" android:theme="@android:style/Theme.Translucent.NoTitleBar">\n` +
      `      <intent-filter><action android:name="android.intent.action.VIEW" /><category android:name="android.intent.category.DEFAULT" /><category android:name="android.intent.category.BROWSABLE" /><data android:scheme="quotidien-presence" /></intent-filter>\n` +
      `    </activity>\n` +
      `  </application>`,
  );
}
writeFileSync(manifeste, xml);

const gradle = join(app, "build.gradle.kts");
let g = readFileSync(gradle, "utf8");
const dependance = 'implementation("com.google.android.gms:play-services-location:21.3.0")';
if (!g.includes(dependance)) {
  if (!/^dependencies \{/m.test(g)) echec("bloc dependencies introuvable dans build.gradle.kts.");
  g = g.replace(/^dependencies \{/m, `dependencies {\n    ${dependance}`);
  writeFileSync(gradle, g);
}
console.log(`Présence pour Max ajoutée (paquet ${paquet}).`);
