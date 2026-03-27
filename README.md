# BarPass V0

Prototype web statique pour le V0 BarPass, centré sur un point de retrait unique.

## Objectif
Démontrer un flux complet et exploitable :
- parcours client simple
- commande et paiement simulé
- file côté bar
- statuts de préparation
- retrait unique
- persistance locale pour la démo

## Stack
- HTML
- CSS
- JavaScript vanilla
- stockage local via `localStorage`
- synchro inter-onglets via `BroadcastChannel` + événement `storage`

## Démarrer
Depuis ce dossier :

```bash
python3 -m http.server 4173
```

Puis ouvrir :
- Client / app principale : `http://localhost:4173`
- Ouvrir un second onglet sur la même URL pour jouer le rôle du bar

## Vues
- onglet `Client` : parcours de commande
- onglet `Bar` : file de production et changement de statuts
- onglet `Pilotage` : configuration simple du lieu, du point de retrait et reset démo

## Ce que couvre le V0
- point de retrait unique
- menu court
- options simples
- statut commande : `queued`, `preparing`, `ready`, `completed`
- écran bar minimal et exploitable
- estimation d'attente simple

## Ce que ça ne couvre pas encore
- vrai paiement PSP
- authentification
- multi-établissements
- multi-points de retrait
- analytics avancées
- remboursement automatisé
- back-end serveur
