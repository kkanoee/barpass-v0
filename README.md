# BarPass V0 / Alpha partagée

Prototype web de BarPass pour tester un flux de commande simple avec un seul point de retrait.

Le repo couvre maintenant deux usages :
- une démo statique locale / GitHub Pages pour montrer le flux
- une alpha partagée avec backend léger et synchro temps réel pour faire tester plusieurs postes en même temps

## Liens utiles

- Repo : `https://github.com/kkanoee/barpass-v0`
- Démo statique publiée : `https://kkanoee.github.io/barpass-v0/`
- Alpha partagée locale : `npm run dev` puis `http://127.0.0.1:4173`

## Ce que contient le repo

- `index.html` → interface principale
- `app.css` → styles de la démo
- `app.js` → logique front avec fallback local + mode partagé via API/WebSocket
- `server.js` → backend léger Express + WebSocket pour l’alpha partagée
- `shared/state.js` → logique métier et état partagé
- `tests/app.test.js` → tests du mode local
- `tests/server.test.js` → tests du backend partagé
- `.github/workflows/deploy-pages.yml` → publication automatique GitHub Pages
- `docs/next-steps-plan.md` → plan de progression du projet

## Vues disponibles

### Client
- menu court
- options simples
- panier
- paiement simulé
- suivi de commande

### Bar
- file `À préparer`
- file `En préparation`
- file `Prêtes`
- historique des commandes retirées

### Pilotage
- nom du lieu
- nom du point de retrait
- ouverture / fermeture du service
- rupture / réactivation des produits
- reset complet de la démo

## Choix produit figés à ce stade

- un seul point de retrait
- pas d’authentification obligatoire, mode invité prioritaire
- pas de vrai PSP
- pas de multi-bar
- pas de multi-établissements
- backend volontairement léger pour l’alpha
- tunnel client mobile-first pensé pour une commande rapide en boîte

## Variante de cadrage issue du PDF de travail

Le repo embarque désormais une traduction resserrée du flow PDF sous le nom `v0PDF`.

Référence :
- `docs/spec-v0pdf-mobile.md`

Cette variante sert à tester un parcours mobile réaliste sans élargir le scope au niveau V1 :
- entrée QR / lien direct / invité
- carte mobile courte
- filtres rapides verres / bouteilles / softs
- bouteille et verre comme branches de commande simples
- panier, paiement, suivi, retrait

## Stack

- HTML
- CSS
- JavaScript vanilla
- Express
- WebSocket (`ws`)
- `localStorage` pour le fallback local
- `node:test` + `jsdom`

## Mode 1 — Démo locale simple

### Installation

```bash
npm install
```

### Lancer la version partagée locale

```bash
npm run dev
```

Puis ouvrir :
- `http://127.0.0.1:4173`

Conseil pour la démo :
- un onglet = rôle client
- un second onglet = rôle bar
- un troisième onglet éventuel = pilotage

## Mode 2 — Démo statique publiée

La version GitHub Pages reste utile pour montrer le parcours sans backend partagé :
- `https://kkanoee.github.io/barpass-v0/`

Dans ce mode, l’application détecte l’absence de backend et retombe automatiquement en mode local.

## Lancer les tests

```bash
npm test
```

Les tests couvrent actuellement :
- création d’une commande depuis le client en mode local
- progression du statut côté bar
- pilotage et non-mutation des commandes déjà passées
- endpoints du backend partagé
- création de commande et modifications d’état côté serveur

## Ce que l’alpha partagée apporte

Par rapport à la V0 purement locale, cette version ajoute :
- un état serveur partagé
- une file commune entre plusieurs postes
- des changements de statut diffusés en temps réel
- un backend minimal pour commencer les vrais tests multi-appareils

## Ce que vos collègues peuvent tester maintenant

### En solo
- ouvrir la version GitHub Pages
- rejouer le flux client / bar dans le même navigateur

### En petit groupe
- lancer `npm run dev` sur une machine
- ouvrir l’URL depuis plusieurs appareils sur le même réseau si la machine hôte est accessible
- passer des commandes depuis plusieurs clients
- faire avancer la file côté bar
- observer la cohérence temps réel

## Persistance minimale de l’alpha partagée

Le backend partagé peut maintenant conserver l’état entre deux redémarrages si une variable d’environnement est fournie :

```bash
BARPASS_PERSISTENCE_PATH=/chemin/vers/state.json
```

Exemple local :

```bash
BARPASS_PERSISTENCE_PATH=./data/state.json npm run dev
```

Sans cette variable, le comportement reste identique à avant : mémoire volatile uniquement.

Important : cette persistance repose sur un simple fichier local. Elle fonctionne bien en local ou sur un hébergement avec stockage durable monté explicitement, mais elle ne doit pas être confondue avec une vraie persistance de prod ni avec une simple écriture sur un filesystem éphémère de conteneur.

## Limites connues

- persistance locale simple uniquement, pas encore de vraie base multi-instance
- paiement simulé uniquement
- pas d’authentification ni rôles sécurisés
- pas de gestion réseau/infra de prod
- pas encore de PWA installable

## Déploiement public de l’alpha partagée

Le repo est maintenant préparé pour un déploiement backend simple sur une plateforme type Render.

Fichiers ajoutés pour ça :
- `Dockerfile`
- `render.yaml`

### Option recommandée : Render

1. Créer un compte Render
2. Connecter le repo GitHub `kkanoee/barpass-v0`
3. Déployer le service `barpass-shared-alpha`
4. Vérifier que `/health` renvoie `ok: true`
5. Partager ensuite l’URL publique du service

Une fois le backend publié, les collègues pourront utiliser la vraie alpha partagée au lieu de la seule version GitHub Pages.

## Prochaines étapes logiques

- déployer publiquement l’alpha partagée
- ajouter une vraie persistance serveur
- préparer une PWA installable
- faire converger les écrans avec le Figma
- tester le flux avec de vrais utilisateurs métier
- décider ensuite si une app native est vraiment justifiée
