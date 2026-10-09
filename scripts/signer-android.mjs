// Signe l'APK de Quotidien avec la clé fixe du projet : sans elle, Android refuse d'installer une version par-dessus l'autre.
// Lancé après `android init` : ajoute au projet Gradle généré une signature « release » lue dans l'environnement
// (ANDROID_KEYSTORE = fichier .jks, ANDROID_KEYSTORE_PASSWORD ; alias « quotidien »).
import { readFileSync, writeFileSync } from "node:fs";

const fichier = "etable/apps/desktop/src-tauri/gen/android/app/build.gradle.kts";
let t = readFileSync(fichier, "utf8");
if (t.includes("quotidien-signature")) process.exit(0);

const signature = `    signingConfigs {
        create("quotidien-signature") {
            storeFile = file(System.getenv("ANDROID_KEYSTORE") ?: error("ANDROID_KEYSTORE manquant"))
            storePassword = System.getenv("ANDROID_KEYSTORE_PASSWORD")
            keyAlias = "quotidien"
            keyPassword = System.getenv("ANDROID_KEYSTORE_PASSWORD")
        }
    }
`;
if (!t.includes("    buildTypes {")) throw new Error("build.gradle.kts : bloc buildTypes introuvable");
t = t.replace("    buildTypes {", `${signature}    buildTypes {`);
if (!t.includes('getByName("release") {')) throw new Error("build.gradle.kts : type release introuvable");
t = t.replace('getByName("release") {', 'getByName("release") {\n            signingConfig = signingConfigs.getByName("quotidien-signature")');
writeFileSync(fichier, t);
console.log("APK signé avec la clé de Quotidien.");