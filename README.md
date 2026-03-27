# BarPass V0

Prototype web statique de BarPass pour tester un flux de commande simple avec un seul point de retrait.

Le but de cette version n’est pas de simuler tout le produit final. Elle sert à valider le cœur du parcours :
- un client consulte une carte courte
- il ajoute des boissons au panier
- il paie de façon simulée
- sa commande entre dans une file claire
- le bar la fait avancer jusqu’au retrait

## Ce que contient le repo

- `index.html` → interface principale
- `app.css` → styles de la démo
- `app.js` → logique client, bar, pilotage et persistance locale
- `tests/app.test.js` → tests jsdom du flux principal
- `.github/workflows/deploy-pages.yml` → publication automatique GitHub Pages

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

## Choix produit figés dans cette V0

- un seul point de retrait
- pas d’authentification
- pas de vrai PSP
- pas de backend
- pas de multi-bar
- pas de multi-établissements

## Stack

- HTML
- CSS
- JavaScript vanilla
- `localStorage` pour la persistance locale
- `BroadcastChannel` + événement `storage` pour la synchro inter-onglets
- `node:test` + `jsdom` pour les tests

## Lancer en local

### Prérequis
- Node.js 20+ recommandé
- Python 3

### Installation

```bash
npm install
```

### Lancer l’app

```bash
python3 -m http.server 4173
```

Ouvrir ensuite :
- `http://127.0.0.1:4173`

Conseil pour la démo :
- un onglet = rôle client
- un second onglet = rôle bar

## Lancer les tests

```bash
npm test
```

Les tests couvrent actuellement :
- création d’une commande depuis le client
- progression du statut côté bar jusqu’à `completed`
- réglages de pilotage et non-mutation des commandes déjà passées

## Démo publiée

Le repo est préparé pour être publié automatiquement avec GitHub Pages via GitHub Actions.

URL attendue après activation du workflow :
- `https://kkanoee.github.io/barpass-v0/`

Si la page n’est pas encore disponible, il faut laisser GitHub finir le premier run du workflow `Deploy static site to GitHub Pages`.

## Ce que vos collègues peuvent tester

### Parcours client
- ajouter des produits
- payer une commande simulée
- vérifier le suivi de statut

### Parcours bar
- prendre une commande en file
- la passer en préparation
- la marquer prête
- la marquer retirée

### Pilotage
- fermer le service
- changer le point de retrait pour les futures commandes
- simuler une rupture produit
- reset la démo

## Limites connues

- les données sont locales au navigateur
- le paiement est simulé
- aucun stockage serveur
- aucune gestion de session utilisateur
- aucun temps réel réseau entre machines différentes

## Prochaines étapes logiques

- brancher un backend léger temps réel
- introduire un vrai flux de paiement
- faire converger le prototype avec le Figma
- préparer une architecture utilisable par plusieurs collègues en même temps
