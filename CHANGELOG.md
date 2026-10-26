# Quotidien : journal des changements

Format : [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/), versions [SemVer](https://semver.org/lang/fr/).
Chaque version a sa section ici avant d'être publiée : ce texte devient la Release GitHub et le message de mise à jour affiché dans l'application.
Les changements propres à un plugin sont dans `plugins/<id>/CHANGELOG.md`.

## [Non publié]

## [0.2.0] — 2026-10-26

### Ajouté

- **Bouton « + » sur les blocs** : chaque bloc de Mes finances s'ouvre en grand pour tout voir et tout régler.
- **Mes comptes** : types de compte (courant, secondaire, pro, Livret A, LEP, PEA, épargne, espèces), réglage du nom, du type et du solde de départ, archivage, et une petite courbe de 90 jours par compte.
- **Tout se corrige après coup** : l'historique des ajouts, retraits et dépenses (12 mois) se modifie et se supprime ; un recalage se supprime ; les soldes se recalculent.
- **Paiements prévus** : abonnements et paiements en plusieurs fois (par exemple PayPal 4X, numérotés 1/4, 2/4…), modifiables ; une échéance seule se décale ou change de montant.
- **Trajets automatiques** : tes lieux (chez maman, chez mamie, le travail), « où je dors » par période, et le trajet de chaque événement avec un lieu calculé tout seul avec les bouchons (TomTom) ; les rappels « Pars maintenant » suivent. Dans le Calendrier, bouton « + » du bloc Trajet.
- **Repas** : nouvelle page avec la semaine qui défile (aujourd'hui au milieu), petit-déjeuner, midi et soir, l'heure où commencer à cuisiner (ajoutée à l'Agenda), les alertes (rien de prévu, pas de liste de courses) et les repas favoris. En pause par défaut tant que tu ne gères pas tes repas.
- **Recettes** : page à part, avec photo, description et note en étoiles.
- **Colonne** : crée tes propres groupes avec un titre, renomme-les, supprime-les, et glisse les pages dedans.

### Modifié

- **Travail** : une mission reste entièrement modifiable, y compris les jours sans travail et les heures supplémentaires notées.
- **Courses en pause** (Paramètres → Courses) : les courses ne comptent plus nulle part tant que tu ne les fais pas toi-même.
- **Santé** : le suivi des calories peut se mettre en pause (Paramètres → Santé).
- Toutes les listes de choix ont le style de Quotidien (plus de liste Android d'origine).

## [0.1.54] — 2026-10-24

### Modifié

- **Présence pour Max (Android)** : Quotidien lit maintenant ce qu'Android enregistre déjà (comme Bien-être numérique) : allumages et extinctions de l'écran à l'heure près, déverrouillages, applis utilisées. Max peut ainsi faire le bilan de ta journée sur le téléphone. La position n'est plus envoyée. À activer une fois : Réglages → Accès aux données d'utilisation → Quotidien.

## [0.1.53] — 2026-10-24

### Ajouté

- **Présence pour Max (Android)** : si tu l'actives avec le lien que Max t'envoie, Quotidien lui dit si ton écran est allumé, si tu es en voiture, à pied ou immobile, et ta position approximative. Max évite alors de t'écrire quand tu conduis ou quand ton téléphone dort. Rien n'est envoyé sans activation, et seul le dernier état est gardé.

### Modifié

- **Notes 0.1.1** : le champ de saisie ne coupe plus le texte, et le choix du rappel prend le style de Quotidien au lieu de la liste Android.

## [0.1.49] — 2026-10-24

### Ajouté

- **Notes** (nouveau plugin) : pense-bête rapide, partagé avec le cerveau ; Max peut ajouter des notes et les rappeler au bon moment (quand ton agenda est libre), ou à une heure précise.

### Ajouté

- **Serveur : mise à jour automatique des plugins** : au démarrage, les plugins installés sont mis à jour depuis les paquets signés livrés avec le serveur (`ETABLI_PAQUETS`).

## [0.1.48] — 2026-10-16

### Modifié

- **Santé 0.3.3** : quatre blocs (IMC et courbe du poids en haut, pesée et besoin du jour en dessous).
- **Mes finances 0.1.2** : création d'un compte bancaire depuis « Mes comptes ».

## [0.1.47] — 2026-10-16

### Modifié

- **Courses 0.4.2** : réglage « Compter les courses dans mes finances » pour les garder hors de l'estimation.
- **Santé 0.3.2** : page en grille sans trou, paliers du cadran lisibles.

## [0.1.46] — 2026-10-16

### Modifié

- **Paramètres d'une page** : une roue carrée, toujours au même endroit (à gauche de la barre de titre ; à droite sur téléphone). Les boutons « Paramètres » des pages disparaissent.
- **Accueil** : seulement les widgets, sans barre de recherche (l'aperçu rapide reste au clavier).
- **Paramètres** : « Gérer les plugins » passe dans la catégorie Application.
- **Calendrier** : un grand bouton « Ajouter un événement » ; plus d'export .ics.
- **Mes finances** : plus de bandeau jaune, boutons + et − plus petits.
- **Santé** : IMC plus lisible (chiffre coloré, paliers, conseils), blocs resserrés.
- **Travail** : calendrier de réserve au style de l'Agenda (réserve, hors base, enlever).
- Corrige le message « Finances est en version 0.1.0 ; Budget demande ^1 ».

## [0.1.45] — 2026-10-16

### Modifié

- **Repas 0.3.0** (ex-« Recettes ») : la page s'ouvre sur les recettes, avec un gros bouton Concocter, la recherche, les favoris, une assiette de ce que vous mangez (protéines, glucides, lipides) et « Ajouter cette recette aux courses », où l'IA fusionne la recette avec la liste ouverte. Les ustensiles passent dans Paramètres.
- **Santé 0.3.0** : pesée en un geste (le poids, puis Ajouter), IMC en cadran avec aiguille, profil et goûts dans Paramètres.
- **Travail 0.4.0** : mission de réserviste saisie sur un calendrier (jours cochés, sans trou), paie de réserve corrigée (60 € imposables par jour, +38 € non imposables hors base), la réserve apparaît dans « Prochaine mission » et « Mission en cours ».
- **Agenda 0.2.4** : un jour de réserve entier (minuit à minuit) n'a plus de « Préparation ».
- **Courses 0.4.0** : Repas peut lire la liste ouverte et la mettre à jour.


## [0.1.44] — 2026-10-16

### Modifié

- **Repas et recettes 0.2.0** : Concocter devient un onglet de Recettes, invités réglables repas par repas, nouvelle étape « En cuisine » (temps, niveau, restes, gamelle, préparation le week-end), aperçu de la bibliothèque avec graphiques.
- **Santé 0.2.0** : suivi du poids avec courbe, IMC, besoin calorique calculé, répartition des calories, page en onglets.

## [0.1.43] — 2026-10-16

### Ajouté

- **Repas et recettes** (nouveau) : *Concocter* prépare les repas de la semaine pas à pas (jours, petit-déjeuner, midi, soir, invités, budget, envies) et la liste de courses au magasin le moins cher pour toute la liste ; *Recettes* range votre bibliothèque par rayons, avec recherche, fiches, ustensiles de la maison, et fait la liste de courses de recettes cochées. Une semaine avec beaucoup d'invités est reconnue comme exceptionnelle.
- **Santé** (nouveau) : vos objectifs pour l'alimentation (calories, protéines, régime, allergies, goûts), pris en compte par Repas.
- **IA : votre cerveau** : Paramètres → Intelligence artificielle permet de faire répondre votre cerveau (Qwen, chez vous) au lieu de Gemini. Les photos de tickets restent lues par Gemini.

### Modifié

- **Courses** : Repas y lit le budget et les prix de vos tickets, et y dépose ses listes.

## [0.1.42] — 2026-10-16

### Modifié

- **Travail : la réserve est une seule mission** du premier au dernier jour (arrivée à la base le premier jour, départ le dernier, à la base jour et nuit entre les deux), payée par jour quelle que soit l'heure : solde imposable + indemnité non imposable à la base, solde de la grille du soldat hors base, tous réglables. La base (nom et adresse) se règle dans Paramètres → Travail.
- **Agenda** : les jours de réserve ne comptent plus dans le repos légal.

## [0.1.41] — 2026-10-15

### Modifié

- **Travail** : une période de réserve a son premier et son dernier jour, l'heure d'arrivée à la base et l'heure de départ (emploi du temps seulement, la paie reste au jour). Les périodes de réserve et les contrats se modifient.

## [0.1.40] — 2026-10-15

### Corrigé

- **Travail** : un jour de réserve réglé de minuit à minuit (même heure au début et à la fin) s'affiche en journée entière dans le calendrier, au lieu de provoquer une erreur.

## [0.1.39] — 2026-10-15

### Modifié

- **Agenda** : les événements posés par l'assistant s'ouvrent et se modifient comme les tiens.

## [0.1.38] — 2026-10-15

### Ajouté

- **Supprimer un événement de l'agenda, quel qu'il soit** : un bouton ✕ sur chaque événement de la journée, même ceux posés par Travail ou par l'assistant.

## [0.1.37] — 2026-10-15

### Ajouté

- **Clés d'accès** (Paramètres → Serveur) : tu peux coller la clé d'un programme de confiance (ton assistant personnel) pour qu'il lise et modifie tes données sans ton mot de passe. Une clé n'a jamais les droits d'administration, ne peut ni gérer les clés ni changer le mot de passe, montre son dernier usage et se retire d'un clic.

### Modifié

- **Serveur** : une écriture de données peut refuser d'écraser une copie plus récente (l'assistant s'en sert pour ne jamais effacer ce que tu as saisi). Les applications installées ne changent pas sur ce point.

## [0.1.36] — 2026-10-13

### Corrigé

- **Plus de modifications perdues entre le PC et le téléphone** : avant d'enregistrer, l'application regarde si les données ont changé ailleurs (autre appareil, widget) et fusionne les deux. Seule une modification de la même chose des deux côtés se contredit, et c'est alors la dernière qui gagne.

### Modifié

- **Serveur** : son paquet ne contient plus la version web (stockage et synchronisation seulement).

## [0.1.35] — 2026-10-13

### Ajouté

- **Widget Android « Liste de courses » à cocher** : les articles des listes en cours s'affichent sur l'écran d'accueil ; un toucher coche ou décoche l'article directement sur le serveur, même appli fermée. Les articles déjà pris passent en bas, barrés. La liste se remet à jour toute seule toutes les 30 minutes (et à chaque ouverture de l'appli).

## [0.1.34] — 2026-10-13

### Corrigé

- **Widgets Mes finances sur « Finances indisponible »** : les widgets du téléphone se calculent un par un et réessaient si Finances tarde à répondre.
- **Courbes sur téléphone** : plus grandes, avec un texte de taille normale.
- **Paramètres → Trajets** : champs au style de l'application, et Trajets rangé avec les plugins.

## [0.1.33] — 2026-10-13

### Corrigé

- **Widgets Android bloqués sur « Ouvrez l'application »** : un texte trop long est maintenant raccourci au lieu de bloquer le widget, et chaque widget affiche un message clair quand une donnée manque (pas de budget, Finances indisponible, données illisibles).
- **Widget « Un compte » sur le téléphone** : affiche le premier compte quand aucun n'a été choisi.

## [0.1.32] — 2026-10-13

### Ajouté

- **Trajets sans péage** : case *Éviter les péages* dans *Paramètres → Trajets*.

### Modifié

- **Accueil du téléphone** : seulement le nom de chaque page, et un petit bouton crayon pour modifier l'ordre.

### Corrigé

- **Clé TomTom refusée au collage** : les espaces, retours à la ligne, caractères invisibles et guillemets copiés avec la clé sont retirés.

## [0.1.31] — 2026-10-13

### Ajouté

- **Widgets sur l'écran d'accueil du téléphone** : appui long sur l'écran d'accueil → *Widgets* → *Quotidien*, puis choisis lequel afficher (Aujourd'hui, Coucher conseillé, Budget des courses, Liste de courses, Estimé, Argent actuel, Jusqu'à quand je tiens, Un compte, Courbe en résumé, Prochains paiements, Mission). Ils suivent le thème clair ou sombre du téléphone, se mettent à jour quand l'application est ouverte ou se synchronise, et un toucher ouvre la bonne page.

## [0.1.30] — 2026-10-13

### Ajouté

- **À confirmer (Mes finances)** : quand la date d'un paiement prévu (paie, courses, prévision) est passée, il apparaît en haut de Mes finances. *Confirmer* l'ajoute dans Finances (montant corrigeable), *Pas passé* l'écarte. Rien n'entre sans toi.
- **Fin de mission** : quand le dernier revenu prévu arrive bientôt sans suite, Mes finances prévient : « Aucun revenu n'est prévu après le … » et jusqu'à quand tu tiens.
- **Bulletin estimé (Travail)** : dans la fenêtre du bulletin, le détail ligne à ligne (heures, majorations, fin de mission, congés, cotisations, net) à côté de ton net reçu, et *Enregistrer en PDF* pour le comparer au vrai bulletin.
- **Trajets (Agenda)** : pour un événement avec une adresse, *Calculer le trajet* trouve le temps avec la circulation prévue pour arriver à l'heure, et *Ouvrir dans Waze* lance la navigation. Le calcul demande ta clé TomTom gratuite et ton adresse de départ dans *Paramètres → Trajets*.

## [0.1.28] — 2026-10-12

### Modifié

- **Paramètres plus simples** : *Application* (Général, Apparence, Intelligence artificielle, Raccourcis, Serveur, Alarmes, À propos en dernier), puis *Plugins* avec les réglages de chaque plugin.
- **Accueil du téléphone** : le logo s'aligne sur les icônes, la date du jour en gras sur les noms des pages ; « Modifier l'ordre » permet de ranger les pages.
- **Chargement** : une page reste cachée tant qu'elle n'est pas prête, avec une roue de chargement, au lieu d'un fond blanc aux boutons bleus.
- **Pages plus rapides quand le serveur est lent** : elles s'affichent depuis la copie de l'appareil et se mettent à jour quand le serveur répond.

### Corrigé

- **Téléphone : plus de grande marge en haut** de chaque page.
- **Textes manquants** dans les paramètres (démarrage avec Windows, fermeture de la fenêtre) et ailleurs.
- **Raccourci de l'aperçu rapide (Ctrl + Maj + Q)** : il marche maintenant sur un clavier AZERTY.
- **Session du serveur expirée** : l'application affiche l'écran de connexion au lieu de se déconnecter sans rien dire.
- **Un bouton seul dans un bloc est centré** sur téléphone.

## [0.1.27] — 2026-10-12

### Modifié

- **Nouvelle identité, plus douce** : thème clair crème et beige, thème sombre noir chaud, gris et beige, couleurs pastel.
- **Icônes en couleurs**, façon émoji, sans pastille derrière.
- **Logo** : le Q sur fond beige, avec son rond exactement centré (application, téléphone, icône Android).
- **Formes arrondies** : boutons en pilule, champs, cartes et blocs plus ronds.
- **Un seul titre par page**, collé en haut : le contenu commence plus haut sur téléphone.
- **Accueil du téléphone** : le nom Quotidien est exactement centré.
- **Téléphone** : un bouton seul dans un bloc est centré.

### Corrigé

- **Plus de bouton « Fermer » ou « Annuler » en double de la croix** (scan de ticket, proposition de repas).

## [0.1.26] — 2026-10-12

### Corrigé

- **Android : l'application peut de nouveau joindre internet.** Depuis la 0.1.22, l'appli n'avait plus la permission réseau (une erreur de ma part en ajoutant l'appareil photo) : plus de synchronisation avec le serveur, plus de recherche de mise à jour, plus de lecture de ticket par l'IA, et l'avertissement « hors ligne » permanent. Tout est rétabli.

## [0.1.25] — 2026-10-12

### Ajouté

- **La version installée s'affiche en bas de l'accueil du téléphone** (« Quotidien 0.1.25 »), pour savoir tout de suite si une mise à jour a bien été installée.

## [0.1.24] — 2026-10-12

### Corrigé

- **Android : « impossible de joindre GitHub »** : la recherche de nouvelle version utilise une requête plus simple, que GitHub accepte depuis l'application. Si GitHub limite les recherches, le message le dit.

## [0.1.23] — 2026-10-12

### Corrigé

- **Android : « Scanner avec l'appareil photo » ouvre vraiment l'appareil photo** (Android 11 et plus cachaient l'appli photo à Quotidien, qui retombait sur la galerie).

## [0.1.22] — 2026-10-11

### Corrigé

- **Téléphone : on peut défiler dans les fenêtres plein écran** (la vérification d'un ticket scanné ne pouvait pas être descendue jusqu'au bouton), et la marge en haut ne double plus.
- **Android : le bouton « Prendre une photo » ouvre l'appareil photo** (l'application déclare maintenant la permission de la caméra ; Android la demande la première fois).

## [0.1.21] — 2026-10-11

### Ajouté

- **Supprimer une liste de courses** : bouton « Supprimer la liste » en bas d'une liste en cours (un second appui confirme). Une liste déjà réglée ne se supprime pas.

### Corrigé

- **Lecture des tickets** : quand l'IA donne le prix à l'unité au lieu du prix de la ligne, les lignes sont remises au bon total automatiquement. Dans la vérification, le nom et le prix de chaque ligne se corrigent à la main, et le message d'écart explique quoi faire.

## [0.1.20] — 2026-10-11

### Ajouté

- **Actualisation en direct entre le PC et le téléphone** : quand vous enregistrez quelque chose sur un appareil (une liste créée, un ticket…), le serveur prévient les autres appareils connectés et la page ouverte se met à jour toute seule, sans la quitter.
- **Mise à jour d'Android depuis l'application** : le bouton « Télécharger » télécharge l'APK par Android (progression dans la notification) puis ouvre l'installateur ; la première fois, Android demande d'autoriser Quotidien à installer ses mises à jour, puis il faut confirmer l'installation.

### Modifié

- **Scanner un ticket, c'est maintenant en réglant une liste de courses** : *Régler la course* propose *Scanner avec l'appareil photo*, *Scanner depuis la galerie* ou *Régler manuellement*. Le ticket lu (magasin, date, total, articles) est à vérifier, puis il règle la liste et entre dans le budget de la semaine.
- **Plus de scan ni de « hors budget » dans Courses.** Les tickets hors budget se scannent à la chaîne dans *Paramètres → Courses → Tickets hors budget*.
- **Courses** : la ligne de saisie d'un ticket (magasin, montant, bouton +) tient sur une seule ligne sur téléphone.

## [0.1.19] — 2026-10-11

### Corrigé

- **Icône Android** : le rond du Q est centré dans l'icône et le Q est plus petit.
- **Accueil du téléphone** : logo et nom sur une seule ligne, cartes plus serrées, toutes les pages visibles sans défiler.

## [0.1.18] — 2026-10-11

### Corrigé

- **Android : le bouton « Télécharger » de la mise à jour fonctionne** (l'application n'avait pas le droit d'ouvrir une adresse web) ; en cas d'échec, l'erreur s'affiche.

## [0.1.17] — 2026-10-10

### Corrigé

- **Icône Android** : elle s'adapte à la forme choisie par le téléphone (ronde, carrée…) au lieu d'un carré dans un rond : le fond couvre toute l'icône et le Q blanc est au centre.
- **Retour** : depuis une section des paramètres ou les réglages d'un plugin, le retour revient où l'on était, plus à l'accueil.
- **Accueil du téléphone plus compact** : toutes les pages tiennent sans défiler.
- **Plus de lueur bleue** au toucher d'un bouton, et les boutons des alarmes ont le style du thème.

## [0.1.16] — 2026-10-10

### Corrigé

- **Android : « impossible de joindre GitHub »** : la recherche de nouvelle version passe maintenant par l'API de GitHub, que l'application peut interroger.

## [0.1.15] — 2026-10-10

### Modifié

- **Accueil du téléphone plus soigné** : le logo et le nom sont centrés, chaque page est une carte avec le nom de son plugin, la date du jour s'affiche.
- **Paramètres sur téléphone** : d'abord la liste des sections, puis la section en plein écran.
- **Icônes** : les dessins sont plus grands dans leur pastille, et les icônes Paramètres et Panneau latéral reprennent le style de Quotidien.
- **Boutons du téléphone** : tous font au moins 44 px, et les fenêtres se ferment avec une croix ronde.
- **Icône Android** : le Q est plus petit, sa barre n'est plus coupée et le fond se voit.

## [0.1.14] — 2026-10-10

### Ajouté

- **Mise à jour de l'application Android** : au démarrage (et dans *Paramètres → À propos*), Quotidien cherche une nouvelle version ; un bandeau propose de la télécharger, puis il suffit d'ouvrir le fichier pour installer par-dessus, sans perdre ses données. L'APK est désormais signé avec une clé fixe : **cette version-ci demande de désinstaller l'ancienne une dernière fois**.

### Corrigé

- Liste de courses : le message « Créez-en une à gauche » ne dépend plus de la disposition (téléphone).

## [0.1.13] — 2026-10-10

### Modifié

- **Une interface pensée pour le téléphone** : l'accueil est une liste des pages, comme une messagerie (le nom de l'application en haut, les pages au centre, les paramètres en bas). Une page s'ouvre en plein écran ; le geste « retour » d'Android ou la flèche revient à la liste. Plus de panneau latéral, plus de recherche en haut, et les fenêtres (scanner, réglages…) occupent tout l'écran.
- **Le titre des pages est centré**, sur PC comme sur téléphone, et les blocs sont mieux centrés sur téléphone.
- **L'icône de l'application Android est le logo Quotidien.**

## [0.1.12] — 2026-10-10

### Ajouté

- **Reliez Quotidien à votre serveur** (PC et téléphone) : *Paramètres → Serveur*, saisissez l'adresse, l'identifiant et le mot de passe. Vos calculs et les données de vos plugins sont alors gardés sur le serveur, avec une copie sur l'appareil qui repart au serveur dès que la connexion revient ; le PC et le téléphone voient les mêmes données. Les plugins, la clé IA et les réglages de l'appareil restent sur l'appareil.
## [0.1.11] — 2026-10-09

### Ajouté

- **Le magasin le moins cher pour votre liste** : écrivez des choses simples (« Lait cru 1L », « salade », « coca », « 2 pâtes ») ; Quotidien retrouve ces articles dans vos tickets scannés (hors budget compris), estime le prix de chaque ligne et conseille le magasin le moins cher pour toute la liste, avec le total estimé et celui des autres magasins. Le prix de chaque article s'affiche à côté (« ≈ 1,10 € »), la liste des listes montre le total estimé et le magasin, et « Régler la course » propose d'abord le magasin conseillé. Tout est calculé sur votre PC, sans IA ni internet ; un article jamais vu sur un ticket n'est pas chiffré.
## [0.1.10] — 2026-10-09

### Corrigé

- **Le titre en haut de l'application était cassé** : l'icône de la page se plaçait au-dessus du titre et était coupée. Le titre et son icône sont de nouveau sur la même ligne, dans la barre.
## [0.1.9] — 2026-10-09

### Ajouté

- **Proposer des repas avec l'IA** (Courses ou Liste de courses → « Proposer des repas (IA) ») : on indique le nombre de personnes, de repas, le budget (proposé : ce qu'il reste cette semaine) et ses envies. L'IA part d'abord de vos données (les articles et prix déjà vus sur vos tickets, hors budget compris), puis, si la case est cochée, cherche sur internet les recettes et les prix qui manquent. Elle propose des plats avec leurs ingrédients ; le total se compare au budget en direct, on retire les plats qu'on ne veut pas, « Autre proposition » en donne d'autres, « Moins cher » refait une proposition quand le budget est dépassé. « Créer la liste de courses » fusionne les ingrédients (un même ingrédient n'apparaît qu'une fois, ses quantités s'additionnent) dans une nouvelle liste.
## [0.1.8] — 2026-10-09

### Ajouté

- **Tickets hors budget** (Courses → Tickets → « Hors budget ») : on scanne un ticket uniquement pour garder ses articles et leurs prix, sans que la dépense compte dans les courses de la semaine, les moyennes ni le budget transmis à Budget. La case « Hors budget » se coche aussi au moment de vérifier un ticket scanné normalement. Ces tickets portent une pastille « hors budget » et un compteur indique combien d'articles ont été gardés pour les prix.
## [0.1.7] — 2026-10-09

### Corrigé

- **La clé Gemini n'était pas acceptée** : les clés récentes de Google contiennent un point (`AQ.…`) et étaient refusées avant même d'être essayées. Toute clé collée est maintenant acceptée (les guillemets collés avec elle sont retirés) ; c'est Google qui dit, avec « Essayer », si elle fonctionne.
## [0.1.6] — 2026-10-09

### Ajouté

- **Scanner un ticket de caisse** (Courses → Tickets → « Scanner un ticket ») : on prend le ticket en photo (ou on choisit un fichier), l'IA lit le magasin, la date, le total et les articles, puis vous vérifiez et corrigez avant d'enregistrer. Le ticket entre dans le budget de la semaine ; un avertissement signale quand le total ne correspond pas à la somme des lignes. Le bouton « Détail » d'un ticket montre ses articles. La photo n'est pas conservée.
- **Intelligence artificielle** (Paramètres → Intelligence artificielle) : on colle sa clé Gemini (gratuite, créée sur aistudio.google.com), on choisit le modèle et on « Essaie » ; la clé reste sur ce poste. La page explique ce qui part chez Google.
- **L'aperçu rapide montre vos widgets** au lieu des favoris : un clic sur un widget ouvre sa page dans Quotidien.
## [0.1.5] — 2026-10-09

### Ajouté

- **Une icône pour l'Accueil**, dans le même style que celles des autres pages, avec une pastille violette.
- **L'accueil n'a plus de limite** : on peut ajouter autant de widgets qu'on veut (Accueil → Modifier → Ajouter un widget, ou la case « Ajouter un widget » au bout de la grille), et poser plusieurs fois le même ; le widget « Un compte » garde son propre compte pour chaque exemplaire.
- **Chaque widget montre l'icône de son plugin** dans un coin.

### Modifié

- **Le logo et l'icône d'application** : un Q blanc seul sur le fond violet, dont la barre découpe l'anneau (plus de soleil orange).
- **Déplacer un widget est plus naturel** : il suit la souris, les autres se serrent pour lui faire de la place, et l'accueil défile quand on approche du haut ou du bas ; les poignées des bords sont plus grandes.
- **Les widgets ont été vérifiés dans chacune de leurs tailles** : la courbe de l'argent épouse maintenant exactement sa case (elle débordait dans les petites tailles) et les petits widgets resserrent leur texte.
## [0.1.4] — 2026-10-09

### Ajouté

- **Des widgets pour presque toutes les pages** (Accueil → Modifier → Ajouter un widget) : l'argent actuel, jusqu'à quand je tiens, l'argent d'un compte au choix, la courbe de l'argent, les prochains paiements, le budget des courses, la liste de courses (un clic l'ouvre en grand), la journée du jour, le coucher conseillé et la mission en cours.
- **L'accueil se modifie comme l'écran d'un téléphone** : on clique sur un widget pour le sélectionner, on le déplace à la souris, on tire ses bords ou son coin pour le redimensionner, on le retire avec sa croix.
- **Un logo Quotidien dans l'application** : le même Q que l'icône, dans la colonne de gauche ; les icônes des pages et leurs couleurs reprennent la palette du logo (corail, violet, or).

### Modifié

- **Plus d'onglets** : une seule page à la fois ; la barre du haut montre le titre de la page, la recherche et les boutons de la fenêtre.
- **Une icône d'application retravaillée** : la barre du Q est blanche, aux bouts arrondis, comme l'anneau.
- **Des boutons cohérents** : les +, −, ✓, ×, flèches et triangles sont tous dessinés avec le même trait.
- **Calendrier** : le bloc « Repos légal » est retiré.
- **Mes finances** : « Jusqu'à quand je tiens » montre la date de fin en grand, en toutes lettres (« jusqu'au vendredi 17 octobre ») ; les boutons + et − de « Ajout » sont plus petits.
- **Liste de courses** : à gauche on crée une liste ; à droite « Mes listes » ne contient que la liste des listes en cours, qu'on ouvre en grand pour la consulter, la modifier et la régler ; les listes réglées restent en bas.
## [0.1.3] — 2026-10-09

### Ajouté

- **Une nouvelle icône d'application et des icônes de pages dans le même style** : un Q flat avec un soleil levant (l'icône de l'application et le logo de la colonne), et des icônes en aplats pour Calendrier, Courses, Liste de courses, Mes finances et Travail.

### Modifié

- **Calendrier** : le mois n'a plus de vide à droite et à gauche (le bloc épouse le quadrillage, les marges sont les mêmes tout autour) ; la journée est faite de cartes pleine largeur teintées de la couleur du contrat, au lieu d'une fine barre ; « Objectif » et « Moyenne » sont plus gros et en blanc ; le coucher conseillé ce soir est mis en évidence dans un encadré.
- **Mes finances** : « Ajout », « Recalage » et « Mes comptes » forment une même rangée de trois blocs de même forme (titre, une ligne d'explication, contenu) ; les boutons + et − sont plus petits.
- **Liste de courses** : « Listes en cours » et « Nouvelle liste » sont côte à côte sur grand écran.
## [0.1.2] — 2026-10-09

### Ajouté

- **Un thème et une icône propres à Quotidien** : le thème « Jour » (sable et corail) et le thème « Nuit » (violet et orange), choisis par « Comme Windows » ou à la main dans Paramètres → Apparence, un logo dans la colonne et une nouvelle icône d'application (un soleil qui se lève). Les thèmes sont fixes : on ne peut pas en importer.

### Modifié

- **La page Plugins n'est plus dans le menu** : les plugins de Quotidien sont fixes ; ils restent visibles dans Paramètres → Plugins installés.
- **Les réglages de l'aperçu rapide sont dans « Raccourcis clavier ».**
- **Calendrier** : le quadrillage des ronds a le même écart entre les colonnes et entre les lignes ; la grille de sommeil remplit toute la largeur (plus de carrés quand le menu est replié) ; « Objectif » et « Moyenne » sont alignés l'un sous l'autre ; le bloc Sommeil est plus large et le bloc Trajet plus étroit ; la barre de la journée est plus large.
- **Mes finances** : les prochains paiements sont à droite de la courbe ; le bloc « Ajouter » (prix, libellé, et deux gros boutons + vert et − rouge) remplace « Ajustement rapide » ; « Recaler » se réduit à un prix et un bouton coloré.

## [0.1.1] — 2026-10-08

### Modifié

- **Le menu ne garde que les cinq pages prévues** : Calendrier, Courses, Liste de courses, Mes finances et Travail. Les anciennes pages Tableau de bord, Courbe du mois, Prévisions et Rappels sont retirées du menu ; les plugins Finances, Budget et Agenda continuent de travailler en coulisses.

## [0.1.0] — 2026-10-08

Première version publiée : l'application se met à jour toute seule à partir de celle-ci.

### Ajouté

- **Mes finances** : l'estimé de la vie courante, « jusqu'à quand je tiens », la courbe des prochains jours, les prochains paiements, l'ajustement rapide, le recalage sur le solde réel, et un widget d'accueil.
- **Travail** : contrats, bulletins, historique et agences ; les missions sont transmises au Calendrier et à Budget.
- **Courses** : budget par semaine, tickets, listes de courses à régler.
- **Calendrier** : mois, journée, sommeil, trajets et repos légal.
- **Accueil à widgets** : le tableau de l'accueil se modifie (ajout, déplacement, taille, retrait).
- **Catégories** : Paramètres → Apparence, « Ranger les pages par catégories » (Argent, Temps).
- **Mises à jour automatiques** : Quotidien cherche une nouvelle version au démarrage et propose de l'installer ; rien ne s'installe sans votre clic.

[Non publié]: https://github.com/Bryan-Cordonnier/quotidien/compare/v0.1.11...HEAD
[0.1.11]: https://github.com/Bryan-Cordonnier/quotidien/compare/v0.1.10...v0.1.11
[0.1.10]: https://github.com/Bryan-Cordonnier/quotidien/compare/v0.1.9...v0.1.10
[0.1.9]: https://github.com/Bryan-Cordonnier/quotidien/compare/v0.1.8...v0.1.9
[0.1.8]: https://github.com/Bryan-Cordonnier/quotidien/compare/v0.1.7...v0.1.8
[0.1.7]: https://github.com/Bryan-Cordonnier/quotidien/compare/v0.1.6...v0.1.7
[0.1.6]: https://github.com/Bryan-Cordonnier/quotidien/compare/v0.1.5...v0.1.6
[0.1.5]: https://github.com/Bryan-Cordonnier/quotidien/compare/v0.1.4...v0.1.5
[0.1.4]: https://github.com/Bryan-Cordonnier/quotidien/compare/v0.1.3...v0.1.4
[0.1.3]: https://github.com/Bryan-Cordonnier/quotidien/compare/v0.1.2...v0.1.3
[0.1.2]: https://github.com/Bryan-Cordonnier/quotidien/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/Bryan-Cordonnier/quotidien/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/Bryan-Cordonnier/quotidien/releases/tag/v0.1.0
